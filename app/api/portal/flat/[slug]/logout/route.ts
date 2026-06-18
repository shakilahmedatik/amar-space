import { db } from "@/lib/db";
import { portalSessions } from "@/lib/db/schema";
import { handleApiError } from "@/lib/error-handler";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const DELETE = async () => {
	try {
		const cookieStore = await cookies();
		const sessionId = cookieStore.get("portal_session")?.value;

		if (sessionId) {
			await db.delete(portalSessions).where(eq(portalSessions.id, sessionId));
			cookieStore.delete("portal_session");
		}

		return NextResponse.json({
			success: true,
			message: "সফলভাবে লগআউট হয়েছে",
		});
	} catch (e) {
		return handleApiError(e);
	}
};
