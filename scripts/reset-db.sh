#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}⚠️  경고: 이 작업은 모든 MongoDB 데이터를 삭제합니다!${NC}"
echo ""
echo "백업이 필요하다면 먼저 실행하세요:"
echo "  mongodump --uri mongodb://localhost:27017/selectchatgpt -o ./backup"
echo ""
read -p "계속하시겠습니까? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ 취소되었습니다.${NC}"
    exit 1
fi

echo -e "${YELLOW}🗑️  MongoDB를 중지하고 데이터를 삭제합니다...${NC}"

# 모든 서비스 중지
docker compose down

# 볼륨 삭제
docker volume rm select-chat-gpt_mongodb_data 2>/dev/null || echo "mongodb_data 볼륨이 존재하지 않습니다."

echo -e "${GREEN}✅ MongoDB 데이터가 삭제되었습니다.${NC}"
echo ""
echo "🚀 서비스를 다시 시작하려면: docker compose up -d"
