#!/usr/bin/env bash
set -euo pipefail

show_usage() {
  cat <<'USAGE'
Usage: run.sh [BASE_DIR] [OPTIONS]
  BASE_DIR     : select-chat-gpt 프로젝트 루트 경로 (기본값: 현재 작업 디렉터리)

Options:
  --name NAME           tmux 세션 이름 (기본값: runtime-selectchatgpt)
  -f, --force           기존 세션이 있을 경우 서비스를 종료하고 새로 시작합니다.
  --docker              Docker 모드 강제 사용
  --local               로컬 모드 강제 사용 (Docker 없이)
  -h, --help            이 도움말을 표시합니다.

준비된 세션이 이미 있을 경우 해당 세션에 바로 접속합니다.
USAGE
}

if [[ ${1:-} == "-h" || ${1:-} == "--help" ]]; then
  show_usage
  exit 0
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FORCE_RESTART=0
USE_DOCKER=""
SESSION_NAME=""
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      show_usage
      exit 0
      ;;
    --name)
      if [ -z "${2:-}" ]; then
        echo "--name 옵션에 세션 이름을 지정해야 합니다." >&2
        show_usage
        exit 1
      fi
      SESSION_NAME="$2"
      shift 2
      ;;
    -f|--force)
      FORCE_RESTART=1
      shift
      ;;
    --docker)
      USE_DOCKER="docker"
      shift
      ;;
    --local)
      USE_DOCKER="local"
      shift
      ;;
    --)
      shift
      POSITIONAL_ARGS+=("$@")
      break
      ;;
    -*)
      echo "알 수 없는 옵션입니다: $1" >&2
      show_usage
      exit 1
      ;;
    *)
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

if [ ${#POSITIONAL_ARGS[@]} -gt 0 ]; then
  set -- "${POSITIONAL_ARGS[@]}"
else
  set --
fi

RAW_BASE_DIR="${1:-$PWD}"

if ! BASE_DIR=$(cd "$RAW_BASE_DIR" 2>/dev/null && pwd); then
  echo "지정한 BASE_DIR 경로를 찾을 수 없습니다: $RAW_BASE_DIR" >&2
  exit 1
fi

# --name이 지정되지 않은 경우 runtime-selectchatgpt로 설정
if [ -z "$SESSION_NAME" ]; then
  SESSION_NAME="runtime-selectchatgpt"
fi

# Function to print colored messages
print_message() {
    echo -e "${2}${1}${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Python-based .env parser
read_env_pairs() {
  local file_list=("$@")
  python3 - "$@" <<'PY'
import os
import shlex
import sys

result = {}
for path in sys.argv[1:]:
    if not path:
        continue
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' not in line:
                continue
            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip()
            if not key:
                continue
            # Remove quotes
            if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                value = value[1:-1]
            result[key] = value

pairs = [f"{key}={shlex.quote(value)}" for key, value in result.items()]
print(' '.join(pairs))
PY
}

# Get specific env value
get_env_value() {
  local key="$1"
  shift
  python3 - "$key" "$@" <<'PY'
import os
import sys

target = sys.argv[1]
value = None
for path in sys.argv[2:]:
    if not path:
        continue
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, raw_value = line.split('=', 1)
            key = key.strip()
            raw_value = raw_value.strip()
            if key != target:
                continue
            if (raw_value.startswith('"') and raw_value.endswith('"')) or (raw_value.startswith("'") and raw_value.endswith("'")):
                raw_value = raw_value[1:-1]
            value = raw_value
if value is None:
    print("")
else:
    print(value)
PY
}

# Graceful shutdown
FORCE_SHUTDOWN_TIMEOUT=15

wait_for_tmux_session_termination() {
  local session=$1
  local timeout=${2:-15}
  local waited=0

  while tmux has-session -t "$session" 2>/dev/null; do
    if [ "$waited" -ge "$timeout" ]; then
      return 1
    fi
    sleep 1
    waited=$((waited + 1))
  done

  return 0
}

graceful_shutdown_tmux_session() {
  local session=$1
  local timeout=${2:-15}

  local panes_output
  panes_output=$(tmux list-panes -t "$session" -F '#{pane_id}' 2>/dev/null || true)

  if [ -n "$panes_output" ]; then
    while IFS= read -r pane; do
      [ -n "$pane" ] || continue
      tmux send-keys -t "$pane" C-c
      tmux send-keys -t "$pane" 'exit' Enter
    done <<< "$panes_output"
  fi

  wait_for_tmux_session_termination "$session" "$timeout"
}

# Check prerequisites
print_message "🔍 Checking prerequisites..." "$BLUE"

if ! command_exists tmux; then
    print_message "❌ tmux is not installed. Please install tmux first." "$RED"
    print_message "   On macOS: brew install tmux" "$YELLOW"
    print_message "   On Ubuntu: sudo apt-get install tmux" "$YELLOW"
    exit 1
fi

if ! command_exists node; then
    print_message "❌ Node.js is not installed. Please install Node.js 18+ first." "$RED"
    exit 1
fi

if ! command_exists pnpm; then
    print_message "❌ pnpm is not installed. Please install pnpm first." "$RED"
    print_message "   npm install -g pnpm" "$YELLOW"
    exit 1
fi

# Load .env if exists (server/.env for MongoDB settings)
ENV_ARGS=""
if [ -f "$BASE_DIR/server/.env" ]; then
    ENV_ARGS=$(read_env_pairs "$BASE_DIR/server/.env")
fi

# Extract port values
BACKEND_PORT=$(get_env_value "PORT" "$BASE_DIR/server/.env")
BACKEND_PORT=${BACKEND_PORT:-3001}

FRONTEND_PORT=3000

MONGODB_PORT=$(get_env_value "MONGODB_PORT" "$BASE_DIR/server/.env")
MONGODB_PORT=${MONGODB_PORT:-27017}

# Auto-detect mode if not specified
if [ -z "$USE_DOCKER" ]; then
    if command_exists docker && (command_exists docker-compose || docker compose version >/dev/null 2>&1); then
        USE_DOCKER="docker"
        print_message "✅ Docker detected, using Docker mode" "$GREEN"
    else
        USE_DOCKER="local"
        print_message "ℹ️  Docker not found, using Local mode" "$YELLOW"
    fi
fi

# Detect Docker Compose command
DOCKER_COMPOSE=""
if [ "$USE_DOCKER" = "docker" ]; then
    if docker compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE="docker compose"
        print_message "✅ Using modern 'docker compose' syntax" "$GREEN"
    elif command_exists docker-compose; then
        DOCKER_COMPOSE="docker-compose"
        print_message "ℹ️  Using legacy 'docker-compose' syntax" "$YELLOW"
    else
        print_message "❌ Docker Compose is not installed." "$RED"
        exit 1
    fi
fi

# Ensure dependencies are installed (pnpm workspace)
ensure_deps() {
    if [ ! -d "$BASE_DIR/node_modules" ]; then
        print_message "📦 Installing dependencies with pnpm..." "$BLUE"
        (cd "$BASE_DIR" && pnpm install)
    fi
}

ensure_deps

# Handle existing session
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  if [ "$FORCE_RESTART" -eq 1 ]; then
    print_message "기존 tmux 세션 '$SESSION_NAME' 종료를 시도합니다..." "$YELLOW"
    if graceful_shutdown_tmux_session "$SESSION_NAME" "$FORCE_SHUTDOWN_TIMEOUT"; then
      print_message "기존 tmux 세션 '$SESSION_NAME' 이(가) 정상적으로 종료되었습니다." "$GREEN"
    else
      print_message "graceful shutdown이 제한 시간(${FORCE_SHUTDOWN_TIMEOUT}s) 내에 완료되지 않아 강제 종료합니다." "$YELLOW"
      tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
      if ! wait_for_tmux_session_termination "$SESSION_NAME" "$FORCE_SHUTDOWN_TIMEOUT"; then
        print_message "tmux 세션 '$SESSION_NAME' 을(를) 종료할 수 없습니다." "$RED"
        exit 1
      fi
    fi
  else
    print_message "이미 tmux 세션 '$SESSION_NAME' 이(가) 존재합니다. 해당 세션에 접속합니다." "$GREEN"
    exec tmux attach-session -t "$SESSION_NAME"
  fi
fi

# Start Database Services (MongoDB)
if [ "$USE_DOCKER" = "docker" ]; then
    print_message "🐳 Starting Docker services (MongoDB)..." "$BLUE"
    cd "$BASE_DIR"
    $DOCKER_COMPOSE -f docker-compose.dev.yml up -d mongodb

    print_message "⏳ Waiting for MongoDB to be ready..." "$YELLOW"
    sleep 3
elif [ "$USE_DOCKER" = "local" ]; then
    print_message "🏠 Using Local MongoDB..." "$BLUE"
    print_message "⚠️  Make sure MongoDB is running locally on port $MONGODB_PORT" "$YELLOW"
fi

print_message "🚀 Starting tmux session: $SESSION_NAME" "$GREEN"

# Create server window
tmux new-session -d -s "$SESSION_NAME" -n "server" -c "$BASE_DIR/server" \
  bash -lc "pnpm dev; exec bash"

# Create web window
tmux new-window -t "$SESSION_NAME:1" -n "web" -c "$BASE_DIR/web" \
  bash -lc "pnpm dev; exec bash"

# Create logs window
tmux new-window -t "$SESSION_NAME:2" -n "logs" -c "$BASE_DIR"
if [ "$USE_DOCKER" = "docker" ]; then
    tmux send-keys -t "$SESSION_NAME:2" "$DOCKER_COMPOSE -f docker-compose.dev.yml logs -f mongodb" Enter
else
    tmux send-keys -t "$SESSION_NAME:2" "# Logs window - Local mode" Enter
fi

# Create database window
tmux new-window -t "$SESSION_NAME:3" -n "database" -c "$BASE_DIR"
if [ "$USE_DOCKER" = "docker" ]; then
    tmux send-keys -t "$SESSION_NAME:3" "# Database access: $DOCKER_COMPOSE -f docker-compose.dev.yml exec mongodb mongosh selectchatgpt" Enter
else
    tmux send-keys -t "$SESSION_NAME:3" "# Database access: mongosh mongodb://localhost:27017/selectchatgpt" Enter
fi

# Create terminal window
tmux new-window -t "$SESSION_NAME:4" -n "terminal" -c "$BASE_DIR"

# Select server window
tmux select-window -t "$SESSION_NAME:0"

print_message "\n✨ SelectChatGPT development environment is running!" "$GREEN"
print_message "\n📍 Service URLs:" "$BLUE"
print_message "   Web:         http://localhost:$FRONTEND_PORT" "$NC"
print_message "   Server API:  http://localhost:$BACKEND_PORT" "$NC"
print_message "   Health:      http://localhost:$BACKEND_PORT/health" "$NC"

print_message "\n📺 tmux commands:" "$BLUE"
print_message "   Attach:         tmux attach -t $SESSION_NAME" "$NC"
print_message "   Switch windows: Ctrl+b [0-4]" "$NC"
print_message "   Detach:         Ctrl+b d" "$NC"

print_message "\ntmux 세션 '$SESSION_NAME' 이(가) 준비되었습니다." "$GREEN"
if [[ -t 1 ]]; then
  tmux attach-session -t "$SESSION_NAME"
else
  print_message "(비대화식 실행) 'tmux attach-session -t $SESSION_NAME' 명령으로 접속하세요." "$NC"
fi
