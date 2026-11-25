# ---------- Stage 3: runtime ----------
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
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
RUN chmod +x ./docker-entrypoint.sh \
    && ./node_modules/.bin/prisma generate

# Persistent data dirs (mounted as volumes in docker-compose)
RUN mkdir -p /app/data /app/public/uploads \
    && chown -R node:node /app/data /app/public/uploads /app/.next /app/node_modules
VOLUME ["/app/data", "/app/public/uploads"]

USER node
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
