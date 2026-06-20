"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorFeedback } from "@/components/ui/error-feedback";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSession } from "@/contexts/session-context";
import { useBuildings } from "@/hooks/use-buildings";
import {
	useDeactivateStaff,
	useDeleteStaff,
	useStaff,
} from "@/hooks/use-staff";
import type { StaffMember } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import { useState } from "react";

const ROLE_BADGE_COLORS: Record<string, string> = {
	manager: "bg-blue-100 text-blue-800 border-blue-200",
	security_guard: "bg-amber-100 text-amber-800 border-amber-200",
	care_taker: "bg-green-100 text-green-800 border-green-200",
};

const ROLE_LABELS: Record<string, { bn: string; en: string }> = {
	manager: { bn: "ম্যানেজার", en: "Manager" },
	security_guard: { bn: "সিকিউরিটি গার্ড", en: "Security Guard" },
	care_taker: { bn: "কেয়ার টেকার", en: "Care Taker" },
};

export default function StaffPage() {
	const { role } = useSession();
	const { t, locale } = useTranslation();
	const [page, setPage] = useState(1);
	const [roleFilter, setRoleFilter] = useState<string | undefined>();
	const [deactivateTarget, setDeactivateTarget] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	const { data, isLoading, isError, error } = useStaff(page, 20, roleFilter);
	const { data: buildingsData } = useBuildings(1, 100);
	const deactivateMutation = useDeactivateStaff();
	const deleteMutation = useDeleteStaff();

	const isOwner = role === "owner";

	const buildingMap = new Map(
		(buildingsData?.data ?? []).map((b) => [b.id, b.name]),
	);

	const columns: DataTableColumn<StaffMember>[] = [
		{
			key: "name",
			header: t("common.name") || "Name",
			render: (row) => (
				<Link
					href={`/staff/${row.id}`}
					className="text-brand-blue-deep font-medium no-underline hover:underline"
				>
					{row.name}
				</Link>
			),
		},
		{
			key: "email",
			header: t("auth.email"),
			render: (row) => <span className="text-steel">{row.email}</span>,
		},
		{
			key: "role",
			header: t("common.role") || "Role",
			render: (row) => {
				const colors = ROLE_BADGE_COLORS[row.role] ?? "";
				const label =
					locale === "bn"
						? (ROLE_LABELS[row.role]?.bn ?? row.role)
						: (ROLE_LABELS[row.role]?.en ?? row.role);
				return (
					<Badge
						variant="outline"
						className={`rounded-full font-medium ${colors}`}
					>
						{label}
					</Badge>
				);
			},
		},
		{
			key: "buildings",
			header: t("nav.buildings"),
			render: (row) => {
				const names = row.buildingIds
					.map((id) => buildingMap.get(id))
					.filter(Boolean);
				return (
					<span className="text-sm text-steel">
						{names.length > 0 ? names.join(", ") : "—"}
					</span>
				);
			},
		},
		{
			key: "status",
			header: t("common.status") || "Status",
			render: (row) =>
				row.isActive ? (
					<StatusBadge status="active" />
				) : (
					<StatusBadge status="inactive" />
				),
			width: "100px",
		},
		{
			key: "actions",
			header: t("flats.actions"),
			render: (row) => (
				<div className="flex gap-2">
					<Button
						asChild
						variant="outline"
						size="sm"
						className="rounded-full text-xs h-8 cursor-pointer"
					>
						<Link href={`/staff/${row.id}`}>{t("common.edit")}</Link>
					</Button>
					{row.isActive && (
						<Button
							variant="outline"
							size="sm"
							className="rounded-full text-xs h-8 text-error-text border-error-text cursor-pointer"
							onClick={() => setDeactivateTarget(row.id)}
						>
							{t("staff.deactivate") || "Deactivate"}
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						className="rounded-full text-xs h-8 text-error-text border-error-text cursor-pointer"
						onClick={() => setDeleteTarget(row.id)}
					>
						{t("common.delete") || "Delete"}
					</Button>
				</div>
			),
			width: "180px",
		},
	];

	return (
		<>
			{isError && (
				<ErrorFeedback
					message={error?.message || "Could not load staff data"}
					type="error"
					visible
				/>
			)}

			<div className="flex items-center justify-between mb-6 flex-wrap gap-4">
				<h1 className="text-2xl font-bold text-ink">
					{t("staff.title") || "Staff Management"}
				</h1>

				<div className="flex gap-3 items-center">
					<select
						value={roleFilter ?? ""}
						onChange={(e) => {
							setRoleFilter(e.target.value || undefined);
							setPage(1);
						}}
						className="rounded-md border border-hairline min-h-11 px-3 bg-white text-ink text-sm"
					>
						<option value="">{locale === "bn" ? "সব রোল" : "All Roles"}</option>
						<option value="manager">
							{locale === "bn" ? "ম্যানেজার" : "Manager"}
						</option>
						<option value="security_guard">
							{locale === "bn" ? "সিকিউরিটি গার্ড" : "Security Guard"}
						</option>
						<option value="care_taker">
							{locale === "bn" ? "কেয়ার টেকার" : "Care Taker"}
						</option>
					</select>

					{isOwner && (
						<Button
							asChild
							className="rounded-full min-h-11 bg-primary text-on-primary font-semibold"
						>
							<Link href="/staff/new">
								{t("staff.createStaff") || "Add Staff"}
							</Link>
						</Button>
					)}
				</div>
			</div>

			{isLoading ? (
				<LoadingSkeleton rows={8} showHeader />
			) : (
				<DataTable<StaffMember>
					columns={columns}
					data={data?.data ?? []}
					getRowKey={(row) => row.id}
					pagination={
						data
							? { total: data.total, page: data.page, pageSize: data.pageSize }
							: undefined
					}
					onPageChange={setPage}
					loading={isLoading}
					emptyMessage={t("staff.noStaff") || "No staff members found"}
				/>
			)}

			<ConfirmDialog
				open={!!deactivateTarget}
				onClose={() => setDeactivateTarget(null)}
				title={t("staff.deactivateConfirmTitle") || "Deactivate Staff Member"}
				description={
					t("staff.deactivateConfirmDescription") ||
					"This staff member will no longer be able to log in. You can reactivate them later."
				}
				confirmLabel={t("staff.deactivate") || "Deactivate"}
				onConfirm={async () => {
					if (deactivateTarget) {
						await deactivateMutation.mutateAsync(deactivateTarget);
						setDeactivateTarget(null);
					}
				}}
			/>

			<ConfirmDialog
				open={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
				title={
					t("staff.deleteConfirmTitle") || "Permanently Delete Staff Member"
				}
				description={
					t("staff.deleteConfirmDescription") ||
					"This action permanently deletes this staff member and all associated data. It cannot be undone."
				}
				confirmLabel={t("common.delete") || "Delete"}
				onConfirm={async () => {
					if (deleteTarget) {
						await deleteMutation.mutateAsync(deleteTarget);
						setDeleteTarget(null);
					}
				}}
			/>
		</>
	);
}
