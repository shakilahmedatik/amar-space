import { db, validateConnection } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
	const startTime = Date.now();
	let dbStatus: "connected" | "disconnected" = "disconnected";
	let dbLatencyMs: number | null = null;
	let dbError: string | null = null;

	try {
		const dbCheckStart = Date.now();
		await validateConnection(db);
		dbLatencyMs = Date.now() - dbCheckStart;
		dbStatus = "connected";
	} catch (error) {
		dbError = error instanceof Error ? error.message : "Unknown database error";
	}

	const status = dbStatus === "connected" ? "ok" : "degraded";
	const responseTime = Date.now() - startTime;

	const response = {
		status,
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		responseTime: `${responseTime}ms`,
		checks: {
			database: {
				status: dbStatus,
				latency: dbLatencyMs !== null ? `${dbLatencyMs}ms` : null,
				error: dbError,
			},
		},
	};

	const statusCode = status === "ok" ? 200 : 503;
	return NextResponse.json(response, { status: statusCode });
}
