#!/bin/bash
echo "Starting HatStart in development mode..."
npm run electron:dev &
PID=$!
echo "Started with PID: $PID"
echo "Waiting for servers to start..."
sleep 10
echo "HatStart should now be running!"
echo "Vite dev server: http://localhost:5173"
echo "To stop: kill $PID"