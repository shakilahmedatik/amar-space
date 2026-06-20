import { useTranslation } from "@/lib/i18n";
import { BookOpen } from "lucide-react";

interface BuildingInfoProps {
	rules: string | null;
}

export function BuildingInfo({ rules }: BuildingInfoProps) {
	const { t } = useTranslation();

	if (!rules || rules.trim().length === 0) {
		return null;
	}

	return (
		<section aria-label="বিল্ডিং নিয়মাবলী" className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<BookOpen className="h-5 w-5 text-brand-blue-deep" aria-hidden />
				<h2 className="text-lg font-semibold text-ink">
					{t("buildings.buildingRules") || "বিল্ডিং নিয়মাবলী"}
				</h2>
			</div>

			<div
				className="building-rules-content max-h-96 overflow-y-auto rounded-lg border border-hairline bg-white p-4 text-base leading-relaxed text-ink"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Building rules are admin-configured rich text HTML stored in the database
				dangerouslySetInnerHTML={{ __html: rules }}
			/>
		</section>
	);
}
