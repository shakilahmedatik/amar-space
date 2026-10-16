# Omni Heaven (omniheaven.com)

Omni Heaven is a multi-tenant commercial SaaS platform built for **Hotels, Resorts, and Property/Building Owners**.

## Monorepo Architecture

Managed via **Turborepo** and powered by **Bun** workspaces:

```text
├── apps/
│   ├── web/               # Marketing Landing Page (omniheaven.com)
│   ├── admin/             # Property & Hotel Manager Dashboard (app.omniheaven.com)
│   ├── hotel-resort-web/  # Multi-tenant Dynamic Guest Engine ([slug].omniheaven.com)
│   ├── renter-portal/     # Tenant & Flat Resident Portal (renter.omniheaven.com)
│   ├── superadmin/        # Platform HQ & Subscription Control (hq.omniheaven.com)
│   ├── mobile/            # React Native / Expo Manager Companion App
│   └── api/               # Bun + Hono REST & tRPC Microservice (:3001)
├── packages/
│   ├── db/                # Drizzle ORM PostgreSQL Schema & Migrations
│   ├── auth/              # Better Auth Integration & Session Utilities
│   ├── trpc/              # End-to-end Type-safe Router & Client
│   ├── ui/                # Shared Tailwind v4 Design System & Components
│   ├── validators/        # Zod Schemas for Hotels, Buildings, Renters & Bookings
│   └── typescript-config/ # Strict Shared tsconfig Presets
└── docker/                # Multi-stage Dockerfiles for API and Next.js Apps
```

## Quick Start

### 1. Prerequisites
- **Bun**: `^1.2.0` (Recommended: `1.4.3+`)
- **Node.js**: `^20.0.0` or `^22.0.0`
- **Docker & Docker Compose** (for self-hosting or local database)

### 2. Installation
```bash
bun install
```

### 3. Environment Setup
Copy the sample environment variables:
```bash
cp .env.example .env
```

### 4. Local Development
Run all applications concurrently with Turborepo:
```bash
bun dev
```

Or run individual apps:
```bash
bun --filter admin dev
bun --filter hotel-resort-web dev
bun --filter api dev
```

### 5. Quality & Type Checking
```bash
# Typecheck all 13 packages and apps in parallel
bun run check-types

# Biome format & lint check
bun run check
bun run format
```

## Production & Self-Hosting

Spin up the entire production stack (PostgreSQL, SeaweedFS, Cloudflare Tunnel, API, and Web Apps):

```bash
docker compose up -d --build
```

