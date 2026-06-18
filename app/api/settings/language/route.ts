import { withAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { users } from "@repo/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

export const PUT = withAuth(async (req, ctx) => {
	try {
		const body = await req.json();
		const { language } = z
			.object({ language: z.enum(["bn", "en"]) })
			.parse(body);

		const userId = ctx.user.id;

		await db
			.update(users)
			.set({
				languagePreference: language,
				updatedAt: new Date(),
			})
			.where(eq(users.id, userId));

		return NextResponse.json({
			success: true,
			language,
		});
	} catch (e) {
		return handleApiError(e);
	}
});
