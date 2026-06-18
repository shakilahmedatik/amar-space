"use client";

import { Megaphone } from "lucide-react";
import { usePortalNotices } from "../../hooks/use-portal-notices";
import { NoticeBoard } from "./notice-board";

interface NoticeBoardSectionProps {
	flatSlug: string;
}

export function NoticeBoardSection({ flatSlug }: NoticeBoardSectionProps) {
	const { notices, isLoading } = usePortalNotices(flatSlug);

	if (isLoading) {
		return (
			<div className="flex flex-col gap-3 animate-pulse">
				<div className="flex items-center gap-2">
					<Megaphone className="h-5 w-5 text-steel" />
					<div className="h-5 w-24 bg-surface rounded" />
				</div>
				<div className="flex flex-col gap-2">
					{[1, 2].map((i) => (
						<div
							key={i}
							className="h-16 rounded-lg bg-surface border border-hairline"
						/>
					))}
				</div>
			</div>
		);
	}

	return <NoticeBoard notices={notices} flatSlug={flatSlug} />;
}
