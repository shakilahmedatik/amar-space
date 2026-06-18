"use client";

import { trackEvent } from "@/lib/analytics";
import { useTranslation } from "@/lib/i18n";
import {
	type EmergencyContact,
	sortContacts,
} from "@/lib/sort-emergency-contacts";
import { AlertTriangle, Building2, MapPin, Phone } from "lucide-react";

interface EmergencyContactsProps {
	contacts: EmergencyContact[];
	flatSlug: string;
}

export function EmergencyContacts({
	contacts,
	flatSlug,
}: EmergencyContactsProps) {
	const { t } = useTranslation();
	const sortedContacts = sortContacts(contacts ?? []);

	function handleCallClick(contact: EmergencyContact) {
		trackEvent("Emergency Contact Clicked", flatSlug, {
			contactName: contact.name,
			contactRole: contact.role,
		});
	}

	return (
		<section
			id="emergency-contacts"
			aria-label="জরুরি যোগাযোগ"
			className="flex flex-col gap-3"
		>
			<div className="flex items-center gap-2">
				<AlertTriangle className="h-5 w-5 text-warning-text" aria-hidden />
				<h2 className="text-base font-bold text-ink">
					{t("buildings.emergencyContacts") || "জরুরি যোগাযোগ"}
				</h2>
			</div>

			{sortedContacts.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-hairline bg-surface p-8 text-center">
					<AlertTriangle className="h-10 w-10 text-steel" aria-hidden="true" />
					<p className="text-sm text-steel">
						{t("buildings.noEmergencyContacts") || "কোনো জরুরি যোগাযোগ নেই"}
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-2">
					{sortedContacts.map((contact) => (
						<div
							key={`${contact.name}-${contact.role}-${contact.phone ?? "no-phone"}`}
							className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-white p-3 shadow-sm"
						>
							<div className="flex items-center gap-3">
								<div
									className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
										contact.type === "building"
											? "bg-brand-blue-200"
											: "bg-warning-bg"
									}`}
								>
									{contact.type === "building" ? (
										<Building2
											className="h-4 w-4 text-brand-blue-deep"
											aria-hidden="true"
										/>
									) : (
										<MapPin
											className="h-4 w-4 text-warning-text"
											aria-hidden="true"
										/>
									)}
								</div>
								<div className="flex flex-col">
									<span className="text-sm font-semibold text-ink">
										{contact.name}
									</span>
									<span className="text-xs text-steel">{contact.role}</span>
								</div>
							</div>

							{contact.phone && (
								<a
									href={`tel:${contact.phone}`}
									onClick={() => handleCallClick(contact)}
									className="inline-flex min-h-[48px] min-w-[48px] items-center gap-1.5 rounded-lg bg-brand-blue-deep px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-blue-deep/90 active:bg-brand-blue-deep/80 cursor-pointer"
									aria-label={`${contact.name} কে কল করুন`}
								>
									<Phone className="h-3.5 w-3.5" aria-hidden="true" />
									<span>{t("buildings.call") || "কল করুন"}</span>
								</a>
							)}
						</div>
					))}
				</div>
			)}
		</section>
	);
}
