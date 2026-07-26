# ---- Dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ---- Build ----
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL only needs to be a valid-looking URL at build time;
# Prisma Client generation does not require a live database connection.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"
RUN npx prisma generate
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
# su-exec lets the entrypoint start as root (to fix ownership on the
# mounted volume, which Railway always mounts as root:root) and then drop
# down to the unprivileged "nextjs" user to actually run the app.
RUN apk add --no-cache openssl su-exec
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Install the exact Prisma CLI version pinned in package.json so that
# `npx prisma migrate deploy` (run by our own pre-deploy step, or by any
# platform auto-detected release command) resolves to this local binary
# instead of fetching the latest major version from the registry at deploy
# time — which broke deploys once Prisma 7 shipped a breaking schema change.
RUN npm install -g prisma@5.20.0

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Stay root here — the entrypoint fixes ownership on whatever gets mounted
# at /app/uploads (a fresh Railway volume is always root:root, regardless
# of what the image had at build time) before dropping to "nextjs".
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
