import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Database } from "@omniheaven/db";
import { desc, eq, ilike, inArray, or, schema } from "@omniheaven/db";
import { env } from "@omniheaven/env";
import { ErrorCode, throwDomainError } from "@omniheaven/errors";

/**
 * Scoped, signed session for the public resident portal.
 *
 * The portal is unauthenticated by design, so a flat number alone must never
 * grant access. Residents exchange "flat identifier + access code" for a
 * short-lived HMAC token which is then sent as the `x-portal-token` header.
 */
const PORTAL_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

export interface PortalScope {
  flatId: string;
  organizationId: string;
}

export interface PortalSession extends PortalScope {
  flatNumber: string;
}

interface PortalTokenPayload {
  /** flat id */
  f: string;
  /** organization id */
  o: string;
  /** expiry (unix seconds) */
  e: number;
  /** nonce, prevents identical tokens for the same scope */
  n: string;
}

function sign(payload: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

function invalidPortalSession(): never {
  throwDomainError(
    ErrorCode.AUTH_UNAUTHORIZED,
    "Portal session is invalid or has expired. Please sign in again.",
  );
  throw new Error("unreachable");
}

function invalidCredentials(): never {
  // Deliberately generic: never reveal whether the flat exists or the code was
  // wrong, otherwise the endpoint becomes a flat-number oracle.
  throwDomainError(ErrorCode.FLAT_NOT_FOUND, "Invalid flat identifier or access code");
  throw new Error("unreachable");
}

export function issuePortalToken(scope: PortalScope): { token: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + PORTAL_TOKEN_TTL_SECONDS;
  const payload: PortalTokenPayload = {
    f: scope.flatId,
    o: scope.organizationId,
    e: expiresAt,
    n: randomBytes(8).toString("hex"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${encoded}.${sign(encoded)}`, expiresAt };
}

export function verifyPortalToken(token: string | null | undefined): PortalScope {
  if (!token) invalidPortalSession();

  const separator = token.lastIndexOf(".");
  if (separator <= 0) invalidPortalSession();

  const encoded = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!safeEqual(sign(encoded), signature)) invalidPortalSession();

  let payload: PortalTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    invalidPortalSession();
  }

  if (
    !payload?.f ||
    !payload?.o ||
    typeof payload.e !== "number" ||
    payload.e < Math.floor(Date.now() / 1000)
  ) {
    invalidPortalSession();
  }

  return { flatId: payload.f, organizationId: payload.o };
}

function normalizeFlatIdentifier(input: string): string {
  return input
    .trim()
    .replace(/^flat-/i, "")
    .toUpperCase();
}

/**
 * Exchange a flat identifier + access code for a scoped portal token.
 * Codes are stored on the renter record and compared in constant time.
 */
export async function authenticatePortal(
  db: Database,
  flatSlug: string,
  accessCode: string,
): Promise<{ token: string; expiresAt: number; flatNumber: string; organizationId: string }> {
  const identifier = flatSlug.trim();
  const code = accessCode.trim().toUpperCase();

  // Flat numbers may contain letters, digits and dashes (e.g. "Suite-201").
  if (!identifier || !code || !/^[a-z0-9-]+$/i.test(identifier)) {
    invalidCredentials();
  }

  const candidates = await db.query.flats.findMany({
    where: or(
      eq(schema.flats.id, identifier),
      ilike(schema.flats.flatNumber, identifier),
      ilike(schema.flats.flatNumber, normalizeFlatIdentifier(identifier)),
    ),
    with: {
      rentalContracts: {
        where: inArray(schema.rentalContracts.status, ["active", "notice_period"]),
        with: { renter: true },
        orderBy: [desc(schema.rentalContracts.createdAt)],
      },
    },
  });

  for (const flat of candidates) {
    const contract = flat.rentalContracts.find((candidate) => {
      const stored = candidate.renter?.accessCode?.trim().toUpperCase();
      return Boolean(stored) && safeEqual(stored as string, code);
    });

    if (contract) {
      const session = issuePortalToken({
        flatId: flat.id,
        organizationId: flat.organizationId,
      });

      return {
        ...session,
        flatNumber: flat.flatNumber,
        organizationId: flat.organizationId,
      };
    }
  }

  invalidCredentials();
}
