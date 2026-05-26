# ---- Stage 1: Install dependencies ----
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare bun@1.3.13 --activate

WORKDIR /app

# Copy lockfile and package manifests first for layer caching
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/db/package.json ./packages/db/

RUN bun install --frozen-lockfile

# ---- Stage 2: Build the application ----
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare bun@1.3.13 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/typescript-config/node_modules ./packages/typescript-config/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules

# Copy source files
COPY package.json bun.lock turbo.json ./
COPY apps/api/ ./apps/api/
COPY packages/typescript-config/ ./packages/typescript-config/
COPY packages/db/ ./packages/db/

# Build the Fastify application
RUN bun run build --filter=api

# ---- Stage 3: Production runtime ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

# Copy built output and production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/db/ ./packages/db/

USER fastify

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/api/dist/index.js"]
