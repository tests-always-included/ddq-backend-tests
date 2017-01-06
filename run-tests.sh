#!/usr/bin/env bash
# Runs DDQ backend functional tests.
#
# $1 - Backend plugin to test.
#
# Examples
#
#   # Runs tests requiring ddq-backend-mysql as the plugin.
#   run-tests.sh mysql
#
# Returns nothing.

if [[ -z "${1:-}" ]]; then
    echo "Error: Requires backend plugin as first agrument"

    exit 1
fi

backend="$1"

# Running all tests rather then exiting if one failed.
node script/wrapped-message-tests.js "$backend" 
node script/send-message-test.js "$backend"
node script/polling-heartbeat-test.js "$backend"
