#!/usr/bin/env bash

workflows=${1:-10}
delay=${2:-30}

echo @@@@@@@@@@@@ DEMO 0 @@@@@@@@@@@@@
echo @@ Auto-recovery of activities @@
echo @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
echo

echo [1/5] Disabling inventory service
npm run disable-inventory-service

echo [2/5] Running $workflows workflows
npm run workflow -- -n $workflows & job_pid=$!
sleep 5

echo [3/5] Waiting $delay seconds
sleep $delay

echo [4/5] Repairing the inventory service
npm run enable-inventory-service

echo [5/5] Waiting for workflows to finish...
wait $job_pid