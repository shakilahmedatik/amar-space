/**
 * Core API fetch utility for AmarSpace.
 * Provides a single BASE_URL constant with fallback and a server-side warning
 * when NEXT_PUBLIC_API_URL is not configured.
 */

// Emit a warning on the server side when the env var is missing so developers
// notice the misconfiguration at build/startup time rather than at runtime.
if (typeof window === "undefined" && !process.env.NEXT_PUBLIC_API_URL) {
	console.warn(
		"[AmarSpace] NEXT_PUBLIC_API_URL is not set — falling back to http://localhost:3001",
	);
}

export const BASE_URL =
	typeof window !== "undefined"
		? ""
		: (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001");

export class ApiError extends Error {
	public status?: number;
	public details?: any[];
	constructor(message: string, status?: number, details?: any[]) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.details = details;
	}
}

/**
 * Generic fetch wrapper with error handling.
 * All requests include credentials (session cookie) and default JSON headers.
 */
export async function apiFetch<T>(
	path: string,
	options?: RequestInit,
): Promise<T> {
	const headers = new Headers(options?.headers);

	// Automatically attach x-portal-request header when fetching from a flat portal page
	if (
		typeof window !== "undefined" &&
		window.location.pathname.startsWith("/portal/")
	) {
		headers.set("x-portal-request", "true");
	}

	// Only set Content-Type to JSON when body is plain data (not FormData/blob)
	if (
		options?.body &&
		typeof options.body === "string" &&
		!headers.has("Content-Type")
	) {
		headers.set("Content-Type", "application/json");
	}

	const response = await fetch(`${BASE_URL}${path}`, {
		...options,
		credentials: "include",
		headers,
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({
			message: "Request failed",
		}));
		throw new ApiError(
			error.message || `HTTP ${response.status}`,
			response.status,
			error.details,
		);
	}

	if (response.status === 204) {
		const empty: any = null;
		return empty;
	}

	return response.json();
}
