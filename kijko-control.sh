#!/bin/bash

# Kijko Control Script
# Provides easy commands to start/stop Kijko from anywhere

APP_DIR="/home/david/Projects/Kijko/MVP/MVP_Kijko"

case "$1" in
    start|launch|run)
        echo "Starting Kijko..."
        bash "$APP_DIR/launch-kijko.sh"
        ;;
    stop|kill|close)
        echo "Stopping Kijko..."
        bash "$APP_DIR/kill-kijko.sh"
        ;;
    restart)
        echo "Restarting Kijko..."
        bash "$APP_DIR/kill-kijko.sh"
        sleep 2
        bash "$APP_DIR/launch-kijko.sh"
        ;;
    status)
        PID_FILE="/tmp/kijko-app.pid"
        if [ -f "$PID_FILE" ] && ps -p "$(cat $PID_FILE)" > /dev/null 2>&1; then
            echo "Kijko is running (PID: $(cat $PID_FILE))"
            echo "App should be available at: http://localhost:5173"
        else
            echo "Kijko is not running"
        fi
        ;;
    *)
        echo "Kijko Control Script"
        echo ""
        echo "Usage: $0 {start|stop|restart|status}"
        echo ""
        echo "Commands:"
        echo "  start    - Launch Kijko app"
        echo "  stop     - Stop Kijko app and free all ports"
        echo "  restart  - Stop and start Kijko app"
        echo "  status   - Check if Kijko is running"
        echo ""
        echo "Desktop shortcut: Double-click Kijko icon on desktop"
        exit 1
        ;;
esac
