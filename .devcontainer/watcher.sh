#!/usr/bin/env bash
#
# This will watch for file changes in the source directory
# and update/replace the running worker when needed.

set -euo pipefail

# Get the path to watch from the first argument
path_to_watch="$1"
if [[ -z "$path_to_watch" ]]; then
  echo "Usage: $0 <path_to_watch>"
  exit 1
fi

# Running worker PID file
worker_pid_file="/tmp/worker.pid"

start_worker() {
	pid_file="/tmp/worker.pid.new"

	(
		# Change directory to the watch directory
		cd "$path_to_watch"

		# Make sure we have all the dependencies installed
		npm install

		# Start the worker, using nohup to avoid killing it
		# if the watcher script is killed
		nohup bash -c 'npm start &>/tmp/logs/temporal-worker.log & echo $! > "'"$pid_file"'"'
		rm -f nohup.out

		# Wait for the pid file to exist
		local max_retry=10
		while [[ ! -f "$pid_file" ]] || [[ ! -s "$pid_file" ]]; do
			sleep .1
			max_retry=$((max_retry - 1))
			if [[ "$max_retry" -eq 0 ]]; then
				break
			fi
		done

		if [[ -f "$pid_file" ]] && [[ -s "$pid_file" ]]; then
			echo "Started worker with PID $(cat "$pid_file")"
		else
			echo >&2 "Failed to start worker"
		fi
	)

	# Check if worker was already running, in which case
	# we can now kill it
	if [[ -f "$worker_pid_file" ]] && [[ -s "$worker_pid_file" ]]; then
		echo "Stopping worker with PID $(cat "$worker_pid_file")"
		kill "$(cat "$worker_pid_file")" || true
	fi

	# Replace the old PID file with the new one
	mv "$pid_file" "$worker_pid_file"
}

# Start a worker immediately
start_worker

# Watch for changes in the source directory
# Options:
#   --monitor:           Keep listening for events forever
#   --recursive:         Watch directories recursively
#   --event close_write: Watch for file or directory closed,
#                        after being opened in writable mode
#   --event create:      Watch for new files or directories
#   --event delete:      Watch for files or directories deleted
#   --event moved_to:    Watch for files or directories moved into
#   --event moved_from:  Watch for files or directories moved from
#   --excludei:          Exclude files matching the given pattern
inotifywait \
	--monitor \
	--recursive \
	--event close_write \
	--event create \
	--event delete \
	--event moved_to \
	--event moved_from \
	--excludei 'node_modules' \
	"$path_to_watch" | \
while read -r directory events filename; do
	echo "Detected change in $directory/$filename (events: $events)"

	# Check that the changed file has been changed
	# _after_ the last worker restart
	if [[ "$directory/$filename" -ot "$worker_pid_file" ]]; then
		continue
	fi

	# Start a new worker when a change is detected
	start_worker
done
