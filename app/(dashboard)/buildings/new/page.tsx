"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorFeedback } from "@/components/ui/error-feedback";
import { FileUpload } from "@/components/ui/file-upload";
import { FormField, FormInput } from "@/components/ui/form-field";
import { useCreateBuilding } from "@/hooks/use-buildings";
import { useTranslation } from "@/lib/i18n";
import {
	type CreateBuildingInput,
	createBuildingSchema,
} from "@/lib/shared/validation";
import { fileToBase64 } from "@/lib/utils/file";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

export default function NewBuildingPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [globalError, setGlobalError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const createMutation = useCreateBuilding();

	const {
		register,
		control,
		handleSubmit,
		setValue,
		watch,
		formState: { errors, isSubmitting },
	} = useForm<CreateBuildingInput>({
		resolver: zodResolver(createBuildingSchema),
		defaultValues: {
			name: "",
			address: "",
			whatsappGroupLink: "",
			managerPhone: "",
			rules: "",
			emergencyContacts: [],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control,
		name: "emergencyContacts",
	});

	const buildingPhoto = watch("buildingPhoto");
	const logoPhoto = watch("logoPhoto");

	const onSubmit = async (data: CreateBuildingInput) => {
		setGlobalError("");
		try {
			await createMutation.mutateAsync(data);
			setSuccessMessage(t("buildings.createSuccess"));
			router.push("/buildings");
		} catch (err) {
			setGlobalError(
				err instanceof Error ? err.message : t("buildings.saveError"),
			);
		}
	};

	async function handlePhotoSelected(
		files: File[],
		field: "buildingPhoto" | "logoPhoto",
	) {
		if (files.length > 0 && files[0]) {
			try {
				const base64 = await fileToBase64(files[0]);
				setValue(field, base64);
			} catch (_err) {
				setGlobalError("ফাইলটি আপলোড করা যায়নি");
			}
		} else {
			setValue(field, null);
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
			{globalError && (
				<ErrorFeedback
					message={globalError}
					type="error"
					visible
					onDismiss={() => setGlobalError("")}
				/>
			)}

			<div className="mb-6">
				<Link
					href="/buildings"
					className="text-sm text-steel no-underline hover:underline"
				>
					← {t("common.back")}
				</Link>
			</div>

			<h1 className="text-2xl font-bold text-ink mb-6">
				{t("buildings.createBuilding")}
			</h1>

			<Card className="max-w-2xl bg-canvas border-hairline">
				<CardContent className="p-6">
					<form onSubmit={handleSubmit(onSubmit)}>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<FormField
								label={t("buildings.buildingName")}
								required
								error={errors.name?.message}
								htmlFor="building-name"
							>
								<FormInput
									id="building-name"
									type="text"
									{...register("name")}
									hasError={!!errors.name}
									maxLength={200}
									autoFocus
								/>
							</FormField>

							<FormField
								label={t("buildings.totalFloors")}
								error={errors.totalFloors?.message}
								htmlFor="building-floors"
							>
								<FormInput
									id="building-floors"
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
							htmlFor="building-address"
						>
							<FormInput
								id="building-address"
								type="text"
								{...register("address")}
								hasError={!!errors.address}
								maxLength={500}
							/>
						</FormField>

						<FormField
							label={t("buildings.whatsappGroupLink")}
							error={errors.whatsappGroupLink?.message}
							htmlFor="building-whatsapp"
						>
							<FormInput
								id="building-whatsapp"
								type="text"
								{...register("whatsappGroupLink")}
								hasError={!!errors.whatsappGroupLink}
								placeholder="https://chat.whatsapp.com/..."
							/>
						</FormField>

						<FormField
							label="ম্যানেজারের ফোন নম্বর (ঐচ্ছিক)"
							error={errors.managerPhone?.message}
							htmlFor="manager-phone"
						>
							<FormInput
								id="manager-phone"
								type="tel"
								{...register("managerPhone")}
								hasError={!!errors.managerPhone}
								placeholder="01XXXXXXXXX"
							/>
						</FormField>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
							<div>
								<span className="block text-sm font-semibold text-ink mb-1.5">
									{t("buildings.buildingPhoto")}
								</span>
								<FileUpload
									onFilesSelected={(f) =>
										handlePhotoSelected(f, "buildingPhoto")
									}
									maxFiles={1}
									accept="image/jpeg,image/png,image/webp"
									capture="environment"
								/>
								{buildingPhoto && (
									<div className="mt-2">
										<p className="text-xs text-stone mb-1">
											{t("buildings.preview")}:
										</p>
										<div className="relative w-full aspect-video rounded overflow-hidden border border-hairline">
											<Image
												src={buildingPhoto}
												alt="Building preview"
												fill
												className="object-cover"
											/>
										</div>
									</div>
								)}
							</div>

							<div>
								<span className="block text-sm font-semibold text-ink mb-1.5">
									বিল্ডিং এর লোগো (ঐচ্ছিক)
								</span>
								<FileUpload
									onFilesSelected={(f) => handlePhotoSelected(f, "logoPhoto")}
									maxFiles={1}
									accept="image/jpeg,image/png,image/webp"
								/>
								{logoPhoto && (
									<div className="mt-2">
										<p className="text-xs text-stone mb-1">
											{t("buildings.preview")}:
										</p>
										<div className="relative w-24 h-24 rounded-full overflow-hidden border border-hairline">
											<Image
												src={logoPhoto}
												alt="Logo preview"
												fill
												className="object-cover"
											/>
										</div>
									</div>
								)}
							</div>
						</div>

						<div className="mt-6">
							<FormField
								label="বিল্ডিং এর নিয়মাবলী (ঐচ্ছিক)"
								error={errors.rules?.message}
								htmlFor="building-rules"
							>
								<textarea
									id="building-rules"
									{...register("rules")}
									rows={5}
									className={`w-full rounded-md border p-3 text-base min-h-[110px] ${
										errors.rules
											? "border-error-text bg-error-bg"
											: "border-hairline bg-white"
									} focus:border-brand-blue-deep focus:outline-none focus:ring-1 focus:ring-brand-blue-deep`}
									placeholder="১. রাত ১১ টার পর মেইন গেট বন্ধ থাকবে..."
								/>
							</FormField>
						</div>

						<div className="mt-8 border-t border-hairline pt-6">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-lg font-bold text-ink">জরুরী যোগাযোগ</h2>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() =>
										append({ name: "", role: "", phone: "", type: "building" })
									}
									className="flex items-center gap-1 min-h-[36px]"
								>
									<Plus className="w-4 h-4" />
									নতুন যোগ করুন
								</Button>
							</div>

							{fields.length === 0 ? (
								<p className="text-sm text-steel mb-4">
									কোনো জরুরী যোগাযোগ যুক্ত করা হয়নি।
								</p>
							) : (
								<div className="space-y-4">
									{fields.map((field, index) => (
										<div
											key={field.id}
											className="p-4 border border-hairline rounded-lg bg-surface relative"
										>
											<div className="absolute top-2 right-2">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => remove(index)}
													className="text-error-text hover:text-error-text hover:bg-error-bg min-h-[36px] min-w-[36px]"
													aria-label="Remove contact"
												>
													<Trash2 className="w-4 h-4" />
												</Button>
											</div>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
												<FormField
													label="নাম"
													required
													error={
														errors.emergencyContacts?.[index]?.name?.message
													}
													htmlFor={`contact-${index}-name`}
												>
													<FormInput
														id={`contact-${index}-name`}
														{...register(
															`emergencyContacts.${index}.name` as const,
														)}
														hasError={!!errors.emergencyContacts?.[index]?.name}
													/>
												</FormField>
												<FormField
													label="ভূমিকা/পদবী"
													required
													error={
														errors.emergencyContacts?.[index]?.role?.message
													}
													htmlFor={`contact-${index}-role`}
												>
													<FormInput
														id={`contact-${index}-role`}
														{...register(
															`emergencyContacts.${index}.role` as const,
														)}
														hasError={!!errors.emergencyContacts?.[index]?.role}
														placeholder="যেমন: কেয়ারটেকার"
													/>
												</FormField>
												<FormField
													label="ফোন নম্বর (ঐচ্ছিক)"
													error={
														errors.emergencyContacts?.[index]?.phone?.message
													}
													htmlFor={`contact-${index}-phone`}
												>
													<FormInput
														id={`contact-${index}-phone`}
														{...register(
															`emergencyContacts.${index}.phone` as const,
														)}
														hasError={
															!!errors.emergencyContacts?.[index]?.phone
														}
														placeholder="01XXXXXXXXX"
													/>
												</FormField>
												<FormField
													label="ধরন"
													error={
														errors.emergencyContacts?.[index]?.type?.message
													}
													htmlFor={`contact-${index}-type`}
												>
													<select
														id={`contact-${index}-type`}
														{...register(
															`emergencyContacts.${index}.type` as const,
														)}
														className={`w-full rounded-md border min-h-11 px-3 py-2 text-base ${
															errors.emergencyContacts?.[index]?.type
																? "border-error-text bg-error-bg"
																: "border-hairline bg-white"
														} focus:border-brand-blue-deep focus:outline-none focus:ring-1 focus:ring-brand-blue-deep`}
													>
														<option value="building">বিল্ডিং স্টাফ</option>
														<option value="nearby">আশপাশের জরুরী সেবা</option>
													</select>
												</FormField>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						<div className="mt-8 flex justify-end gap-3 pt-6 border-t border-hairline">
							<Button
								type="button"
								variant="outline"
								onClick={() => router.push("/buildings")}
								className="min-w-[100px] min-h-11 font-semibold text-steel"
								disabled={isSubmitting}
							>
								{t("common.cancel")}
							</Button>
							<Button
								type="submit"
								disabled={isSubmitting || createMutation.isPending}
								className="min-w-[120px] min-h-11 bg-primary text-white font-semibold hover:bg-primary/90"
							>
								{isSubmitting || createMutation.isPending
									? t("common.saving")
									: t("buildings.saveBuilding")}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</>
	);
}
