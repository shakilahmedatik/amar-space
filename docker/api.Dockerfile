FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy the entire turborepo
COPY . .

# Install dependencies for the monorepo
RUN bun install

# Build the api project
RUN bun run build --filter=api

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy only the bundled standalone output from the builder stage
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist/index.js ./index.js

# Switch to non-root user
USER nodejs

EXPOSE 3001

# Start the server
CMD ["node", "index.js"]
