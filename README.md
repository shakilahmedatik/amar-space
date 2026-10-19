# Omni Heaven (omniheaven.com)

Omni Heaven is a multi-tenant commercial SaaS platform built for **Hotels, Resorts, and Property/Building Owners**.

## Monorepo Architecture

Managed via **Turborepo** and powered by **Bun** workspaces:

```text
├── apps/
│   ├── web/               # Marketing Landing Page (omniheaven.com) (:3004)
│   ├── admin/             # Property & Hotel Manager Dashboard (app.omniheaven.com) (:3000)
│   ├── hotel-resort-web/  # Multi-tenant Dynamic Guest Engine ([slug].omniheaven.com) (:3003)
│   ├── renter-portal/     # Tenant & Flat Resident Portal (renter.omniheaven.com) (:3002)
│   ├── superadmin/        # Platform HQ & Subscription Control (hq.omniheaven.com) (:3001)
│   ├── mobile/            # React Native / Expo Manager Companion App
│   └── api/               # Bun + Hono REST & tRPC Microservice (:4000)
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
- **Docker & Docker Compose** (for backing services and self-hosting)

### 2. Installation
```bash
bun install
```

### 3. Environment Setup
Copy the sample environment variables:
```bash
cp .env.example .env
```

### 4. Start Development Services (Docker)
Start only the backing services (PostgreSQL, SeaweedFS S3, Mailpit, Pgweb) inside Docker:
```bash
bun run dev:services
# or: docker compose -f docker-compose.dev.yml up -d
```

| Service | Port | Description |
|---|---|---|
| **PostgreSQL 16** | `5432` | Relational database (Drizzle ORM & Better Auth) |
| **SeaweedFS S3** | `8333` | S3-compatible asset & media storage |
| **SeaweedFS Master UI** | `9333` | Filer & volume topology dashboard |
| **Mailpit Web UI** | `8025` | Local email inspector (`http://localhost:8025`) |
| **Mailpit SMTP** | `1025` | Local SMTP port for email captures |
| **Pgweb UI** | `8081` | Web-based PostgreSQL browser (`http://localhost:8081`) |

Run database migrations and seed data:
```bash
bun run db:migrate
bun run db:seed
```

### 5. Local App Development (Host)
Run all Next.js applications and the Hono API server directly on host with Bun:
```bash
bun dev
```

Or run individual apps:
```bash
bun --filter admin dev
bun --filter hotel-resort-web dev
bun --filter api dev
```

To stop development Docker services:
```bash
bun run dev:services:down
```

### 6. Quality & Type Checking
```bash
# Typecheck all 13 packages and apps in parallel
bun run check-types

# Biome format & lint check
bun run check
bun run format
```

## Production & Self-Hosting

### 1. Core Production Applications
Spin up the core production stack (PostgreSQL, Valkey, SeaweedFS, Cloudflare Tunnel, API, and Next.js Web Apps):

```bash
docker compose up -d --build
```

### 2. Observability & Telemetry Stack (Loki, Tempo, Prometheus, Grafana)
Boot the single pane of glass observability suite:

```bash
docker compose --profile observability up -d
```

| Service | Port | Description |
|---|---|---|
| **Grafana** | `3105` | Unified dashboards, Loki logs, Tempo traces, and alerting |
| **Prometheus** | `9090` | Time-series metrics engine (scrapes API `/metrics`) |
| **Loki** | `3100` | Log aggregation engine with 30-day retention |
| **Tempo** | `3200` | Distributed tracing storage (OTLP `:4318` HTTP / `:4317` gRPC) |
| **Promtail** | — | Automatic Docker container log shipper |

### 3. Privacy-First Analytics Stack (Plausible Community Edition)
Spin up self-hosted, lightweight GDPR-compliant web analytics:

```bash
docker compose --profile analytics up -d
```

| Service | Port | Description |
|---|---|---|
| **Plausible Analytics** | `8000` | Web analytics dashboard & script endpoint |
| **Plausible ClickHouse** | `8123` | High-throughput analytics event store |

### 4. Telegram Instant Alerting
Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`. Grafana will automatically fire instant alert notifications on:
- API 5xx error spikes (> 5% error rate)
- Service downtime (target unreachable)
- High latency (p95 > 1.5s)


