FROM node:20-alpine AS builder

WORKDIR /app

# pnpm 활성화
RUN corepack enable pnpm

# 의존성 설치를 위한 파일 복사
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/common/package.json ./packages/common/
COPY web/package.json ./web/

# 의존성 설치
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY packages/common ./packages/common
COPY web ./web

# 빌드 인자
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_ADSENSE_ID

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_GA_ID=${NEXT_PUBLIC_GA_ID}
ENV NEXT_PUBLIC_ADSENSE_ID=${NEXT_PUBLIC_ADSENSE_ID}

# 빌드
RUN pnpm --filter @selectchatgpt/common build && \
    pnpm --filter select-chatgpt-web build

# 프로덕션 이미지
FROM nginx:alpine

# nginx 설정 복사
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

# 빌드된 정적 파일 복사
COPY --from=builder /app/web/out /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
