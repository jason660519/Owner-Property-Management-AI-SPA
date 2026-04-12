FROM nousresearch/hermes-agent:latest

# Add host-development essentials for terminal commands on mounted repos.
RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*
