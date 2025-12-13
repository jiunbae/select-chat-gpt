#!/bin/bash
set -e

# Configuration
SESSION_NAME="runtime-selectchatgpt"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_message() {
    echo -e "${2}${1}${NC}"
}

# Port configuration
BACKEND_PORT=${PORT:-3001}
FRONTEND_PORT=3000

# Parse arguments
STOP_DOCKER=0

for arg in "$@"; do
    case $arg in
        --stop-docker)
            STOP_DOCKER=1
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --stop-docker    Stop Docker services (MongoDB)"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
    esac
done

print_message "🛑 Stopping SelectChatGPT services..." "$BLUE"

# Kill tmux session
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    print_message "Killing tmux session: $SESSION_NAME" "$YELLOW"
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
    print_message "✅ tmux session terminated" "$GREEN"
else
    print_message "ℹ️  No tmux session found: $SESSION_NAME" "$YELLOW"
fi

# Stop Docker services if requested
if [ "$STOP_DOCKER" -eq 1 ]; then
    print_message "🐳 Stopping Docker services..." "$BLUE"
    if [ -f "$PROJECT_ROOT/docker-compose.dev.yml" ]; then
        if docker compose version >/dev/null 2>&1; then
            docker compose -f "$PROJECT_ROOT/docker-compose.dev.yml" down
        elif command -v docker-compose >/dev/null 2>&1; then
            docker-compose -f "$PROJECT_ROOT/docker-compose.dev.yml" down
        fi
        print_message "✅ Docker services stopped" "$GREEN"
    fi
fi

# Kill processes on ports
kill_port() {
    local port=$1
    local name=$2
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        print_message "Killing $name on port $port (PIDs: $pids)" "$YELLOW"
        echo "$pids" | xargs -r kill -9 2>/dev/null || true
        print_message "✅ $name stopped" "$GREEN"
    fi
}

kill_port $FRONTEND_PORT "Web"
kill_port $BACKEND_PORT "Server"

print_message "\n✅ All services stopped!" "$GREEN"
