#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 서버를 재시작합니다...${NC}"
docker compose restart server
echo -e "${GREEN}✅ 서버 재시작 완료!${NC}"
echo -e "${BLUE}📝 서버 로그를 보려면: docker compose logs -f server${NC}"
