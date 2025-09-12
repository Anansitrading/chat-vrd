#!/bin/bash

# Kijko App Launcher Script
# This script starts the Kijko application and saves the process ID

# Source user's profile to get full environment (including nvm)
[ -f "$HOME/.bashrc" ] && source "$HOME/.bashrc"
[ -f "$HOME/.profile" ] && source "$HOME/.profile"
[ -f "$HOME/.bash_profile" ] && source "$HOME/.bash_profile"

# Load nvm environment to access node/npm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Fallback: Set PATH directly to node installation
export PATH="$HOME/.nvm/versions/node/v24.4.1/bin:$PATH"

APP_DIR="/home/david/Projects/Kijko/MVP/MVP_Kijko"
PID_FILE="/tmp/kijko-app.pid"

# Change to app directory
cd "$APP_DIR"

# Debug: Check if npm is available
echo "Checking npm availability..."
which npm || echo "npm not found in PATH"
echo "Current PATH: $PATH"
echo "Node version: $(node --version 2>/dev/null || echo 'node not found')"
echo "NPM version: $(npm --version 2>/dev/null || echo 'npm not found')"

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

# Start the development server in background
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
