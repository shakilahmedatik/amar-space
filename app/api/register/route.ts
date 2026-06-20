import { handleApiError } from "@/lib/error-handler";
import { registerUser } from "@/lib/services/registration";
import { RateLimitError } from "@repo/shared/errors";
import type { ApiErrorResponse } from "@repo/shared/types";
import { registerSchema } from "@repo/shared/validation";
import { type NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
	attempts: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip: string): void {
	const now = Date.now();
	const entry = rateLimitStore.get(ip);

	if (!entry) {
		rateLimitStore.set(ip, { attempts: [now] });
		return;
	}

	entry.attempts = entry.attempts.filter(
		(timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
	);

	if (entry.attempts.length >= RATE_LIMIT_MAX) {
		throw new RateLimitError(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
	}

	entry.attempts.push(now);
}

// Cleanup task — guard against HMR re-evaluation leaking duplicate intervals
const globalForCleanup = globalThis as unknown as {
	__rateLimitCleanupInterval?: ReturnType<typeof setInterval>;
};

if (globalForCleanup.__rateLimitCleanupInterval) {
	clearInterval(globalForCleanup.__rateLimitCleanupInterval);
}

globalForCleanup.__rateLimitCleanupInterval = setInterval(
	() => {
		const now = Date.now();
		for (const [ip, entry] of rateLimitStore.entries()) {
			entry.attempts = entry.attempts.filter(
				(timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
			);
			if (entry.attempts.length === 0) {
				rateLimitStore.delete(ip);
			}
		}
	},
	5 * 60 * 1000,
);

export async function POST(request: NextRequest) {
	try {
		const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";

		checkRateLimit(ip);

		const body = await request.json();
		const { email, password } = registerSchema.parse(body);

		const result = await registerUser(
			{ email, password },
			ip,
			request.headers.get("user-agent") || "",
		);

		if (result.sessionError) {
			const response: ApiErrorResponse = {
				requestId: crypto.randomUUID(),
				statusCode: 201,
				error: "Session Creation Failed",
				message:
					"Account created successfully but session could not be established. Please sign in manually.",
			};
			return NextResponse.json(
				{
					...response,
					user: result.user,
					session: null,
				},
				{ status: 201 },
			);
		}

		return NextResponse.json(
			{
				user: result.user,
				session: result.session,
			},
			{ status: 201 },
		);
	} catch (error: unknown) {
		return handleApiError(error);
	}
}
