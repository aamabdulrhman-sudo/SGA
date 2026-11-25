# ============================================================
# منصة إدارة الجمعيات العمومية وتصويت المساهمين — SGA Platform
# Multi-stage Docker build (Next.js 14 + Prisma + SQLite)
# ============================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ---------- Stage 1: dependencies ----------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Stage 2: build ----------
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN ./node_modules/.bin/prisma generate
RUN ./node_modules/.bin/tsc prisma/seed.ts \
    --outDir prisma/dist \
    --module commonjs \
    --target ES2017 \
    --moduleResolution node \
    --esModuleInterop \
    --skipLibCheck
RUN npm run build

# ---------- Stage 3: runtime ----------
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh \
    && ./node_modules/.bin/prisma generate

RUN mkdir -p /app/data /app/public/uploads \
    && chown -R node:node /app/data /app/public/uploads /app/.next /app/node_modules
VOLUME ["/app/data", "/app/public/uploads"]

USER node
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
