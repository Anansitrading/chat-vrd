#!/bin/bash

# Kijko App Launcher Script (Absolute Paths Version)
# This version uses absolute paths to avoid PATH issues

APP_DIR="/home/david/Projects/Kijko/MVP/MVP_Kijko"
PID_FILE="/tmp/kijko-app.pid"
NODE_BIN="/home/david/.nvm/versions/node/v24.4.1/bin"
NPM="$NODE_BIN/npm"
NODE="$NODE_BIN/node"

# Change to app directory
cd "$APP_DIR"

echo "=== Kijko Launcher (Absolute Paths) ==="
echo "App Directory: $APP_DIR"
echo "Node Binary: $NODE"
echo "NPM Binary: $NPM"

# Check if binaries exist
if [ ! -f "$NODE" ]; then
    echo "Error: Node.js not found at $NODE"
    echo "Please check your Node.js installation"
    exit 1
fi

if [ ! -f "$NPM" ]; then
    echo "Error: NPM not found at $NPM"
    echo "Please check your NPM installation"
    exit 1
fi

# Check if app is already running
if [ -f "$PID_FILE" ]; then
    if ps -p "$(cat $PID_FILE)" > /dev/null 2>&1; then
        echo "Kijko app is already running (PID: $(cat $PID_FILE))"
        # Open browser to the app
        xdg-open "http://localhost:5173" &
        exit 0
    else
        # Remove stale PID file
        rm "$PID_FILE"
    fi
fi

echo "Starting Kijko app..."

# Source NVM and start the development server
# This ensures the Node.js environment is properly set up
source /home/david/.nvm/nvm.sh
nvm use 24.4.1
npm run dev &
DEV_PID=$!

# Save the main process ID
echo $DEV_PID > "$PID_FILE"

echo "Kijko app started with PID: $DEV_PID"
echo "PID saved to $PID_FILE"

# Wait a moment for server to start
sleep 3

# Open browser to the app
echo "Opening browser..."
xdg-open "http://localhost:5173" &

echo "Kijko app is now running!"
echo "Use the close button in the app or run kill-kijko.sh to stop it."

# Monitor for shutdown signals in background
{
    while true; do
        # Check if PID file still exists and process is running
        if [ ! -f "$PID_FILE" ] || ! ps -p "$(cat $PID_FILE 2>/dev/null)" > /dev/null 2>&1; then
            break
        fi
        
        # Check for shutdown signal file in Downloads (where browser downloads go)
        if [ -f "/home/david/Downloads/kijko-shutdown-signal.txt" ]; then
            echo "Shutdown signal detected, stopping app..."
            rm "/home/david/Downloads/kijko-shutdown-signal.txt" 2>/dev/null
            bash "$APP_DIR/kill-kijko.sh"
            break
        fi
        
        sleep 2
    done
} &
