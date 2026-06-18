"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useOwnerDashboard } from "@/hooks/use-dashboard";
import { useTranslation } from "@/lib/i18n";

/**
 * Owner Dashboard Component
 * Shows: total buildings, total flats, occupancy ratio, unpaid bills (BDT),
 * 5 recent maintenance requests, 5 recent audit log entries.
 */
export function OwnerDashboard() {
	const { t } = useTranslation();
	const { data, isLoading, isError, refetch } = useOwnerDashboard();

	if (isLoading) {
		return <DashboardSkeleton />;
	}

	if (isError || !data) {
		return (
			<div
				role="alert"
				className="p-6 bg-error-bg rounded-lg border border-error-text text-center"
			>
				<p className="text-error-text mb-4">{t("dashboard.loadError")}</p>
				<Button
					type="button"
					onClick={() => refetch()}
					className="min-h-11 rounded-full bg-primary text-on-primary font-semibold"
				>
					{t("dashboard.retry")}
				</Button>
			</div>
		);
	}

	const occupancyRatio = `${data.occupiedFlats}/${data.totalFlats}`;

	return (
		<div className="flex flex-col gap-6">
			{/* Stats Cards */}
			<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
				<StatCard
					label={t("dashboard.totalBuildings")}
					value={String(data.totalBuildings)}
				/>
				<StatCard
					label={t("dashboard.totalFlats")}
					value={String(data.totalFlats)}
				/>
				<StatCard
					label={t("dashboard.occupancyRate")}
					value={occupancyRatio}
					subtitle={t("dashboard.occupied")}
				/>
				<StatCard
					label={t("dashboard.unpaidBills")}
					value={<CurrencyDisplay amount={data.unpaidBillsTotal} large />}
				/>
			</div>

			{/* Recent Maintenance Requests */}
			<section>
				<h2 className="text-lg font-semibold mb-3 text-charcoal">
					{t("dashboard.recentMaintenance")}
				</h2>
				{data.recentMaintenance.length === 0 ? (
					<p className="text-steel text-sm">{t("maintenance.noRequests")}</p>
				) : (
					<div className="flex flex-col gap-2">
						{data.recentMaintenance.map((req) => (
							<Card
								key={req.id}
								className="bg-canvas rounded-xl border border-hairline p-6"
							>
								<CardContent className="p-0 flex items-center justify-between gap-3 flex-wrap">
									<div className="flex-1 min-w-[150px]">
										<p className="font-medium text-ink mb-1">{req.title}</p>
										<p className="text-xs text-steel">
											{req.buildingName && `${req.buildingName} • `}
											{req.flatNumber &&
												`${t("flats.flatNumber")}: ${req.flatNumber}`}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<StatusBadge status={req.priority} />
										<StatusBadge status={req.status} />
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</section>

			{/* Recent Audit Entries */}
			<section>
				<h2 className="text-lg font-semibold mb-3 text-charcoal">
					{t("dashboard.recentAudit")}
				</h2>
				{data.recentAudit.length === 0 ? (
					<p className="text-steel text-sm">{t("dashboard.noAuditEntries")}</p>
				) : (
					<div className="flex flex-col gap-2">
						{data.recentAudit.map((entry) => (
							<Card
								key={entry.id}
								className="bg-canvas rounded-xl border border-hairline p-6"
							>
								<CardContent className="p-0 flex items-center justify-between gap-3 flex-wrap">
									<div className="flex-1 min-w-[150px]">
										<p className="font-medium text-ink mb-1">{entry.action}</p>
										<p className="text-xs text-steel">
											{entry.actorName} • {entry.entityType}
										</p>
									</div>
									<span className="text-xs text-muted">
										{new Date(entry.createdAt).toLocaleDateString("bn-BD")}
									</span>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</section>
		</div>
	);
}

// --- Stat Card ---

interface StatCardProps {
	label: string;
	value: React.ReactNode;
	subtitle?: string;
}

function StatCard({ label, value, subtitle }: StatCardProps) {
	return (
		<Card className="bg-surface rounded-lg border border-hairline">
			<CardContent className="p-5">
				<p className="text-sm text-steel mb-2">{label}</p>
				<div className="text-2xl font-bold text-ink">{value}</div>
				{subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
			</CardContent>
		</Card>
	);
}

// --- Loading Skeleton ---

function DashboardSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
				{["buildings", "flats", "occupancy", "bills"].map((id) => (
					<Card
						key={id}
						className="bg-surface rounded-lg border border-hairline"
					>
						<CardContent className="p-5">
							<LoadingSkeleton rows={2} rowHeight={16} showHeader={false} />
						</CardContent>
					</Card>
				))}
			</div>
			<LoadingSkeleton rows={5} showHeader />
			<LoadingSkeleton rows={5} showHeader />
		</div>
	);
}
