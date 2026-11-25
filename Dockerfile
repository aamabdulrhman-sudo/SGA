FROM node:20-alpine

RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# No demo data is seeded — the first-run setup wizard (/setup) creates the
# platform manager account from the browser after the first boot.
RUN ./node_modules/.bin/prisma generate && \
    NODE_ENV=production npm run build && \
    chmod +x ./docker-entrypoint.sh && \
    mkdir -p /app/data /app/public/uploads && \
    chown -R node:node /app/data /app/public/uploads /app/.next /app/node_modules

ENV NODE_ENV=production
VOLUME ["/app/data", "/app/public/uploads"]

USER node
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
