"use client";

import { cn } from "@/lib/utils";
import type {
	EmergencyContact,
	PortalPanelType,
	PortalRenterData,
} from "../types";
import { BillsSection } from "./sections/bills-section";
import { ContactsSection } from "./sections/contacts-section";
import { IssuesSection } from "./sections/issues-section";
import { NoticesSection } from "./sections/notices-section";
import { ProfileSection } from "./sections/profile-section";
import { RulesSection } from "./sections/rules-section";

interface PortalOccupiedViewProps {
	flatSlug: string;
	className?: string;
	activePanel: PortalPanelType;
	portalData: PortalRenterData;
	emergencyContacts?: EmergencyContact[];
	rules?: string | null;
}

export function PortalOccupiedView({
	flatSlug,
	className,
	activePanel,
	portalData,
	emergencyContacts = [],
	rules = null,
}: PortalOccupiedViewProps) {
	return (
		<div className={cn("flex flex-col gap-6", className)}>
			<div className="transition-all duration-200">
				{activePanel === "notices" && <NoticesSection flatSlug={flatSlug} />}

				{activePanel === "contacts" && (
					<ContactsSection contacts={emergencyContacts} flatSlug={flatSlug} />
				)}

				{activePanel === "rules" && rules && <RulesSection rules={rules} />}

				{activePanel === "issues" && (
					<IssuesSection
						flatSlug={flatSlug}
						buildingId={portalData.flat.buildingId}
					/>
				)}

				{activePanel === "profile" && (
					<ProfileSection portalData={portalData} />
				)}

				{activePanel === "bills" && <BillsSection portalData={portalData} />}
			</div>
		</div>
	);
}
