#!/usr/bin/env bash
# Runs DDQ backend functional tests.
#
# Examples
#
#   run-tests.sh
#
# Returns nothing.
set -e
thisDir="${0%/*}"
node "${thisDir}/script/send-message-test.js"
node "${thisDir}/script/wrapped-message-tests.js"
node "${thisDir}/script/polling-heartbeat-test.js"
