import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Runtime
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

    // PostgreSQL Database (Drizzle ORM)
    DATABASE_URL: z
      .string()
      .url()
      .default("postgresql://omniheaven:omniheaven_secret_pass@localhost:5432/omniheaven_prod"),
    DB_POOL_SIZE: z.coerce.number().int().positive().default(20),
    DB_IDLE_TIMEOUT: z.coerce.number().int().positive().default(20),
    DB_CONNECTION_TIMEOUT: z.coerce.number().int().positive().default(10),

    // Better Auth
    BETTER_AUTH_SECRET: z.string().min(16).default("development_secret_32_characters_minimum_auth"),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
    AUTH_URL: z.string().url().optional(),
    AUTH_TRUSTED_ORIGINS: z
      .string()
      .default(
        "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004",
      ),
    COOKIE_DOMAIN: z.string().optional(),

    // In-Memory Cache & Rate Limiting (Valkey 8 / Redis)
    REDIS_URL: z.string().url().default("redis://localhost:6379"),

    // S3 Object Storage (SeaweedFS dev / AWS S3 / Cloudflare R2 prod)
    S3_ENDPOINT: z.string().url().default("http://localhost:8333"),
    S3_REGION: z.string().default("us-east-1"),
    S3_ACCESS_KEY_ID: z.string().default("omniheaven_seaweed_access"),
    S3_SECRET_ACCESS_KEY: z.string().default("omniheaven_seaweed_secret"),
    S3_BUCKET: z.string().default("omniheaven-assets"),

    // SMTP Email Delivery (Mailpit dev / SMTP prod)
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().default(1025),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().email().default("noreply@omniheaven.com"),
    SMTP_SECURE: z.coerce.boolean().default(false),

    // Payment Gateway Stubs & APIs
    PAYSTATION_MERCHANT_ID: z.string().optional(),
    PAYSTATION_API_KEY: z.string().optional(),
    PAYSTATION_IS_LIVE: z.coerce.boolean().default(false),

    BKASH_APP_KEY: z.string().optional(),
    BKASH_APP_SECRET: z.string().optional(),
    BKASH_USERNAME: z.string().optional(),
    BKASH_PASSWORD: z.string().optional(),

    NAGAD_MERCHANT_ID: z.string().optional(),
    NAGAD_PUBLIC_KEY: z.string().optional(),
    NAGAD_PRIVATE_KEY: z.string().optional(),

    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    // Observability, Error Tracking & Analytics
    SENTRY_DSN: z.string().optional(),
    SENTRY_ENVIRONMENT: z.string().default("development"),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().default("http://localhost:4318"),
    PROMETHEUS_METRICS_ENABLED: z.coerce.boolean().default(true),
    PLAUSIBLE_DOMAIN: z.string().default("omniheaven.com"),
    PLAUSIBLE_HOST: z.string().url().default("http://localhost:8000"),
  },
  runtimeEnv: {
    ...process.env,
    AUTH_URL: process.env.AUTH_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || process.env.AUTH_BASE_URL,
  },
  emptyStringAsUndefined: true,
});

export type Env = typeof env;
