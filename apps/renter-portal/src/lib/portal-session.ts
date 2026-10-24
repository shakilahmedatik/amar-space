const TOKEN_KEY = "omniheaven.portal.token";
const FLAT_KEY = "omniheaven.portal.flat";

/**
 * The portal token is a short-lived, flat-scoped bearer credential. It lives in
 * sessionStorage (not localStorage) so it disappears when the tab closes, and
 * is sent as the `x-portal-token` header rather than a query parameter so it
 * never ends up in URL logs or Referer headers.
 */
export function getPortalToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function getPortalFlatNumber(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(FLAT_KEY);
}

export function setPortalSession(token: string, flatNumber: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(TOKEN_KEY, token);
  window.sessionStorage.setItem(FLAT_KEY, flatNumber);
}

export function clearPortalSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(FLAT_KEY);
}
