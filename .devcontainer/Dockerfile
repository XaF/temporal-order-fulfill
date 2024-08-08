# See here for image contents: https://github.com/microsoft/vscode-dev-containers/blob/v0.245.2/containers/typescript-node/.devcontainer/base.Dockerfile
# https://github.com/microsoft/vscode-remote-try-node/blob/main/.devcontainer/devcontainer.json

ARG VARIANT="20-bookworm"
FROM mcr.microsoft.com/devcontainers/typescript-node:1-${VARIANT}

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends curl git inotify-tools

# Install Temporal CLI
ARG TEMPORAL_CLI_VERSION=1.0.0
RUN PLATFORM=linux && \
    ARCHITECTURE=$(uname -m) && \
    case $ARCHITECTURE in \
        x86_64 | amd64) ARCHITECTURE=amd64 ;; \
        aarch64 | arm64) ARCHITECTURE=arm64 ;; \
        *) echo "Unsupported architecture: $ARCHITECTURE" && exit 1 ;; \
    esac && \
    curl -L "https://github.com/temporalio/cli/releases/download/v${TEMPORAL_CLI_VERSION}/temporal_cli_${TEMPORAL_CLI_VERSION}_${PLATFORM}_${ARCHITECTURE}.tar.gz" | tar -xz -C /usr/local/bin && \
    chmod +x /usr/local/bin/temporal

# Create the /temporal directory and make vscode the owner
ARG USER=node
RUN mkdir -p /temporal && \
        chown -R $USER: /temporal

# Prepare docker entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Prepare the watcher
COPY watcher.sh /watcher.sh
RUN chmod +x /watcher.sh

# Set the default user to be the '1000' user, which is
# 'node' in the base image
USER $USER

# Set entrypoint
ENTRYPOINT [ "/docker-entrypoint.sh" ]
CMD [ "sleep", "infinity" ]
