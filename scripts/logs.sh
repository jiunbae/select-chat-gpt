#!/bin/bash
SERVICE=${1:-""}

# Colors
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$SERVICE" ]; then
    echo -e "${BLUE}📝 모든 서비스의 로그를 출력합니다...${NC}"
    docker compose logs -f
else
    echo -e "${BLUE}📝 $SERVICE 서비스의 로그를 출력합니다...${NC}"
    docker compose logs -f "$SERVICE"
fi
