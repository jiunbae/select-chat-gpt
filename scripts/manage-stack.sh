#!/usr/bin/env bash
set -euo pipefail

COMMAND=${1:-""}

print_usage() {
  cat <<'EOF'
사용법: ./scripts/manage-stack.sh <명령>

명령 목록:
  fresh       : 볼륨까지 모두 삭제 후 빌드/기동. 완전 초기화.
  hot         : MongoDB 유지, server·web만 빌드 후 재기동.
  db-reset    : MongoDB 데이터 삭제 후 재빌드/기동.
  restart-all : 모든 컨테이너 내리고 다시 올리기(데이터 보존).
  help        : 이 도움말 출력.

예시:
  ./scripts/manage-stack.sh fresh
  ./scripts/manage-stack.sh hot
EOF
}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_message() {
    echo -e "${2}${1}${NC}"
}

case "$COMMAND" in
  fresh)
    print_message "[fresh] 컨테이너+볼륨 삭제 후 빌드/기동합니다 (데이터 모두 삭제)." "$YELLOW"
    docker compose down -v
    docker compose up --build
    ;;

  hot)
    print_message "[hot] MongoDB 유지, server·web만 빌드 후 무중단 재기동합니다." "$GREEN"
    docker compose build server web
    docker compose up -d server web
    print_message "✅ 완료! 로그 확인: docker compose logs -f server web" "$GREEN"
    ;;

  db-reset)
    print_message "[db-reset] MongoDB 데이터를 삭제하고 재기동합니다." "$YELLOW"
    print_message "⚠️  필요한 경우 사전에 백업하세요:" "$RED"
    print_message "   mongodump --uri mongodb://localhost:27017/selectchatgpt" "$NC"
    echo ""
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_message "❌ 취소되었습니다." "$RED"
        exit 1
    fi
    docker compose down -v
    docker compose up --build
    ;;

  restart-all)
    print_message "[restart-all] 데이터는 유지한 채 모든 컨테이너를 재시작합니다." "$GREEN"
    docker compose down
    docker compose up -d
    print_message "✅ 완료! 상태 확인: docker compose ps" "$GREEN"
    ;;

  help|-h|--help)
    print_usage
    ;;

  *)
    echo "알 수 없는 명령: $COMMAND" >&2
    print_usage
    exit 1
    ;;
esac
