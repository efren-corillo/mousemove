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

# Run the command and log its output
# Using PYTHONUNBUFFERED and stdbuf together
echo "Starting keep-presence at $(date)" >> "$LOG_FILE"
PYTHONUNBUFFERED=1 stdbuf -oL -eL keep-presence --seconds=3 -r 4 10 >> "$LOG_FILE" 2>&1 &
echo "keep-presence started with PID $!" >> "$LOG_FILE"
