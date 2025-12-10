FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app

# 루트 설정 파일 복사
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 필요한 패키지들의 package.json 복사
COPY packages/common/package.json ./packages/common/
COPY web/package.json ./web/

# 의존성 설치
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

# 의존성 복사
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/common/node_modules ./packages/common/node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules

# 소스 코드 복사
COPY packages/common ./packages/common
COPY web ./web
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

ENV NEXT_TELEMETRY_DISABLED=1

# Build-time arguments for NEXT_PUBLIC_ variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_ADSENSE_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
ENV NEXT_PUBLIC_ADSENSE_ID=$NEXT_PUBLIC_ADSENSE_ID

RUN pnpm --filter select-chatgpt-web build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/web/public ./web/public
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "web/server.js"]
