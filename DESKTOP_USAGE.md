# Kijko Desktop Integration

This setup provides desktop shortcut functionality and app closing capabilities for the Kijko Video Brief Assistant.

## Files Created

1. **`launch-kijko.sh`** - Starts the Kijko app
2. **`kill-kijko.sh`** - Stops the app and frees all ports  
3. **`/home/david/Desktop/Kijko.desktop`** - Desktop shortcut (updated)

## How to Use

### Starting Kijko
- **Double-click** the "Kijko" desktop icon
- Or run: `./launch-kijko.sh` from terminal in this directory
- The app will start on `http://localhost:5173` and open automatically in your browser

### Closing Kijko

#### Method 1: Close Button (Recommended)
- Click the red **×** button in the top-right corner of the app
- Confirm when prompted
- The app will display a shutdown message and the browser will close
- The launcher script automatically detects the shutdown signal and kills all processes

#### Method 2: Terminal Command
- Run: `./kill-kijko.sh` from terminal in this directory
- This forcefully kills all app processes and frees ports

#### Method 3: Manual Cleanup
- If the app gets stuck, you can always run the kill script directly

## Features

### Desktop Shortcut
- **Name**: Kijko Video Brief Assistant
- **Location**: `/home/david/Desktop/Kijko.desktop`
- **Function**: Launches the app and opens browser automatically
- **Categories**: Development, AudioVideo, Graphics

### Process Management
- **PID Tracking**: App process ID saved to `/tmp/kijko-app.pid`
- **Port Management**: Automatically frees ports 5173, 3000, 4173, 8080
- **Process Cleanup**: Kills all related Vite/Node processes

### Shutdown Monitoring
- The launcher script monitors for shutdown signals
- Creates shutdown signal file in Downloads folder
- Automatically triggers cleanup when signal detected

## Troubleshooting

### App Won't Start
```bash
# Check if ports are in use
lsof -i :5173

# Kill any existing processes
./kill-kijko.sh

# Try starting again
./launch-kijko.sh
```

### App Won't Close
```bash
# Force kill all processes
./kill-kijko.sh

# Check if ports are free
lsof -i :5173
```

### Desktop Shortcut Not Working
```bash
# Make sure the desktop file is executable
chmod +x /home/david/Desktop/Kijko.desktop

# Test the launcher script directly
./launch-kijko.sh
```

## Technical Details

- **Framework**: React + Vite + TypeScript
- **Default Port**: 5173 (Vite dev server)
- **Process Monitoring**: PID file + signal file approach
- **Browser Integration**: Automatic opening via `xdg-open`
- **Cleanup**: Comprehensive process and port cleanup
