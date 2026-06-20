import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { users } from "@repo/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const GET = withAuth(async (_req, ctx) => {
	const userId = ctx.user.id;

	try {
		const user = await db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: {
				id: true,
				email: true,
				name: true,
				role: true,
				phone: true,
				languagePreference: true,
				createdAt: true,
			},
		});

		if (!user) {
			return NextResponse.json(
				{ error: "Not Found", message: "User not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({
			id: user.id,
			email: user.email,
			name: user.name,
			role: user.role,
			phone: user.phone,
			languagePreference: user.languagePreference || "bn",
			createdAt: user.createdAt,
		});
	} catch (e) {
		return handleApiError(e);
	}
});
