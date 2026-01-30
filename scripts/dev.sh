#!/usr/bin/env bash
# Pixel Forge Dev Server Management
# Usage: ./scripts/dev.sh [start|stop|restart|status]

set -e

CLIENT_PORT=5173
SERVER_PORT=3000

stop_servers() {
    echo "Stopping servers..."
    pkill -f "vite.*$CLIENT_PORT" 2>/dev/null || true
    pkill -f "bun.*packages/server" 2>/dev/null || true
    fuser -k $CLIENT_PORT/tcp 2>/dev/null || true
    fuser -k $SERVER_PORT/tcp 2>/dev/null || true
    sleep 1
    echo "Servers stopped"
}

start_client() {
    echo "Starting client on :$CLIENT_PORT (network accessible)..."
    cd "$(dirname "$0")/.." || exit
    bun run dev:client -- --host 0.0.0.0 &
    sleep 2
}

start_server() {
    echo "Starting server on :$SERVER_PORT (network accessible)..."
    cd "$(dirname "$0")/.." || exit
    HOST=0.0.0.0 bun run dev:server &
    sleep 2
}

status() {
    echo "=== Server Status ==="
    if lsof -i :$CLIENT_PORT >/dev/null 2>&1; then
        echo "Client (:$CLIENT_PORT): RUNNING"
        lsof -i :$CLIENT_PORT | tail -1
    else
        echo "Client (:$CLIENT_PORT): STOPPED"
    fi

    if lsof -i :$SERVER_PORT >/dev/null 2>&1; then
        echo "Server (:$SERVER_PORT): RUNNING"
        lsof -i :$SERVER_PORT | tail -1
    else
        echo "Server (:$SERVER_PORT): STOPPED"
    fi
}

case "${1:-start}" in
    start)
        stop_servers
        start_server
        start_client
        status
        ;;
    stop)
        stop_servers
        ;;
    restart)
        stop_servers
        start_server
        start_client
        status
        ;;
    status)
        status
        ;;
    client)
        fuser -k $CLIENT_PORT/tcp 2>/dev/null || true
        sleep 1
        start_client
        ;;
    server)
        fuser -k $SERVER_PORT/tcp 2>/dev/null || true
        sleep 1
        start_server
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|client|server}"
        exit 1
        ;;
esac
