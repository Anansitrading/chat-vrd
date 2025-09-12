#!/usr/bin/env python3

import os
import sys
import subprocess
import time
import webbrowser
from pathlib import Path

def main():
    # Configuration
    APP_DIR = "/home/david/Projects/Kijko/MVP/MVP_Kijko"
    PID_FILE = "/tmp/kijko-app.pid"
    NODE_BIN = "/home/david/.nvm/versions/node/v24.4.1/bin"
    NPM = f"{NODE_BIN}/npm"
    NODE = f"{NODE_BIN}/node"
    PORT = 5173
    
    print("=== Kijko Python Launcher ===")
    print(f"App Directory: {APP_DIR}")
    print(f"Node Binary: {NODE}")
    print(f"NPM Binary: {NPM}")
    
    # Change to app directory
    os.chdir(APP_DIR)
    
    # Check if binaries exist
    if not os.path.exists(NODE):
        print(f"Error: Node.js not found at {NODE}")
        print("Please check your Node.js installation")
        return 1
        
    if not os.path.exists(NPM):
        print(f"Error: NPM not found at {NPM}")
        print("Please check your NPM installation")
        return 1
    
    # Check if app is already running
    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE, 'r') as f:
                pid = int(f.read().strip())
            
            # Check if process is still running
            try:
                os.kill(pid, 0)  # Doesn't actually kill, just checks if process exists
                print(f"Kijko app is already running (PID: {pid})")
                webbrowser.open(f"http://localhost:{PORT}")
                return 0
            except OSError:
                # Process doesn't exist, remove stale PID file
                os.remove(PID_FILE)
        except (ValueError, FileNotFoundError):
            # Invalid or missing PID file
            if os.path.exists(PID_FILE):
                os.remove(PID_FILE)
    
    print("Starting Kijko app...")
    
    # Set up environment with proper NVM configuration
    env = os.environ.copy()
    env['PATH'] = f"{NODE_BIN}:{env.get('PATH', '')}"
    env['NVM_BIN'] = NODE_BIN
    env['NVM_DIR'] = "/home/david/.nvm"
    
    try:
        # Start the development server using bash with NVM sourcing
        # This ensures the Node.js environment is properly set up
        process = subprocess.Popen(
            [
                "bash", "-c",
                f"source /home/david/.nvm/nvm.sh && nvm use 24.4.1 && npm run dev"
            ],
            cwd=APP_DIR,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True
        )
        
        # Save the process ID
        with open(PID_FILE, 'w') as f:
            f.write(str(process.pid))
        
        print(f"Kijko app started with PID: {process.pid}")
        print(f"PID saved to {PID_FILE}")
        
        # Wait for server to start
        print("Waiting for server to start...")
        time.sleep(3)
        
        # Open browser
        print("Opening browser...")
        webbrowser.open(f"http://localhost:{PORT}")
        
        print("Kijko app is now running!")
        print("Use the close button in the app or run kill-kijko.sh to stop it.")
        
        # Monitor the process and output
        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break
            if output:
                print(output.strip())
        
        # Clean up PID file when process ends
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)
            
    except FileNotFoundError:
        print(f"Error: Could not execute {NPM}")
        print("Please check your Node.js/NPM installation")
        return 1
    except Exception as e:
        print(f"Error starting Kijko app: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
