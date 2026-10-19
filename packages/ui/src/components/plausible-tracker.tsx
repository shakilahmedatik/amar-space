export interface PlausibleTrackerProps {
  /**
   * The domain registered in Plausible Analytics (e.g. 'omniheaven.com' or custom hotel domain).
   * Defaults to NEXT_PUBLIC_PLAUSIBLE_DOMAIN.
   */
  domain?: string;
  /**
   * Self-hosted Plausible base URL (e.g. 'http://localhost:8000' or 'https://analytics.omniheaven.com').
   * Defaults to NEXT_PUBLIC_PLAUSIBLE_HOST.
   */
  host?: string;
  /**
   * Optional custom script path if using an extension (e.g. hash routing or outbound links).
   * Defaults to '/js/script.js'.
   */
  scriptPath?: string;
}

/**
 * Lightweight, privacy-first, GDPR-compliant Plausible Analytics tracker component.
 * Can be dropped directly into root layouts across marketing, guest web, and admin apps.
 */
export function PlausibleTracker({
  domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "omniheaven.com",
  host = process.env.NEXT_PUBLIC_PLAUSIBLE_HOST || "http://localhost:8000",
  scriptPath = "/js/script.js",
}: PlausibleTrackerProps) {
  // Normalize host URL (remove trailing slash)
  const cleanHost = host.replace(/\/+$/, "");
  const scriptUrl = `${cleanHost}${scriptPath.startsWith("/") ? scriptPath : `/${scriptPath}`}`;

  return <script defer data-domain={domain} src={scriptUrl} id="plausible-analytics-script" />;
}

/**
 * Helper to trigger custom goals and revenue conversion events in self-hosted Plausible.
 */
export function trackPlausibleEvent(
  eventName: string,
  options?: {
    props?: Record<string, string | number | boolean>;
    callback?: () => void;
  },
): void {
  if (
    typeof window !== "undefined" &&
    (window as unknown as { plausible?: (name: string, opts?: unknown) => void }).plausible
  ) {
    (window as unknown as { plausible: (name: string, opts?: unknown) => void }).plausible(
      eventName,
      options,
    );
  }
}
