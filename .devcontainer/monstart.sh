#!/usr/bin/env bash
#
# This will take care of starting the monitor that
# triggers the worker and restart it when code changes

log_file=/tmp/logs/temporal-worker.log
pid_file=/tmp/nodemon.pid

# Start the worker using nodemon
tries=30
while [ $tries -gt 0 ]; do
	echo "🏁 Starting worker monitor"
	nohup bash -c 'npm run start.watch &>"'"$log_file"'" & job_pid=$!; echo $job_pid >"'"$pid_file"'"' &>/dev/null && rm -f nohup.out

	# Wait for the pid file to appear for up to 2 seconds
	echo "🕝 Waiting for PID file"
	wait_pid=20
	while ! [ -f "$pid_file" ]; do
		wait_pid=$((wait_pid-1))
		if [ $wait_pid -eq 0 ]; then
			break
		fi
		sleep .1
	done

	if [ -f "$pid_file" ]; then
		echo "🕣 Monitoring that process is running for the next 5 seconds"

		# Monitor the process is running for 5 seconds
		running=true
		checks=5
		while [ $checks -gt 0 ]; do
			if ! kill -0 $(<"$pid_file"); then
				running=false
				break
			fi
			checks=$((checks-1))
			sleep 1
		done

		if [ $running = true ]; then
			echo "✅ Worker and monitor running, we're done here"
			break
		fi
	fi

	tries=$((tries-1))
	if [ $tries -eq 0 ]; then
		echo "🔴 Unable to start the worker... abandoning."
		exit 1
	else
		echo "😢 Worker not running, trying to start another time"
		sleep .5
	fi
done