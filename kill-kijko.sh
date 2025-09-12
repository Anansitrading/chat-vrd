#!/bin/bash

# Kijko App Killer Script
# This script stops the Kijko application and frees up all ports

PID_FILE="/tmp/kijko-app.pid"
APP_NAME="kijko"

echo "Stopping Kijko app..."

# Kill process by PID file if it exists
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Killing main process (PID: $PID)..."
        kill -TERM "$PID" 2>/dev/null || kill -KILL "$PID" 2>/dev/null
        sleep 1
    fi
    rm "$PID_FILE"
    echo "PID file removed"
fi

# Kill any remaining vite/node processes related to the app
echo "Killing any remaining Vite/Node processes..."
pkill -f "vite.*kijko" 2>/dev/null || true
pkill -f "node.*vite" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true

# Free up common development ports (5173 is Vite's default)
echo "Freeing up ports..."
for port in 5173 3000 4173 8080; do
    PID_ON_PORT=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$PID_ON_PORT" ]; then
        echo "Killing process on port $port (PID: $PID_ON_PORT)"
        kill -TERM "$PID_ON_PORT" 2>/dev/null || kill -KILL "$PID_ON_PORT" 2>/dev/null
    fi
done

# Wait a moment for cleanup
sleep 1

# Verify ports are free
echo "Checking if ports are free..."
for port in 5173 3000 4173 8080; do
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "Warning: Port $port is still in use"
    else
        echo "Port $port is free"
    fi
done

echo "Kijko app has been stopped and all ports freed!"
