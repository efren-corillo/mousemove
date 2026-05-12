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
sleep 1

# Fetch settings from GSettings
SCHEMA="org.gnome.shell.extensions.mousemove"
SCHEMA_DIR="/home/ren/.local/share/gnome-shell/extensions/mousemove@efren-corillo.github.com/schemas"

ENABLED=$(GSETTINGS_SCHEMA_DIR="$SCHEMA_DIR" gsettings get "$SCHEMA" enabled)
IDLE_SECS=$(GSETTINGS_SCHEMA_DIR="$SCHEMA_DIR" gsettings get "$SCHEMA" idle-seconds)

echo "--- Start Attempt: $(date) ---" >> "$LOG_FILE"

if [ "$ENABLED" == "true" ]; then
    # Using 'script' to force a pseudo-terminal (PTY), which forces line-buffering
    # We use -c to run the command and -f to flush output immediately
    # /dev/null is used for the script's own log file as we redirect stdout
    # Added -p 100 to make movement VERY visible
    nohup script -q -c "keep-presence --seconds=$IDLE_SECS -p 100" -f /dev/null >> "$LOG_FILE" 2>&1 &
    
    PID=$!
    echo "keep-presence started via script (PID $PID, Idle ${IDLE_SECS}s)" >> "$LOG_FILE"
else
    echo "Extension is DISABLED in GSettings." >> "$LOG_FILE"
fi
