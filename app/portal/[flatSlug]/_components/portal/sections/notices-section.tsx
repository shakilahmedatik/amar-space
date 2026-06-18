"use client";

import { NoticeBoardSection } from "../sub-components/notice-board-section";

interface NoticesSectionProps {
	flatSlug: string;
}

export function NoticesSection({ flatSlug }: NoticesSectionProps) {
	return (
		<div className="bg-canvas border border-hairline p-5 rounded-xl shadow-sm">
			<NoticeBoardSection flatSlug={flatSlug} />
		</div>
	);
}
