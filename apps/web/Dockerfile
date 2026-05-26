# ---- Stage 1: Install dependencies ----
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare bun@1.3.13 --activate

WORKDIR /app

# Copy lockfile and package manifests first for layer caching
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/db/package.json ./packages/db/

RUN bun install --frozen-lockfile

# ---- Stage 2: Build the application ----
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare bun@1.3.13 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/typescript-config/node_modules ./packages/typescript-config/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules

# Copy source files
COPY package.json bun.lock turbo.json ./
COPY apps/web/ ./apps/web/
COPY packages/typescript-config/ ./packages/typescript-config/
COPY packages/db/ ./packages/db/

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build --filter=web

# ---- Stage 3: Production runtime ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
