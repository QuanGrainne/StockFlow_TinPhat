# syntax=docker/dockerfile:1
# StockFlow web (Next.js) — image chạy trong Docker Compose (deploy/compose.yml).
#
# NEXT_PUBLIC_API_URL được Next gắn cứng vào mã trình duyệt lúc build:
#   ""  (mặc định ở đây) → gọi API theo đường tương đối /api/... qua Caddy (cùng địa chỉ với web, không cần CORS)
#   "http://localhost:5000" → gọi thẳng API như khi chạy npm run dev

# Dependencies: chỉ package.json + package-lock.json để sửa code không phải cài lại.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Build
FROM node:22-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public && npm run build && npm prune --omit=dev

# Runtime: next start, chạy bằng user "node" (không phải root).
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/package.json /app/next.config.ts ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next ./.next
USER node
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
