export interface RateLimitConfig {
  /** Maximum number of allowed requests within the window */
  limit: number;
  /** Window size in seconds */
  windowSec: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed through */
  allowed: boolean;
  /** Total rate limit ceiling for this window */
  limit: number;
  /** Remaining quota in current window */
  remaining: number;
  /** Unix epoch timestamp (in seconds) when the oldest window token expires */
  reset: number;
  /** Seconds to wait before retrying (0 if allowed) */
  retryAfter: number;
}
