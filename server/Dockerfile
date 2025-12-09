FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 파일 복사
COPY package.json ./

# npm으로 설치 (pnpm 빌드 스크립트 문제 회피)
RUN npm install

# 소스 코드 복사
COPY . .

# TypeScript 빌드
RUN npx tsc

# 프로덕션 이미지
FROM node:20-alpine AS runner

WORKDIR /app

# 프로덕션 의존성만 설치
COPY package.json ./
RUN npm install --omit=dev

# 빌드 결과 복사
COPY --from=builder /app/dist ./dist

# 포트 노출
EXPOSE 3001

# 실행
CMD ["node", "dist/index.js"]
