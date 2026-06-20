"use client";

import { Button } from "@/components/ui/button";
import { ErrorFeedback } from "@/components/ui/error-feedback";
import { FileUpload } from "@/components/ui/file-upload";
import { FormField, FormInput } from "@/components/ui/form-field";
import { useCreateMaintenanceRequest } from "@/hooks/use-maintenance";
import { useSession } from "@/contexts/session-context";
import { useBuildings } from "@/hooks/use-flats";
import { useBuildingFlats } from "@/hooks/use-buildings";
import { ApiError } from "@/lib/api";
import type { MaintenancePriority } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

/**
 * New maintenance request form — /maintenance/new
 * Accessible by Renter role.
 * Title (5-200 chars), description (10-2000 chars), priority, file attachments.
 */
export default function NewMaintenanceRequestPage() {
	const { t } = useTranslation();
	const router = useRouter();
	// Form state
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<MaintenancePriority | "">("");
	const [buildingId, setBuildingId] = useState("");
	const [flatId, setFlatId] = useState("");
	const [attachments, setAttachments] = useState<File[]>([]);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [successMessage, setSuccessMessage] = useState("");

	const { role } = useSession();
	const isStaff = role !== "renter" && role !== undefined;

	const { data: buildingsData, isLoading: isLoadingBuildings } = useBuildings();
	const { data: flatsData, isLoading: isLoadingFlats } = useBuildingFlats(
		buildingId,
		1,
		100,
	);

	const createMutation = useCreateMaintenanceRequest();
	function validate(): boolean {
		const newErrors: Record<string, string> = {};

		if (!title.trim()) {
			newErrors.title = t("maintenance.titleRequired");
		} else if (title.trim().length < 5) {
			newErrors.title = t("maintenance.titleMinLength");
		} else if (title.trim().length > 200) {
			newErrors.title = t("maintenance.titleMaxLength");
		}

		if (!description.trim()) {
			newErrors.description = t("maintenance.descriptionRequired");
		} else if (description.trim().length < 10) {
			newErrors.description = t("maintenance.descriptionMinLength");
		} else if (description.trim().length > 2000) {
			newErrors.description = t("maintenance.descriptionMaxLength");
		}

		if (!priority) {
			newErrors.priority = t("maintenance.priorityRequired");
		}

		if (isStaff && !buildingId) {
			newErrors.buildingId = t("maintenance.buildingRequired", {
				defaultValue: "Building is required",
			});
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!validate()) return;

		try {
			await createMutation.mutateAsync({
				title: title.trim(),
				description: description.trim(),
				priority: priority as MaintenancePriority,
				attachments: attachments.length > 0 ? attachments : undefined,
				buildingId: isStaff ? buildingId : undefined,
				flatId: isStaff && flatId ? flatId : undefined,
			});
			setSuccessMessage(t("maintenance.createSuccess"));
			// Redirect after short delay
			setTimeout(() => {
				router.push("/maintenance");
			}, 1500);
		} catch (err) {
			if (err instanceof ApiError && err.details && err.details.length > 0) {
				const backendErrors: Record<string, string> = {};
				const formLevelErrors: string[] = [];
				for (const detail of err.details) {
					// Map field errors to our state if applicable
					if (["title", "description", "priority"].includes(detail.field)) {
						backendErrors[detail.field] = detail.message;
					} else {
						// Collect unmapped errors (e.g. buildingId validation)
						formLevelErrors.push(detail.message);
					}
				}
				setErrors({
					...backendErrors,
					...(formLevelErrors.length > 0 && {
						form: formLevelErrors.join(" • "),
					}),
				});
			} else {
				setErrors({
					form:
						err instanceof Error ? err.message : t("maintenance.createError"),
				});
			}
		}
	}
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

			<div className="mb-6">
				<Link
					href="/maintenance"
					className="text-sm text-steel no-underline hover:underline"
				>
					← {t("common.back")}
				</Link>
			</div>

			<div className="p-6 rounded-xl border border-hairline bg-canvas max-w-[640px]">
				<h1 className="text-2xl font-bold text-ink mb-6">
					{t("maintenance.createRequest")}
				</h1>

				{errors.form && (
					<p className="text-sm text-error-text mb-4 px-3 py-3 rounded-md bg-error-bg">
						{errors.form}
					</p>
				)}

				<form onSubmit={handleSubmit}>
					{/* Title */}
					<div className="mb-5">
						<FormField
							label={t("maintenance.requestTitle")}
							required
							error={errors.title}
							htmlFor="request-title"
						>
							<FormInput
								id="request-title"
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								hasError={!!errors.title}
								maxLength={200}
								placeholder={t("maintenance.requestTitle")}
							/>
						</FormField>
					</div>

					{/* Description */}
					<div className="mb-5">
						<FormField
							label={t("maintenance.description")}
							required
							error={errors.description}
							htmlFor="request-description"
						>
							<textarea
								id="request-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								maxLength={2000}
								rows={5}
								placeholder={t("maintenance.description")}
								className={[
									"w-full px-3 py-2 text-sm rounded-md border min-h-11 resize-y font-[inherit]",
									errors.description
										? "border-error-text bg-error-bg"
										: "border-hairline bg-canvas",
								].join(" ")}
							/>
						</FormField>
						<p className="text-xs text-steel mt-1">{description.length}/2000</p>
					</div>

					{/* Priority */}
					<div className="mb-5">
						<FormField
							label={t("maintenance.priority")}
							required
							error={errors.priority}
							htmlFor="request-priority"
						>
							<select
								id="request-priority"
								value={priority}
								onChange={(e) =>
									setPriority(e.target.value as MaintenancePriority | "")
								}
								className={[
									"w-full px-3 py-2 text-sm rounded-md border min-h-11 bg-canvas",
									errors.priority ? "border-error-text" : "border-hairline",
								].join(" ")}
							>
								<option value="">{t("maintenance.selectPriority")}</option>
								<option value="low">{t("maintenance.low")}</option>
								<option value="medium">{t("maintenance.medium")}</option>
								<option value="high">{t("maintenance.high")}</option>
								<option value="urgent">{t("maintenance.urgent")}</option>
							</select>
						</FormField>
					</div>

					{/* Building Selection (Staff only) */}
					{isStaff && (
						<div className="mb-5">
							<FormField
								label={t("maintenance.building", { defaultValue: "Building" })}
								required
								error={errors.buildingId}
								htmlFor="request-building"
							>
								<select
									id="request-building"
									value={buildingId}
									onChange={(e) => {
										setBuildingId(e.target.value);
										setFlatId(""); // Reset flat selection
									}}
									disabled={isLoadingBuildings}
									className={[
										"w-full px-3 py-2 text-sm rounded-md border min-h-11 bg-canvas",
										errors.buildingId ? "border-error-text" : "border-hairline",
									].join(" ")}
								>
									<option value="">
										{isLoadingBuildings
											? t("common.loading", { defaultValue: "Loading..." })
											: t("maintenance.selectBuilding", {
													defaultValue: "Select a building",
												})}
									</option>
									{buildingsData?.data.map((b) => (
										<option key={b.id} value={b.id}>
											{b.name}
										</option>
									))}
								</select>
							</FormField>
						</div>
					)}

					{/* Flat Selection (Staff only, optional) */}
					{isStaff && buildingId && (
						<div className="mb-5">
							<FormField
								label={t("maintenance.flat", {
									defaultValue: "Flat (Optional)",
								})}
								htmlFor="request-flat"
							>
								<select
									id="request-flat"
									value={flatId}
									onChange={(e) => setFlatId(e.target.value)}
									disabled={isLoadingFlats}
									className="w-full px-3 py-2 text-sm rounded-md border min-h-11 bg-canvas border-hairline"
								>
									<option value="">
										{isLoadingFlats
											? t("common.loading", { defaultValue: "Loading..." })
											: t("maintenance.selectFlat", {
													defaultValue: "Select a flat (optional)",
												})}
									</option>
									{flatsData?.data.map((f) => (
										<option key={f.id} value={f.id}>
											{f.flatNumber}
										</option>
									))}
								</select>
							</FormField>
						</div>
					)}

					{/* File Attachments */}
					<div className="mb-6">
						<label
							htmlFor="file-attachments"
							className="block text-sm font-medium text-charcoal mb-2"
						>
							{t("maintenance.fileAttachments")}
						</label>
						<FileUpload
							onFilesSelected={setAttachments}
							maxFiles={5}
							disabled={createMutation.isPending}
						/>
					</div>

					{/* Submit */}
					<div className="flex gap-3 justify-end">
						<Button asChild variant="outline" className="rounded-full min-h-11">
							<Link href="/maintenance">{t("common.cancel")}</Link>
						</Button>
						<Button
							type="submit"
							disabled={createMutation.isPending}
							className="rounded-full min-h-11 bg-primary text-on-primary font-semibold"
						>
							{createMutation.isPending
								? t("common.loading")
								: t("common.submit")}
						</Button>
					</div>
				</form>
			</div>
		</>
	);
}
