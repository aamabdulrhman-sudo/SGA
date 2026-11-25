# ============================================================
# منصة إدارة الجمعيات العمومية وتصويت المساهمين — SGA Platform
# Multi-stage Docker build (Next.js 14 + Prisma + SQLite)
# ============================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ---------- Stage 1: dependencies ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Stage 2: build ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Generate Prisma client for the build machine (linux-musl)
RUN ./node_modules/.bin/prisma generate
# Compile the TypeScript seed script to plain JS (no tsx needed at runtime)
RUN ./node_modules/.bin/tsc prisma/seed.ts \
    --outDir prisma/dist \
    --module commonjs \
    --target ES2017 \
    --moduleResolution node \
    --esModuleInterop \
    --skipLibCheck
# Production build
RUN npm run build

# ---------- Stage 3: runtime ----------
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8110:3000 \
    HOSTNAME=0.0.0.0

# Full node_modules (needed for `prisma db push` init + `next start`)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Persistent data dirs (mounted as volumes in docker-compose)
RUN mkdir -p /app/data /app/public/uploads \
    && chown -R node:node /app/data /app/public/uploads /app/.next
VOLUME ["/app/data", "/app/public/uploads"]

USER node
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
