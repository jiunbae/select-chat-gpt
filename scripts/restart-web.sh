#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 웹을 재시작합니다...${NC}"
docker compose restart web
echo -e "${GREEN}✅ 웹 재시작 완료!${NC}"
echo -e "${BLUE}📝 웹 로그를 보려면: docker compose logs -f web${NC}"
