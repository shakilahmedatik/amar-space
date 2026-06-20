import { db } from "@/lib/db";
import { flatSlugs, portalSessions } from "@/lib/db/schema";
import { handleApiError } from "@/lib/error-handler";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const GET = async (
	req: Request,
	context: { params: Promise<{ slug: string }> },
) => {
	try {
		const { slug } = await context.params;
		const cookieStore = await cookies();
		const sessionId = cookieStore.get("portal_session")?.value;

		if (!sessionId) {
			return NextResponse.json({ valid: false });
		}

		const session = await db.query.portalSessions.findFirst({
			where: eq(portalSessions.id, sessionId),
		});

		if (!session) {
			return NextResponse.json({ valid: false });
		}

		const now = new Date();
		if (session.expiresAt && new Date(session.expiresAt) < now) {
			return NextResponse.json({ valid: false });
		}

		// Ensure the session is for this flat
		const flatSlugRecord = await db.query.flatSlugs.findFirst({
			where: eq(flatSlugs.slug, slug),
		});

		if (!flatSlugRecord || flatSlugRecord.flatId !== session.flatId) {
			return NextResponse.json({ valid: false });
		}

		return NextResponse.json({ valid: true });
	} catch (e) {
		return handleApiError(e);
	}
};
