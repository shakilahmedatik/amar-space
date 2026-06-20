import { db } from "@/lib/db";
import { analyticsEvents } from "@repo/db";
import { analyticsEventSchema } from "@repo/shared/portal";
import { NextResponse } from "next/server";

export const POST = async (req: Request) => {
	try {
		const body = await req.json();
		const parsed = analyticsEventSchema.safeParse(body);

		if (parsed.success) {
			db.insert(analyticsEvents)
				.values({
					eventName: parsed.data.event,
					flatSlug: parsed.data.flatSlug,
					userAgent: parsed.data.userAgent,
					metadata: parsed.data.metadata ?? null,
				})
				.catch(() => {
					// Silently discard insertion errors
				});
		}
	} catch {
		// Silently discard parsing errors
	}

	return NextResponse.json({ success: true });
};
