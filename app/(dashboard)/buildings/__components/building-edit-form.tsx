"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import { FormField, FormInput } from "@/components/ui/form-field";
import type { Building } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n";
import { updateBuildingSchema } from "@/lib/shared/validation";
import { fileToBase64 } from "@/lib/utils/file";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = updateBuildingSchema.extend({
	buildingPhoto: z.any().optional(),
	logoPhoto: z.any().optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface BuildingEditFormProps {
	building: Building;
	onSave: (data: Record<string, unknown>) => Promise<void>;
	onCancel: () => void;
	isPending: boolean;
}

export function BuildingEditForm({
	building,
	onSave,
	onCancel,
	isPending,
}: BuildingEditFormProps) {
	const { t, locale } = useTranslation();

	const [photoPreview, setPhotoPreview] = useState<string | null>(
		building.coverImageUrl ?? null,
	);
	const [logoPreview, setLogoPreview] = useState<string | null>(
		building.logoUrl ?? null,
	);
	const [uploadError, setUploadError] = useState<{
		photo?: string;
		logo?: string;
	}>({});

	const {
		register,
		control,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: building.name,
			address: building.address,
			totalFloors: building.totalFloors ?? undefined,
			whatsappGroupLink: building.whatsappGroupLink ?? "",
			managerPhone: building.managerPhone ?? "",
			rules: building.rules ?? "",
			emergencyContacts:
				building.emergencyContacts?.map((c) => ({
					name: c.name,
					role: c.role,
					phone: c.phone ?? "",
					type: c.type,
				})) ?? [],
		},
	});

	const { fields, append, remove, update } = useFieldArray({
		control,
		name: "emergencyContacts",
	});

	async function handlePhotoSelected(files: File[]) {
		if (files.length > 0 && files[0]) {
			try {
				const base64 = await fileToBase64(files[0]);
				setValue("buildingPhoto", base64);
				setPhotoPreview(base64);
				setUploadError((prev) => ({ ...prev, photo: undefined }));
			} catch {
				setUploadError((prev) => ({ ...prev, photo: "ফাইলটি আপলোড করা যায়নি" }));
			}
		}
	}

	async function handleLogoSelected(files: File[]) {
		if (files.length > 0 && files[0]) {
			try {
				const base64 = await fileToBase64(files[0]);
				setValue("logoPhoto", base64);
				setLogoPreview(base64);
				setUploadError((prev) => ({ ...prev, logo: undefined }));
			} catch {
				setUploadError((prev) => ({
					...prev,
					logo: "লোগো ফাইলটি আপলোড করা যায়নি",
				}));
			}
		}
	}

	const onSubmit = async (data: FormValues) => {
		await onSave({
			name: data.name,
			address: data.address,
			totalFloors: data.totalFloors || null,
			whatsappGroupLink: data.whatsappGroupLink || null,
			managerPhone: data.managerPhone || null,
			rules: data.rules || null,
			buildingPhoto: data.buildingPhoto,
			logoPhoto: data.logoPhoto,
			emergencyContacts: data.emergencyContacts?.map((c) => ({
				name: c.name,
				role: c.role,
				phone: c.phone || null,
				type: c.type,
			})),
		});
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<FormField
					label={t("buildings.buildingName")}
					required
					error={errors.name?.message}
					htmlFor="edit-building-name"
				>
					<FormInput
						id="edit-building-name"
						type="text"
						{...register("name")}
						hasError={!!errors.name}
						maxLength={200}
					/>
				</FormField>
				<FormField
					label={t("buildings.totalFloors")}
					error={errors.totalFloors?.message}
					htmlFor="edit-building-floors"
				>
					<FormInput
						id="edit-building-floors"
						type="number"
						{...register("totalFloors", {
							setValueAs: (v) =>
								v === "" ? undefined : Number.parseInt(v, 10),
						})}
						hasError={!!errors.totalFloors}
						min={1}
						max={200}
					/>
				</FormField>
			</div>

			<FormField
				label={t("buildings.address")}
				required
				error={errors.address?.message}
				htmlFor="edit-building-address"
			>
				<FormInput
					id="edit-building-address"
					type="text"
					{...register("address")}
					hasError={!!errors.address}
					maxLength={500}
				/>
			</FormField>

			<FormField
				label={t("buildings.whatsappGroupLink")}
				error={errors.whatsappGroupLink?.message}
				htmlFor="edit-building-whatsapp"
			>
				<FormInput
					id="edit-building-whatsapp"
					type="text"
					placeholder={t("buildings.whatsappGroupLinkPlaceholder")}
					{...register("whatsappGroupLink")}
					hasError={!!errors.whatsappGroupLink}
					maxLength={500}
				/>
			</FormField>

			<FormField
				label={t("buildings.managerPhone")}
				error={errors.managerPhone?.message}
				htmlFor="edit-manager-phone"
			>
				<FormInput
					id="edit-manager-phone"
					type="text"
					placeholder={t("buildings.managerPhonePlaceholder")}
					{...register("managerPhone")}
					hasError={!!errors.managerPhone}
					maxLength={20}
				/>
			</FormField>

			<FormField
				label={t("buildings.buildingRules")}
				error={errors.rules?.message}
				htmlFor="edit-building-rules"
			>
				<textarea
					id="edit-building-rules"
					placeholder={t("buildings.buildingRulesPlaceholder")}
					{...register("rules")}
					className={`w-full rounded-md border min-h-25 p-3 text-sm bg-white text-ink ${errors.rules ? "border-error-text" : "border-hairline"}`}
				/>
			</FormField>

			<FormField
				label={t("buildings.buildingLogo")}
				error={uploadError.logo}
				htmlFor="edit-building-logo"
			>
				<div className="flex flex-col gap-3">
					<FileUpload
						maxFiles={1}
						onFilesSelected={handleLogoSelected}
						error={uploadError.logo}
					/>
					{logoPreview && (
						<div className="relative w-24 h-24 rounded-full overflow-hidden border border-hairline mt-2">
							<Image
								src={logoPreview}
								alt="Building Logo Preview"
								className="object-cover"
								fill
								unoptimized
							/>
							<button
								type="button"
								onClick={() => {
									setValue("logoPhoto", null);
									setLogoPreview(null);
								}}
								className="absolute inset-0 bg-black/60 text-white flex items-center justify-center text-xs font-semibold opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
							>
								{t("common.delete")}
							</button>
						</div>
					)}
				</div>
			</FormField>

			<FormField
				label={t("buildings.buildingPhoto")}
				error={uploadError.photo}
				htmlFor="edit-building-photo"
			>
				<div className="flex flex-col gap-3">
					<FileUpload
						maxFiles={1}
						onFilesSelected={handlePhotoSelected}
						error={uploadError.photo}
					/>
					{photoPreview && (
						<div className="relative w-full aspect-3/1 rounded-md overflow-hidden border border-hairline mt-2">
							<Image
								src={photoPreview}
								alt="Building Photo Preview"
								className="object-cover"
								fill
								unoptimized
							/>
							<button
								type="button"
								onClick={() => {
									setValue("buildingPhoto", null);
									setPhotoPreview(null);
								}}
								className="absolute top-2 right-2 bg-error-text text-white px-2 py-1 text-xs rounded shadow-md cursor-pointer hover:bg-error-text/90"
							>
								{t("common.delete")}
							</button>
						</div>
					)}
				</div>
			</FormField>

			<div className="mt-8 border-t border-hairline pt-6">
				<h2 className="text-lg font-semibold text-ink mb-4">
					{t("buildings.emergencyContacts")} ({t("payments.optional")})
				</h2>

				<div className="flex flex-col gap-4">
					{fields.map((field, index) => (
						<Card
							key={field.id}
							className="bg-canvas border-hairline p-4 relative"
						>
							<button
								type="button"
								onClick={() => remove(index)}
								className="absolute top-2 right-2 text-error-text hover:text-error-text/80 text-sm font-medium cursor-pointer"
							>
								{t("common.delete")}
							</button>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
								<FormField
									label={t("buildings.contactName")}
									required
									error={errors.emergencyContacts?.[index]?.name?.message}
									htmlFor={`edit-contact-${index}-name`}
								>
									<FormInput
										id={`edit-contact-${index}-name`}
										type="text"
										{...register(`emergencyContacts.${index}.name`)}
										hasError={!!errors.emergencyContacts?.[index]?.name}
									/>
								</FormField>

								<FormField
									label={t("buildings.contactRole")}
									required
									error={errors.emergencyContacts?.[index]?.role?.message}
									htmlFor={`edit-contact-${index}-role`}
								>
									<div className="flex flex-col gap-1.5">
										<FormInput
											id={`edit-contact-${index}-role`}
											type="text"
											{...register(`emergencyContacts.${index}.role`)}
											hasError={!!errors.emergencyContacts?.[index]?.role}
											placeholder={t("buildings.contactRole")}
										/>
										<div className="flex flex-wrap gap-1.5 mt-1">
											{(watch(`emergencyContacts.${index}.type`) === "building"
												? locale === "en"
													? ["Owner", "Manager", "Caretaker", "Security"]
													: ["মালিক", "ম্যানেজার", "কেয়ারটেকার", "সিকিউরিটি"]
												: locale === "en"
													? [
															"Hospital",
															"Police Station",
															"Fire Service",
															"Ambulance",
														]
													: ["হাসপাতাল", "পুলিশ স্টেশন", "ফায়ার সার্ভিস", "অ্যাম্বুলেন্স"]
											).map((r) => (
												<button
													key={r}
													type="button"
													onClick={() => {
														setValue(`emergencyContacts.${index}.role`, r);
													}}
													className="text-xs px-2 py-1 rounded bg-surface border border-hairline text-steel hover:bg-brand-blue-200/20 cursor-pointer"
												>
													{r}
												</button>
											))}
										</div>
									</div>
								</FormField>

								<FormField
									label={t("buildings.contactPhone")}
									error={errors.emergencyContacts?.[index]?.phone?.message}
									htmlFor={`edit-contact-${index}-phone`}
								>
									<FormInput
										id={`edit-contact-${index}-phone`}
										type="text"
										{...register(`emergencyContacts.${index}.phone`)}
										hasError={!!errors.emergencyContacts?.[index]?.phone}
									/>
								</FormField>

								<FormField
									label={t("buildings.contactType")}
									htmlFor={`edit-contact-${index}-type`}
								>
									<select
										id={`edit-contact-${index}-type`}
										{...register(`emergencyContacts.${index}.type`, {
											onChange: () => {
												setValue(`emergencyContacts.${index}.role`, "");
											},
										})}
										className="w-full rounded-md border border-hairline min-h-11 px-3 bg-white text-ink text-sm"
									>
										<option value="building">
											{t("buildings.buildingType")}
										</option>
										<option value="nearby">{t("buildings.nearbyType")}</option>
									</select>
								</FormField>
							</div>
						</Card>
					))}

					<Button
						type="button"
						variant="outline"
						onClick={() =>
							append({ name: "", role: "", phone: "", type: "building" })
						}
						className="rounded-full min-h-11 text-brand-blue-deep border-brand-blue-deep border self-start cursor-pointer"
					>
						+ {t("buildings.addEmergencyContact")}
					</Button>
				</div>
			</div>

			<div className="flex gap-3 mt-8 border-t border-hairline pt-6">
				<Button
					type="submit"
					disabled={isPending}
					className="rounded-full min-h-11 bg-primary text-on-primary font-semibold cursor-pointer"
				>
					{isPending ? t("common.loading") : t("common.save")}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					className="rounded-full min-h-11 text-charcoal border-hairline cursor-pointer"
				>
					{t("common.cancel")}
				</Button>
			</div>
		</form>
	);
}
