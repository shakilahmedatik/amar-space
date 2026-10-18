import type { RateLimitConfig } from "./types";

/**
 * Standard 6-Tier Rate Limiting Presets for omniHeaven
 */
export const RATE_LIMIT_PRESETS = {
  /** Global IP Gateway Limiter (DDoS, scraper bot protection) */
  GLOBAL_HTTP: {
    limit: 300,
    windowSec: 60,
  },
  /** Sensitive Auth / Credential Operations (Brute-force protection, OTP/SMS requests) */
  AUTH_SENSITIVE: {
    limit: 5,
    windowSec: 900, // 15 minutes
  },
  /** User Invitations (Domain 01: Core Auth & Multi-Tenancy requirement) */
  INVITATIONS: {
    limit: 10,
    windowSec: 3600, // 1 hour
  },
  /** Public Anonymous Reads (Hotel public room queries, slug resolution) */
  PUBLIC_READ: {
    limit: 120,
    windowSec: 60,
  },
  /** Standard Authenticated Mutations (Dashboard CRUD operations) */
  MUTATIONS_STANDARD: {
    limit: 60,
    windowSec: 60,
  },
  /** Heavy Bulk Operations (Bulk flat creation, batch invoice generation) */
  MUTATIONS_BULK: {
    limit: 10,
    windowSec: 300, // 5 minutes
  },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitPresetName = keyof typeof RATE_LIMIT_PRESETS;
