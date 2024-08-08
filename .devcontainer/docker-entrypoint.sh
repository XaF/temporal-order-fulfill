#!/usr/bin/env bash

# Make sure logs directory exists
LOGS_DIR=/tmp/logs
mkdir -p ${LOGS_DIR}

# Sart Temporal Server
nohup \
	temporal server start-dev \
		--metrics-port 9090 \
		--ip 0.0.0.0 \
		--port 7233 \
		--http-port 7243 \
		--ui-port 8080 \
	&>"${LOGS_DIR}/temporal-server.log" &

# Call the original entrypoint
exec "$@"
