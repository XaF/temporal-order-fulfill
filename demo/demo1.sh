#!/usr/bin/env bash

workflows=${1:-10}
invalid=${2:-20}
delay=${3:-30}

echo @@@@@@@@@@@@ DEMO 1 @@@@@@@@@@@@@
echo @@   Bug fix over input data   @@
echo @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
echo

echo [1/6] Make sure the item names bug fix is disabled
npm run disable-item-names-bug-fix

echo [2/6] Running $workflows workflows with ${invalid}% of invalid
npm run workflow -- --numOrders $workflows --invalidPercentage ${invalid} & job_pid=$!
sleep 5

echo [3/6] Waiting $delay seconds
sleep $delay

echo [4/6] Enable the item names bug fix
npm run enable-item-names-bug-fix

echo [5/6] Waiting for workflows to finish...
wait $job_pid

echo [6/6] Cleaning up
npm run disable-item-names-bug-fix