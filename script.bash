#!/bin/bash

while true; do
  # Run npm start command in the background
  npm run start &

  # Store the process ID of npm run start
  pid=$!

  # Wait for 5 seconds
  sleep 2h

  # Kill the npm run start process using the stored PID
  kill $pid
done
