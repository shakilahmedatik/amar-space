"use client";

import { Button } from "@/components/ui/button";
import { ErrorFeedback } from "@/components/ui/error-feedback";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSession } from "@/contexts/session-context";
import {
	useAssignIssue,
	useIssue,
	useUpdateIssueStatus,
} from "@/hooks/use-issues";
import { BASE_URL } from "@/lib/api";
import type { IssueStatus } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

/** Valid status transitions for issues */
const VALID_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
	open: ["in_progress", "resolved", "closed"],
	in_progress: ["resolved", "closed"],
	resolved: ["closed"],
	closed: [],
};

/**
 * Issue detail page — /issues/[id]
 * Shows issue info with status, assignee, resolution notes.
 * Owner/Manager can update status and assign.
 */
export default function IssueDetailPage() {
	const { user, role } = useSession();
	const { t } = useTranslation();
	const params = useParams();
	const _router = useRouter();
	const issueId = params.id as string;
	// Status update state
	const [showStatusForm, setShowStatusForm] = useState(false);
	const [newStatus, setNewStatus] = useState<IssueStatus | "">("");
	const [resolutionNotes, setResolutionNotes] = useState("");
	const [statusErrors, setStatusErrors] = useState<Record<string, string>>({});

	// Assignment state
	const [showAssignForm, setShowAssignForm] = useState(false);
	const [assigneeId, setAssigneeId] = useState("");
	const [assignErrors, setAssignErrors] = useState<Record<string, string>>({});

	const [successMessage, setSuccessMessage] = useState("");

	const { data: issue, isLoading, isError, error } = useIssue(issueId);
	const statusMutation = useUpdateIssueStatus(issueId);
	const assignMutation = useAssignIssue(issueId);

	// Fetch managers for assignment dropdown
	const [managers, setManagers] = useState<Array<{ id: string; name: string }>>(
		[],
	);
	// Load managers for assignment
	useEffect(() => {
		async function loadManagers() {
			try {
				const response = await fetch(
					`${BASE_URL}/api/staff?role=manager&pageSize=100`,
					{ credentials: "include" },
				);
				if (response.ok) {
					const data = await response.json();
					setManagers(data.data ?? []);
				}
			} catch {
				// Silently fail — managers list is optional
			}
		}
		if (user && (user.role === "owner" || user.role === "manager")) {
			loadManagers();
		}
	}, [user]);

	function validateStatusUpdate(): boolean {
		const newErrors: Record<string, string> = {};

		if (!newStatus) {
			newErrors.status = t("issues.statusRequired");
		}

		// Resolution notes required when marking as Resolved
		if (newStatus === "resolved" && !resolutionNotes.trim()) {
			newErrors.resolutionNotes = t("issues.resolutionNotesRequired");
		} else if (resolutionNotes.trim().length > 2000) {
			newErrors.resolutionNotes = t("issues.resolutionNotesMaxLength");
		}

		setStatusErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	}

	async function handleStatusUpdate(e: FormEvent) {
		e.preventDefault();
		if (!validateStatusUpdate()) return;

		try {
			await statusMutation.mutateAsync({
				status: newStatus as IssueStatus,
				resolutionNotes:
					newStatus === "resolved" ? resolutionNotes.trim() : undefined,
			});
			setShowStatusForm(false);
			setNewStatus("");
			setResolutionNotes("");
			setStatusErrors({});
			setSuccessMessage(t("issues.statusUpdateSuccess"));
		} catch (err) {
			setStatusErrors({
				form:
					err instanceof Error ? err.message : t("issues.statusUpdateError"),
			});
		}
	}

	async function handleAssign(e: FormEvent) {
		e.preventDefault();
		const newErrors: Record<string, string> = {};

		if (!assigneeId) {
			newErrors.assigneeId = t("issues.assigneeRequired");
		}

		if (Object.keys(newErrors).length > 0) {
			setAssignErrors(newErrors);
			return;
		}

		try {
			await assignMutation.mutateAsync({ assigneeId });
			setShowAssignForm(false);
			setAssigneeId("");
			setAssignErrors({});
			setSuccessMessage(t("issues.assignSuccess"));
		} catch (err) {
			setAssignErrors({
				form: err instanceof Error ? err.message : t("issues.assignError"),
			});
		}
	}
	const canManage =
		role === "owner" ||
		role === "manager" ||
		role === "security_guard" ||
		role === "care_taker";
	const availableTransitions = issue
		? (VALID_TRANSITIONS[issue.status] ?? [])
		: [];

	return (
		<>
			{successMessage && (
				<ErrorFeedback
					message={successMessage}
					type="success"
					visible
					onDismiss={() => setSuccessMessage("")}
				/>
			)}
			{isError && (
				<ErrorFeedback
					message={error?.message || t("issues.loadError")}
					type="error"
					visible
				/>
			)}

			<div className="mb-6">
				<Link
					href="/issues"
					className="text-sm text-steel no-underline hover:underline"
				>
					← {t("common.back")}
				</Link>
			</div>

			{isLoading ? (
				<LoadingSkeleton rows={8} showHeader />
			) : issue ? (
				<>
					{/* Issue Summary */}
					<div className="p-6 rounded-lg border border-hairline bg-canvas mb-6">
						<div className="flex items-center justify-between mb-5 flex-wrap gap-3">
							<h1 className="text-2xl font-bold text-ink">{issue.title}</h1>
							<StatusBadge status={issue.status} />
						</div>

						<div className="grid gap-4 mb-5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
							<div>
								<p className="text-xs font-medium text-steel mb-1">
									{t("issues.building")}
								</p>
								<p className="text-base text-ink">
									{issue.buildingName || "—"}
								</p>
							</div>
							<div>
								<p className="text-xs font-medium text-steel mb-1">
									{t("issues.category")}
								</p>
								<p className="text-base text-ink capitalize">
									{t(`issues.${issue.category}`)}
								</p>
							</div>
							<div>
								<p className="text-xs font-medium text-steel mb-1">
									{t("issues.priority")}
								</p>
								<StatusBadge status={issue.priority} />
							</div>
							<div>
								<p className="text-xs font-medium text-steel mb-1">
									{t("issues.assignee")}
								</p>
								<p className="text-base text-ink">
									{issue.assigneeName || t("issues.unassigned")}
								</p>
							</div>
							<div>
								<p className="text-xs font-medium text-steel mb-1">
									{t("issues.createdAt")}
								</p>
								<p className="text-base text-ink">
									{new Date(issue.createdAt).toLocaleDateString()}
								</p>
							</div>
							{issue.resolvedAt && (
								<div>
									<p className="text-xs font-medium text-steel mb-1">
										{t("issues.resolvedAt")}
									</p>
									<p className="text-base text-ink">
										{new Date(issue.resolvedAt).toLocaleDateString()}
									</p>
								</div>
							)}
						</div>

						{/* Description */}
						<div className="mb-4">
							<p className="text-xs font-medium text-steel mb-2">
								{t("issues.description")}
							</p>
							<p className="text-[0.9375rem] text-charcoal leading-relaxed whitespace-pre-wrap">
								{issue.description}
							</p>
						</div>

						{/* Resolution Notes */}
						{issue.resolutionNotes && (
							<div className="p-4 rounded-md bg-success-bg border border-success-text/30">
								<p className="text-xs font-semibold text-success-text mb-2">
									{t("issues.resolutionNotes")}
								</p>
								<p className="text-sm text-success-text leading-relaxed whitespace-pre-wrap">
									{issue.resolutionNotes}
								</p>
							</div>
						)}

						{/* Attachments */}
						{issue.attachments && issue.attachments.length > 0 && (
							<div>
								<p className="text-xs font-medium text-steel mb-3">
									{t("issues.photoUpload")}
								</p>
								<div className="flex flex-wrap gap-3">
									{issue.attachments.map((att) => (
										<a
											key={att.id}
											href={att.fileUrl}
											target="_blank"
											rel="noreferrer"
											className="group relative w-28 h-28 rounded-lg overflow-hidden border border-hairline bg-surface hover:shadow-md transition-shadow"
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
													View
												</span>
											</div>
										</a>
									))}
								</div>
							</div>
						)}
					</div>

					{/* Action Controls */}
					{canManage && (
						<div className="p-6 rounded-lg border border-hairline bg-canvas mb-6">
							<h2 className="text-lg font-semibold text-ink mb-4">
								{t("issues.actions")}
							</h2>

							<div className="flex gap-3 flex-wrap mb-4">
								{/* Status Update Button */}
								{availableTransitions.length > 0 && (
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setShowStatusForm(!showStatusForm);
											setShowAssignForm(false);
										}}
										className={`min-h-11 rounded-full border-brand-blue-deep text-brand-blue-deep hover:bg-brand-blue-200/30 ${showStatusForm ? "bg-surface" : "bg-transparent"}`}
									>
										{t("issues.updateStatus")}
									</Button>
								)}

								{/* Assign Button */}
								{issue.status !== "closed" && (
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setShowAssignForm(!showAssignForm);
											setShowStatusForm(false);
										}}
										className={`min-h-11 rounded-full border-brand-blue text-brand-blue hover:bg-brand-blue-200/30 ${showAssignForm ? "bg-surface" : "bg-transparent"}`}
									>
										{t("issues.assignIssue")}
									</Button>
								)}
							</div>

							{/* Status Update Form */}
							{showStatusForm && (
								<div className="p-4 rounded-lg border border-hairline bg-surface mb-4">
									{statusErrors.form && (
										<p className="text-xs text-error-text mb-3">
											{statusErrors.form}
										</p>
									)}
									<form onSubmit={handleStatusUpdate}>
										<div className="mb-4">
											<label
												htmlFor="new-status"
												className="block text-sm font-medium text-charcoal mb-1.5"
											>
												{t("issues.newStatus")}
											</label>
											<select
												id="new-status"
												value={newStatus}
												onChange={(e) =>
													setNewStatus(e.target.value as IssueStatus | "")
												}
												className={`w-full px-3 py-2 text-sm rounded-md border min-h-11 bg-canvas text-ink ${statusErrors.status ? "border-error-text" : "border-hairline"}`}
											>
												<option value="">{t("issues.selectStatus")}</option>
												{availableTransitions.map((s) => {
													const statusLabels: Record<IssueStatus, string> = {
														open: t("issues.statusOpen"),
														in_progress: t("issues.statusInProgress"),
														resolved: t("issues.statusResolved"),
														closed: t("issues.statusClosed"),
													};
													return (
														<option key={s} value={s}>
															{statusLabels[s]}
														</option>
													);
												})}
											</select>
											{statusErrors.status && (
												<p className="text-xs text-error-text mt-1">
													{statusErrors.status}
												</p>
											)}
										</div>

										{/* Resolution Notes (required when resolving) */}
										{newStatus === "resolved" && (
											<div className="mb-4">
												<label
													htmlFor="resolution-notes"
													className="block text-sm font-medium text-charcoal mb-1.5"
												>
													{t("issues.resolutionNotes")}{" "}
													<span className="text-error-text">*</span>
												</label>
												<textarea
													id="resolution-notes"
													value={resolutionNotes}
													onChange={(e) => setResolutionNotes(e.target.value)}
													maxLength={2000}
													rows={4}
													placeholder={t("issues.resolutionNotesPlaceholder")}
													className={`w-full px-3 py-2 text-sm rounded-md border min-h-25 resize-y font-sans ${statusErrors.resolutionNotes ? "border-error-text" : "border-hairline"}`}
												/>
												{statusErrors.resolutionNotes && (
													<p className="text-xs text-error-text mt-1">
														{statusErrors.resolutionNotes}
													</p>
												)}
												<p className="text-xs text-steel mt-1">
													{resolutionNotes.length}/2000
												</p>
											</div>
										)}

										<div className="flex gap-2 justify-end">
											<Button
												type="button"
												variant="outline"
												onClick={() => {
													setShowStatusForm(false);
													setNewStatus("");
													setResolutionNotes("");
													setStatusErrors({});
												}}
												className="min-h-11 rounded-full border-hairline text-charcoal"
											>
												{t("common.cancel")}
											</Button>
											<Button
												type="submit"
												disabled={statusMutation.isPending}
												className="min-h-11 rounded-full bg-primary text-on-primary font-semibold disabled:opacity-60"
											>
												{statusMutation.isPending
													? t("common.loading")
													: t("issues.updateStatus")}
											</Button>
										</div>
									</form>
								</div>
							)}

							{/* Assignment Form */}
							{showAssignForm && (
								<div className="p-4 rounded-lg border border-hairline bg-surface">
									{assignErrors.form && (
										<p className="text-xs text-error-text mb-3">
											{assignErrors.form}
										</p>
									)}
									<form onSubmit={handleAssign}>
										<div className="mb-4">
											<label
												htmlFor="assignee-select"
												className="block text-sm font-medium text-charcoal mb-1.5"
											>
												{t("issues.selectAssignee")}
											</label>
											<select
												id="assignee-select"
												value={assigneeId}
												onChange={(e) => setAssigneeId(e.target.value)}
												className={`w-full px-3 py-2 text-sm rounded-md border min-h-11 bg-canvas text-ink ${assignErrors.assigneeId ? "border-error-text" : "border-hairline"}`}
											>
												<option value="">{t("issues.selectAssignee")}</option>
												{managers.map((m) => (
													<option key={m.id} value={m.id}>
														{m.name}
													</option>
												))}
											</select>
											{assignErrors.assigneeId && (
												<p className="text-xs text-error-text mt-1">
													{assignErrors.assigneeId}
												</p>
											)}
										</div>

										<div className="flex gap-2 justify-end">
											<Button
												type="button"
												variant="outline"
												onClick={() => {
													setShowAssignForm(false);
													setAssigneeId("");
													setAssignErrors({});
												}}
												className="min-h-11 rounded-full border-hairline text-charcoal"
											>
												{t("common.cancel")}
											</Button>
											<Button
												type="submit"
												disabled={assignMutation.isPending}
												className="min-h-11 rounded-full bg-brand-blue text-on-dark font-semibold disabled:opacity-60"
											>
												{assignMutation.isPending
													? t("common.loading")
													: t("issues.assignIssue")}
											</Button>
										</div>
									</form>
								</div>
							)}
						</div>
					)}
				</>
			) : null}
		</>
	);
}
