import { AppError, RateLimitError } from "@repo/shared/errors";
import { NextResponse } from "next/server";
import { z } from "zod";

export function handleApiError(e: unknown) {
	if (e instanceof z.ZodError) {
		return NextResponse.json(
			{ error: "Bad Request", message: e.issues },
			{ status: 400 },
		);
	}
	if (e instanceof RateLimitError) {
		return NextResponse.json(
			{ error: "Too Many Requests", message: e.message },
			{ status: 429 },
		);
	}
	if (e instanceof AppError) {
		return NextResponse.json(
			{ error: e.name, message: e.message, details: e.details },
			{ status: e.statusCode },
		);
	}
	if (e instanceof Error) {
		const statusCode =
			"statusCode" in e && typeof e.statusCode === "number"
				? e.statusCode
				: undefined;
		return NextResponse.json(
			{ error: "Internal Server Error", message: e.message },
			{ status: statusCode || 500 },
		);
	}
	return NextResponse.json(
		{ error: "Internal Server Error", message: "An unknown error occurred" },
		{ status: 500 },
	);
}
