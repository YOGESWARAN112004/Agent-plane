#!/bin/bash

# This script simplifies running the production stack with Traefik
# It combines the webapp, worker, and traefik configuration files.

docker compose \
  -f webapp/docker-compose.yml \
  -f worker/docker-compose.yml \
  -f docker-compose.traefik.yml \
  --env-file .env \
  "$@"
