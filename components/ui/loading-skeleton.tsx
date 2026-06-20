"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
	rows?: number;
	rowHeight?: number;
	showHeader?: boolean;
	className?: string;
}

/** Maps common row heights to Tailwind arbitrary-value height classes */
const rowHeightClass: Record<number, string> = {
	12: "h-3",
	14: "h-3.5",
	16: "h-4",
	20: "h-5",
	24: "h-6",
	32: "h-8",
	40: "h-10",
	48: "h-12",
};

/** Maps common column counts to Tailwind grid-cols classes */
const gridColsClass: Record<number, string> = {
	1: "grid-cols-1",
	2: "grid-cols-2",
	3: "grid-cols-3",
	4: "grid-cols-4",
	5: "grid-cols-5",
	6: "grid-cols-6",
	7: "grid-cols-7",
	8: "grid-cols-8",
};

/**
 * Content placeholder skeleton during data loading.
 * Validates: Requirement 16.7
 */
export function LoadingSkeleton({
	rows = 3,
	rowHeight = 20,
	showHeader = true,
	className = "",
}: LoadingSkeletonProps) {
	const heightCls = rowHeightClass[rowHeight] ?? "h-5";

	return (
		<div
			className={cn("min-h-section-sm", className)}
			role="status"
			aria-label="Loading"
		>
			{showHeader && (
				<Skeleton className="h-6 w-2/5 bg-surface rounded-sm mb-4" />
			)}
			{Array.from({ length: rows }, (_, i) => `row-${i}`).map((id, i) => (
				<Skeleton
					key={id}
					className={cn(
						"bg-surface rounded-sm mb-3",
						heightCls,
						i === rows - 1 ? "w-3/5" : "w-full",
					)}
				/>
			))}
		</div>
	);
}

interface SkeletonTableProps {
	columns?: number;
	rows?: number;
	className?: string;
}

/**
 * Table-shaped loading skeleton for DataTable loading states.
 */
export function SkeletonTable({
	columns = 4,
	rows = 5,
	className = "",
}: SkeletonTableProps) {
	const colsCls = gridColsClass[columns] ?? "grid-cols-4";

	return (
		<div
			className={cn("min-h-section-sm", className)}
			role="status"
			aria-label="Loading table"
		>
			{/* Header row */}
			<div
				className={cn("grid gap-4 px-4 py-3 border-b border-hairline", colsCls)}
			>
				{Array.from({ length: columns }).map((_, i) => (
					<Skeleton key={`h-${i}`} className="h-4 bg-surface rounded-sm" />
				))}
			</div>
			{/* Body rows */}
			{Array.from({ length: rows }).map((_, rowIdx) => (
				<div
					key={`r-${rowIdx}`}
					className={cn(
						"grid gap-4 px-4 py-3 border-b border-hairline-soft",
						colsCls,
					)}
				>
					{Array.from({ length: columns }).map((_, colIdx) => (
						<Skeleton
							key={`c-${rowIdx}-${colIdx}`}
							className={cn(
								"h-3.5 bg-surface rounded-sm",
								colIdx === 0 ? "w-4/5" : "w-3/5",
							)}
						/>
					))}
				</div>
			))}
		</div>
	);
}
