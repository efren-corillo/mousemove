#!/bin/bash

# Define log files
LOG_FILE=~/scripts/mousemove/mousemove.log

# Ensure the directory exists
mkdir -p ~/scripts/mousemove

# Check if the date has changed to clear the log
DATE_FILE=~/scripts/mousemove/last_run_date.txt
CURRENT_DATE=$(date +%Y-%m-%d)

if [ -f "$DATE_FILE" ]; then
    LAST_RUN_DATE=$(cat $DATE_FILE)
    if [ "$LAST_RUN_DATE" != "$CURRENT_DATE" ]; then
        > "$LOG_FILE"
    fi
fi
echo "$CURRENT_DATE" > "$DATE_FILE"

# Kill existing instances
pkill -f keep-presence || true

# Fetch settings from GSettings to sync with the extension
SCHEMA="org.gnome.shell.extensions.mousemove"
SCHEMA_DIR="/home/ren/.local/share/gnome-shell/extensions/mousemove@efren-corillo.github.com/schemas"

# Check if enabled in extension
ENABLED=$(GSETTINGS_SCHEMA_DIR="$SCHEMA_DIR" gsettings get "$SCHEMA" enabled)

if [ "$ENABLED" == "true" ]; then
    IDLE_SECS=$(GSETTINGS_SCHEMA_DIR="$SCHEMA_DIR" gsettings get "$SCHEMA" idle-seconds)
    echo "Starting keep-presence (${IDLE_SECS}s) at $(date)" >> "$LOG_FILE"
    PYTHONUNBUFFERED=1 stdbuf -oL -eL keep-presence --seconds="$IDLE_SECS" >> "$LOG_FILE" 2>&1 &
    echo "keep-presence started with PID $!" >> "$LOG_FILE"
else
    echo "Extension is disabled in GSettings. Script will not start." >> "$LOG_FILE"
fi
