#!/bin/bash
# Simple wrapper to start Expo web dev server
# Keeps stdin open to prevent Expo from exiting

cd "$(dirname "$0")"

# Clean up any existing process on port 8081
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
sleep 1

# Start Expo with an infinite sleep as stdin to keep it open
# This prevents EOF from being sent
(while true; do sleep 86400; done) | exec npx expo start --web --port 8081
