"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorFeedback } from "@/components/ui/error-feedback";
import { FormField, FormInput } from "@/components/ui/form-field";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useSession } from "@/contexts/session-context";
import { useBuildings } from "@/hooks/use-buildings";
import { useCreateNoticeTemplate } from "@/hooks/use-notice-templates";
import {
	useDeleteNotice,
	useNotice,
	useToggleNoticePin,
	useUpdateNotice,
} from "@/hooks/use-notices";
import type { NoticeTargetAudience } from "@/lib/api-client";
import { fetchFlats } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

/**
 * Notice detail page — /notices/[id]
 * Shows notice content with edit/delete (author or Owner) and pin/unpin toggle.
 */
export default function NoticeDetailPage() {
	const { user, role } = useSession();
	const { t } = useTranslation();
	const params = useParams();
	const router = useRouter();
	const noticeId = params.id as string;
	// Edit state
	const [isEditing, setIsEditing] = useState(false);
	const [editTitle, setEditTitle] = useState("");
	const [editBody, setEditBody] = useState("");
	const [editAudience, setEditAudience] = useState<NoticeTargetAudience | "">(
		"",
	);
	const [editBuildingId, setEditBuildingId] = useState("");
	const [editFlatId, setEditFlatId] = useState("");
	const [editErrors, setEditErrors] = useState<Record<string, string>>({});

	// Flat options for editing
	const [flatOptions, setFlatOptions] = useState<
		Array<{ id: string; flatNumber: string }>
	>([]);
	const [loadingFlats, setLoadingFlats] = useState(false);

	// Delete confirmation
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	const [successMessage, setSuccessMessage] = useState("");
	const [saveTemplateName, setSaveTemplateName] = useState("");
	const [showSaveTemplate, setShowSaveTemplate] = useState(false);

	const { data: notice, isLoading, isError, error } = useNotice(noticeId);
	const updateMutation = useUpdateNotice(noticeId);
	const deleteMutation = useDeleteNotice(noticeId);
	const pinMutation = useToggleNoticePin(noticeId);
	const createTemplateMutation = useCreateNoticeTemplate();
	const { data: buildingsData } = useBuildings(1, 100);
	// Load flats when editing with specific_flat audience
	useEffect(() => {
		async function loadFlats() {
			if (editAudience === "specific_flat" && editBuildingId) {
				setLoadingFlats(true);
				try {
					const response = await fetchFlats({
						buildingId: editBuildingId,
						pageSize: 100,
					});
					setFlatOptions(
						(response.data ?? []).map((f) => ({
							id: f.id,
							flatNumber: f.flatNumber,
						})),
					);
				} catch {
					setFlatOptions([]);
				} finally {
					setLoadingFlats(false);
				}
			}
		}
		loadFlats();
	}, [editAudience, editBuildingId]);

	function startEditing() {
		if (!notice) return;
		setEditTitle(notice.title);
		setEditBody(notice.body);
		setEditAudience(notice.targetAudience);
		setEditBuildingId(notice.targetBuildingId || "");
		setEditFlatId(notice.targetFlatId || "");
		setEditErrors({});
		setIsEditing(true);
	}

	function cancelEditing() {
		setIsEditing(false);
		setEditErrors({});
	}

	function validateEdit(): boolean {
		const newErrors: Record<string, string> = {};

		if (!editTitle.trim()) {
			newErrors.title = t("notices.titleRequired");
		} else if (editTitle.trim().length > 200) {
			newErrors.title = t("notices.titleMaxLength");
		}

		if (!editBody.trim()) {
			newErrors.body = t("notices.bodyRequired");
		} else if (editBody.trim().length > 5000) {
			newErrors.body = t("notices.bodyMaxLength");
		}

		if (!editAudience) {
			newErrors.targetAudience = t("notices.audienceRequired");
		}

		if (editAudience === "specific_building" && !editBuildingId) {
			newErrors.targetBuildingId = t("notices.buildingRequired");
		}

		if (editAudience === "specific_flat") {
			if (!editBuildingId) {
				newErrors.targetBuildingId = t("notices.buildingRequired");
			}
			if (!editFlatId) {
				newErrors.targetFlatId = t("notices.flatRequired");
			}
		}

		setEditErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	}

	async function handleUpdate(e: FormEvent) {
		e.preventDefault();
		if (!validateEdit()) return;

		try {
			await updateMutation.mutateAsync({
				title: editTitle.trim(),
				body: editBody.trim(),
				targetAudience: editAudience as NoticeTargetAudience,
				targetBuildingId:
					editAudience === "specific_building" ||
					editAudience === "specific_flat"
						? editBuildingId
						: null,
				targetFlatId: editAudience === "specific_flat" ? editFlatId : null,
			});
			setIsEditing(false);
			setSuccessMessage(t("notices.updateSuccess"));
		} catch (err) {
			setEditErrors({
				form: err instanceof Error ? err.message : t("notices.updateError"),
			});
		}
	}

	async function handleDelete() {
		try {
			await deleteMutation.mutateAsync();
			setSuccessMessage(t("notices.deleteSuccess"));
			setTimeout(() => {
				router.push("/notices");
			}, 1500);
		} catch (err) {
			setSuccessMessage("");
			setEditErrors({
				form: err instanceof Error ? err.message : t("notices.deleteError"),
			});
		}
	}

	async function handleTogglePin() {
		try {
			await pinMutation.mutateAsync();
			setSuccessMessage(t("notices.pinSuccess"));
		} catch (err) {
			setEditErrors({
				form: err instanceof Error ? err.message : t("notices.pinError"),
			});
		}
	}
	async function handleSaveTemplate() {
		if (!notice || !saveTemplateName.trim()) return;

		try {
			await createTemplateMutation.mutateAsync({
				name: saveTemplateName.trim(),
				title: notice.title,
				body: notice.body,
				targetAudience: notice.targetAudience,
			});
			setShowSaveTemplate(false);
			setSaveTemplateName("");
			setSuccessMessage(t("notices.templateSaved"));
		} catch (err) {
			setEditErrors({
				form:
					err instanceof Error ? err.message : t("notices.templateSaveError"),
			});
		}
	}

	const isExpired =
		notice?.expiresAt && new Date(notice.expiresAt) < new Date();

	// Owner can edit/delete any notice; Manager can edit/delete only their own
	const canEdit =
		role === "owner" || (role === "manager" && notice?.authorId === user?.id);
	// Owner and Manager can pin/unpin
	const canPin = role === "owner" || role === "manager";

	const audienceLabels: Record<NoticeTargetAudience, string> = {
		all_renters: t("notices.allRenters"),
		specific_building: t("notices.specificBuilding"),
		specific_flat: t("notices.specificFlat"),
		managers_only: t("notices.managersOnly"),
	};

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
					message={error?.message || t("notices.loadError")}
					type="error"
					visible
				/>
			)}

			<div className="mb-6">
				<Link
					href="/notices"
					className="text-sm text-steel no-underline hover:underline"
				>
					← {t("common.back")}
				</Link>
			</div>

			{isLoading ? (
				<LoadingSkeleton rows={8} showHeader />
			) : notice ? (
				<>
					{/* Notice Content */}
					{!isEditing ? (
						<Card className="mb-6">
							<CardContent className="p-6">
								<div className="flex items-center justify-between mb-5 flex-wrap gap-3">
									<div className="flex items-center gap-3">
										<h1 className="text-2xl font-bold text-ink-strong">
											{notice.title}
										</h1>
										{notice.isPinned && (
											<span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-warning-bg text-warning-text">
												📌 {t("notices.pinned")}
											</span>
										)}
										{isExpired && (
											<span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-error-bg text-error-text">
												{t("notices.expired")}
											</span>
										)}
									</div>
								</div>

								<div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] mb-5">
									<div>
										<p className="text-xs font-medium text-steel mb-1">
											{t("notices.targetAudience")}
										</p>
										<p className="text-base text-ink">
											{audienceLabels[notice.targetAudience]}
										</p>
									</div>
									{notice.targetBuildingName && (
										<div>
											<p className="text-xs font-medium text-steel mb-1">
												{t("notices.building")}
											</p>
											<p className="text-base text-ink">
												{notice.targetBuildingName}
											</p>
										</div>
									)}
									{notice.targetFlatNumber && (
										<div>
											<p className="text-xs font-medium text-steel mb-1">
												{t("notices.flat")}
											</p>
											<p className="text-base text-ink">
												{notice.targetFlatNumber}
											</p>
										</div>
									)}
									<div>
										<p className="text-xs font-medium text-steel mb-1">
											{t("notices.author")}
										</p>
										<p className="text-base text-ink">
											{notice.authorName || "—"}
										</p>
									</div>
									<div>
										<p className="text-xs font-medium text-steel mb-1">
											{t("notices.createdAt")}
										</p>
										<p className="text-base text-ink">
											{new Date(notice.createdAt).toLocaleDateString()}
										</p>
									</div>
									{notice.expiresAt && (
										<div>
											<p className="text-xs font-medium text-steel mb-1">
												{t("notices.expiresAt")}
											</p>
											<p className="text-base text-ink">
												{new Date(notice.expiresAt).toLocaleDateString()}
											</p>
										</div>
									)}
								</div>

								{/* Notice Body */}
								<div className="mb-4">
									<p className="text-xs font-medium text-steel mb-2">
										{t("notices.body")}
									</p>
									<p className="text-[0.9375rem] text-charcoal leading-relaxed whitespace-pre-wrap">
										{notice.body}
									</p>
								</div>
							</CardContent>
						</Card>
					) : (
						/* Edit Form */
						<Card className="mb-6 max-w-[640px]">
							<CardContent className="p-6">
								<h2 className="text-xl font-semibold text-ink-strong mb-5">
									{t("notices.editNotice")}
								</h2>

								{editErrors.form && (
									<p className="text-sm text-error-text mb-4 px-3 py-3 rounded-md bg-error-bg">
										{editErrors.form}
									</p>
								)}

								<form onSubmit={handleUpdate}>
									{/* Title */}
									<div className="mb-5">
										<FormField
											label={t("notices.noticeTitle")}
											required
											error={editErrors.title}
											htmlFor="edit-title"
										>
											<FormInput
												id="edit-title"
												type="text"
												value={editTitle}
												onChange={(e) => setEditTitle(e.target.value)}
												hasError={!!editErrors.title}
												maxLength={200}
												placeholder={t("notices.titlePlaceholder")}
											/>
										</FormField>
										<p className="text-xs text-steel mt-1">
											{editTitle.length}/200
										</p>
									</div>

									{/* Body */}
									<div className="mb-5">
										<FormField
											label={t("notices.body")}
											required
											error={editErrors.body}
											htmlFor="edit-body"
										>
											<textarea
												id="edit-body"
												value={editBody}
												onChange={(e) => setEditBody(e.target.value)}
												maxLength={5000}
												rows={8}
												placeholder={t("notices.bodyPlaceholder")}
												className={[
													"w-full px-3 py-2 text-sm rounded-md border min-h-11 resize-y font-[inherit]",
													editErrors.body
														? "border-error-text bg-error-bg"
														: "border-hairline bg-canvas",
												].join(" ")}
											/>
										</FormField>
										<p className="text-xs text-steel mt-1">
											{editBody.length}/5000
										</p>
									</div>

									{/* Target Audience */}
									<div className="mb-5">
										<FormField
											label={t("notices.targetAudience")}
											required
											error={editErrors.targetAudience}
											htmlFor="edit-audience"
										>
											<select
												id="edit-audience"
												value={editAudience}
												onChange={(e) => {
													setEditAudience(
														e.target.value as NoticeTargetAudience | "",
													);
													setEditBuildingId("");
													setEditFlatId("");
													setFlatOptions([]);
												}}
												className={[
													"w-full px-3 py-2 text-sm rounded-md border min-h-11 bg-canvas",
													editErrors.targetAudience
														? "border-error-text"
														: "border-hairline",
												].join(" ")}
											>
												<option value="">{t("notices.selectAudience")}</option>
												<option value="all_renters">
													{t("notices.allRenters")}
												</option>
												<option value="specific_building">
													{t("notices.specificBuilding")}
												</option>
												<option value="specific_flat">
													{t("notices.specificFlat")}
												</option>
												<option value="managers_only">
													{t("notices.managersOnly")}
												</option>
											</select>
										</FormField>
									</div>

									{/* Building Selection */}
									{(editAudience === "specific_building" ||
										editAudience === "specific_flat") && (
										<div className="mb-5">
											<FormField
												label={t("notices.building")}
												required
												error={editErrors.targetBuildingId}
												htmlFor="edit-building"
											>
												<select
													id="edit-building"
													value={editBuildingId}
													onChange={(e) => {
														setEditBuildingId(e.target.value);
														setEditFlatId("");
														setFlatOptions([]);
													}}
													className={[
														"w-full px-3 py-2 text-sm rounded-md border min-h-11 bg-canvas",
														editErrors.targetBuildingId
															? "border-error-text"
															: "border-hairline",
													].join(" ")}
												>
													<option value="">
														{t("notices.selectBuilding")}
													</option>
													{(buildingsData?.data ?? []).map((b) => (
														<option key={b.id} value={b.id}>
															{b.name}
														</option>
													))}
												</select>
											</FormField>
										</div>
									)}

									{/* Flat Selection */}
									{editAudience === "specific_flat" && editBuildingId && (
										<div className="mb-5">
											<FormField
												label={t("notices.flat")}
												required
												error={editErrors.targetFlatId}
												htmlFor="edit-flat"
											>
												<select
													id="edit-flat"
													value={editFlatId}
													onChange={(e) => setEditFlatId(e.target.value)}
													disabled={loadingFlats}
													className={[
														"w-full px-3 py-2 text-sm rounded-md border min-h-11 bg-canvas",
														editErrors.targetFlatId
															? "border-error-text"
															: "border-hairline",
													].join(" ")}
												>
													<option value="">{t("notices.selectFlat")}</option>
													{flatOptions.map((f) => (
														<option key={f.id} value={f.id}>
															{f.flatNumber}
														</option>
													))}
												</select>
											</FormField>
										</div>
									)}

									{/* Submit/Cancel */}
									<div className="flex gap-3 justify-end">
										<Button
											type="button"
											variant="outline"
											onClick={cancelEditing}
											className="min-h-11 rounded-full"
										>
											{t("common.cancel")}
										</Button>
										<Button
											type="submit"
											disabled={updateMutation.isPending}
											className="min-h-11 rounded-full bg-primary text-on-primary font-semibold"
										>
											{updateMutation.isPending
												? t("common.loading")
												: t("common.save")}
										</Button>
									</div>
								</form>
							</CardContent>
						</Card>
					)}

					{/* Action Controls */}
					{(canEdit || canPin) && !isEditing && (
						<Card className="mb-6">
							<CardContent className="p-6">
								<h2 className="text-lg font-semibold text-ink-strong mb-4">
									{t("notices.actions")}
								</h2>

								{editErrors.form && (
									<p className="text-xs text-error-text mb-3 px-2 py-2 rounded-md bg-error-bg">
										{editErrors.form}
									</p>
								)}

								<div className="flex gap-3 flex-wrap">
									{/* Pin/Unpin Toggle */}
									{canPin && (
										<Button
											type="button"
											variant="outline"
											onClick={handleTogglePin}
											disabled={pinMutation.isPending}
											className="min-h-11 rounded-full border-brand-orange text-brand-orange hover:bg-warning-bg"
										>
											{notice.isPinned ? t("notices.unpin") : t("notices.pin")}
										</Button>
									)}

									{/* Edit Button */}
									{canEdit && (
										<Button
											type="button"
											variant="outline"
											onClick={startEditing}
											className="min-h-11 rounded-full border-brand-blue-deep text-brand-blue-deep hover:bg-brand-blue-200"
										>
											{t("common.edit")}
										</Button>
									)}

									{/* Delete Button */}
									{canEdit && (
										<Button
											type="button"
											variant="outline"
											onClick={() => setShowDeleteConfirm(true)}
											className="min-h-11 rounded-full border-error-text text-error-text hover:bg-error-bg"
										>
											{t("common.delete")}
										</Button>
									)}

									{/* Save as Template */}
									<Button
										type="button"
										variant="outline"
										onClick={() => setShowSaveTemplate(true)}
										className="min-h-11 rounded-full border-brand-blue-deep text-brand-blue-deep hover:bg-brand-blue-200"
									>
										{t("notices.saveAsTemplate")}
									</Button>
								</div>

								{/* Save as Template Inline Form */}
								{showSaveTemplate && (
									<div className="mt-4 pt-4 border-t border-hairline">
										<p className="text-sm font-medium text-ink-strong mb-2">
											{t("notices.saveTemplateDescription")}
										</p>
										<div className="flex gap-3 items-end">
											<div className="flex-1">
												<FormField
													label={t("notices.templateName")}
													required
													htmlFor="template-name"
												>
													<FormInput
														id="template-name"
														type="text"
														value={saveTemplateName}
														onChange={(e) =>
															setSaveTemplateName(e.target.value)
														}
														placeholder={t("notices.templateNamePlaceholder")}
													/>
												</FormField>
											</div>
											<Button
												type="button"
												onClick={handleSaveTemplate}
												disabled={
													createTemplateMutation.isPending ||
													!saveTemplateName.trim()
												}
												className="min-h-11 rounded-full bg-primary text-on-primary font-semibold"
											>
												{createTemplateMutation.isPending
													? t("common.loading")
													: t("common.save")}
											</Button>
											<Button
												type="button"
												variant="outline"
												onClick={() => {
													setShowSaveTemplate(false);
													setSaveTemplateName("");
												}}
												className="min-h-11 rounded-full"
											>
												{t("common.cancel")}
											</Button>
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{/* Delete Confirmation Dialog */}
					<ConfirmDialog
						open={showDeleteConfirm}
						title={t("notices.deleteConfirmTitle")}
						description={t("notices.deleteConfirmDescription")}
						onConfirm={handleDelete}
						onClose={() => setShowDeleteConfirm(false)}
						loading={deleteMutation.isPending}
					/>
				</>
			) : null}
		</>
	);
}
