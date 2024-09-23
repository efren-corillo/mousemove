#!/bin/bash

# Define log files
LOG_FILE=~/scripts/mousemove/mousemove.log
ERROR_LOG_FILE=~/scripts/mousemove/mousemove_error.log

# Check if the date has changed to clear the log
DATE_FILE=~/scripts/mousemove/last_run_date.txt
if [ -f "$DATE_FILE" ]; then
    LAST_RUN_DATE=$(cat $DATE_FILE)
    CURRENT_DATE=$(date +%Y-%m-%d)
    if [ "$LAST_RUN_DATE" != "$CURRENT_DATE" ]; then
        > $LOG_FILE
        > $ERROR_LOG_FILE
    fi
fi
echo $(date +%Y-%m-%d) > $DATE_FILE

# Run the command and log its output
keep-presence --seconds=3 -r 4 10 >> $LOG_FILE 2>> $ERROR_LOG_FILE
