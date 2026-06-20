import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { emergencyContacts, flatSlugs, registrationRequests } from "@repo/db";
import { isValidFlatSlug } from "@repo/shared/portal";
import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const STATUS_MAP: Record<string, "AVAILABLE" | "OCCUPIED" | "MAINTENANCE"> = {
	vacant: "AVAILABLE",
	occupied: "OCCUPIED",
	under_maintenance: "MAINTENANCE",
};

const formatR2Url = (key: string | null | undefined) => {
	if (!key) return null;
	if (key.startsWith("http://") || key.startsWith("https://")) return key;
	const r2BaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
	return `${r2BaseUrl}/${key}`;
};

export const GET = async (
	_req: Request,
	params: { params: Promise<{ slug: string }> },
) => {
	const { slug } = await params.params;

	try {
		if (!isValidFlatSlug(slug)) {
			return NextResponse.json(
				{ error: "INVALID_SLUG", message: "অবৈধ QR কোড" },
				{ status: 400 },
			);
		}

		const flatSlugRecord = await db.query.flatSlugs.findFirst({
			where: eq(flatSlugs.slug, slug),
			with: { flat: { with: { building: true } } },
		});

		if (!flatSlugRecord?.flat?.building) {
			return NextResponse.json(
				{ error: "FLAT_NOT_FOUND", message: "ফ্ল্যাটটি পাওয়া যায়নি" },
				{ status: 404 },
			);
		}

		const { flat } = flatSlugRecord;
		const building = flat.building;

		const contacts = await db
			.select({
				name: emergencyContacts.name,
				role: emergencyContacts.role,
				phone: emergencyContacts.phone,
				type: emergencyContacts.type,
				order: emergencyContacts.sortOrder,
			})
			.from(emergencyContacts)
			.where(eq(emergencyContacts.buildingId, building.id))
			.orderBy(asc(emergencyContacts.sortOrder));

		const pendingRegistration = await db.query.registrationRequests.findFirst({
			where: and(
				eq(registrationRequests.flatId, flat.id),
				eq(registrationRequests.status, "PENDING_APPROVAL"),
			),
			columns: { id: true },
		});

		const portalStatus = STATUS_MAP[flat.status] ?? "AVAILABLE";

		return NextResponse.json({
			building: {
				name: building.name,
				logoUrl: formatR2Url(building.logoUrl),
				coverImageUrl: formatR2Url(building.coverImageUrl),
				whatsappGroupLink: building.whatsappGroupLink ?? null,
				managerPhone: building.managerPhone ?? null,
				rules: building.rules ?? null,
			},
			flat: {
				flatNumber: flat.flatNumber,
				status: portalStatus,
				slug,
			},
			emergencyContacts: contacts.map((c) => ({
				name: c.name,
				role: c.role,
				phone: c.phone ?? null,
				type: c.type as "building" | "nearby",
				order: c.order,
			})),
			hasPendingRegistration: !!pendingRegistration,
		});
	} catch (e) {
		return handleApiError(e);
	}
};
