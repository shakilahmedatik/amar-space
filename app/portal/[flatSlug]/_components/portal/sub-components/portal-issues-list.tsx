"use client";

import { fetchPortalIssues } from "@/lib/api/portal";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Bug, CheckCircle2, Clock, Loader2 } from "lucide-react";
import Image from "next/image";
import type { PortalIssue } from "../../types";

interface PortalIssuesListProps {
	flatSlug: string;
}

const STATUS_STYLES: Record<
	string,
	{
		bgColor: string;
		textColor: string;
		borderColor: string;
		icon: React.ElementType;
		labelKey: string;
	}
> = {
	open: {
		bgColor: "bg-blue-50",
		textColor: "text-blue-700",
		borderColor: "border-blue-200",
		icon: AlertCircle,
		labelKey: "issues.statusOpen",
	},
	in_progress: {
		bgColor: "bg-amber-50",
		textColor: "text-amber-700",
		borderColor: "border-amber-200",
		icon: Clock,
		labelKey: "issues.statusInProgress",
	},
	resolved: {
		bgColor: "bg-emerald-50",
		textColor: "text-emerald-700",
		borderColor: "border-emerald-200",
		icon: CheckCircle2,
		labelKey: "issues.statusResolved",
	},
	closed: {
		bgColor: "bg-gray-50",
		textColor: "text-gray-500",
		borderColor: "border-gray-200",
		icon: CheckCircle2,
		labelKey: "issues.statusClosed",
	},
};

const CATEGORY_KEY_MAP: Record<string, string> = {
	plumbing: "issues.plumbing",
	electrical: "issues.electrical",
	structural: "issues.structural",
	cleaning: "issues.cleaning",
	security: "issues.security",
	other: "issues.other",
};

const PRIORITY_STYLES: Record<string, { className: string; labelKey: string }> =
	{
		low: { className: "bg-gray-100 text-gray-600", labelKey: "issues.low" },
		medium: {
			className: "bg-blue-100 text-blue-700",
			labelKey: "issues.medium",
		},
		high: {
			className: "bg-orange-100 text-orange-700",
			labelKey: "issues.high",
		},
		urgent: { className: "bg-red-100 text-red-700", labelKey: "issues.urgent" },
	};

export function PortalIssuesList({ flatSlug }: PortalIssuesListProps) {
	const { t } = useTranslation();
	const { data, isLoading, isError } = useQuery({
		queryKey: ["portal-issues", flatSlug],
		queryFn: () => fetchPortalIssues(flatSlug),
		retry: false,
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-5 w-5 animate-spin text-primary" />
				<span className="ml-2 text-sm text-steel">
					{t("common.loading") || "লোড হচ্ছে..."}
				</span>
			</div>
		);
	}

	if (isError || !data) {
		return (
			<p className="text-sm text-steel text-center py-6">
				{t("issues.issueListLoadError") || "সমস্যার তালিকা লোড করা যায়নি।"}
			</p>
		);
	}

	const issues = data.issues ?? [];

	if (issues.length === 0) {
		return (
			<div className="text-center py-8">
				<Bug className="h-8 w-8 text-steel mx-auto mb-2" />
				<p className="text-sm text-steel">
					{t("issues.noIssuesReported") || "কোনো সমস্যা রিপোর্ট করা হয়নি।"}
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{issues.map((issue) => (
				<IssueCard key={issue.id} issue={issue} />
			))}
		</div>
	);
}

function IssueCard({ issue }: { issue: PortalIssue }) {
	const { t } = useTranslation();
	const status =
		STATUS_STYLES[issue.status] ??
		(STATUS_STYLES.open as NonNullable<(typeof STATUS_STYLES)[string]>);
	const categoryKey = CATEGORY_KEY_MAP[issue.category];
	const category = categoryKey ? t(categoryKey) : issue.category;
	const priority =
		PRIORITY_STYLES[issue.priority] ??
		(PRIORITY_STYLES.medium as NonNullable<(typeof PRIORITY_STYLES)[string]>);
	const StatusIcon = status.icon;

	const createdDate = new Date(issue.createdAt).toLocaleDateString("bn-BD", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});

	return (
		<div
			className={cn(
				"rounded-xl border p-4 transition-colors",
				status.borderColor,
				status.bgColor,
			)}
		>
			<div className="flex items-start justify-between gap-3 mb-2">
				<h3 className="text-sm font-semibold text-ink leading-snug flex-1">
					{issue.title}
				</h3>
				<span
					className={cn(
						"inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium shrink-0",
						status.textColor,
						status.borderColor,
					)}
				>
					<StatusIcon className="h-3 w-3" />
					{t(status.labelKey)}
				</span>
			</div>

			<p className="text-xs text-steel line-clamp-2 mb-3">
				{issue.description}
			</p>

			<div className="flex items-center gap-2 flex-wrap text-xs text-steel">
				<span className="bg-white px-2 py-0.5 rounded border border-hairline">
					{category}
				</span>
				<span
					className={cn("px-2 py-0.5 rounded font-medium", priority.className)}
				>
					{t(priority.labelKey)}
				</span>
				<span className="text-steel/70">{createdDate}</span>
				{issue.assigneeName && (
					<span className="text-steel/70">
						{t("issues.assignedTo") || "দায়িত্বে"}: {issue.assigneeName}
					</span>
				)}
			</div>

			{issue.resolutionNotes && issue.status === "resolved" && (
				<div className="mt-3 pt-2 border-t border-emerald-200/60">
					<p className="text-xs text-emerald-700">
						<span className="font-semibold">
							{t("issues.resolution") || "সমাধান"}:{" "}
						</span>
						{issue.resolutionNotes}
					</p>
				</div>
			)}

			{issue.attachments && issue.attachments.length > 0 && (
				<div className="mt-2 flex gap-2 flex-wrap">
					{issue.attachments.map((att) => (
						<a
							key={att.id}
							href={att.fileUrl}
							target="_blank"
							rel="noreferrer"
							className="group relative w-28 h-28 rounded-lg overflow-hidden border border-hairline bg-surface hover:shadow-md transition-shadow cursor-pointer"
						>
							<Image
								src={att.fileUrl}
								alt={att.fileName}
								unoptimized
								width={100}
								height={100}
								className="rounded h-full w-auto object-contain"
							/>
							<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
								<span className="text-white text-xs font-medium">
									{t("issues.view") || "দেখুন"}
								</span>
							</div>
						</a>
					))}
				</div>
			)}
		</div>
	);
}
