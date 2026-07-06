"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorFeedback } from "@/components/ui/error-feedback";
import { FileUpload } from "@/components/ui/file-upload";
import { FormField, FormInput } from "@/components/ui/form-field";
import { useCreateRenter, useVacantFlats } from "@/hooks/use-renters";
import { useTranslation } from "@/lib/i18n";
import { BLOOD_GROUPS } from "@/lib/shared/constants";
import { registerRenterSchema } from "@/lib/shared/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = registerRenterSchema.extend({
	familyMemberNamesArray: z
		.array(z.object({ name: z.string().max(100) }))
		.max(20)
		.optional(),
	nidPhoto: z.any().optional(),
	digitalSignature: z.any().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export default function NewRenterPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [globalError, setGlobalError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const createMutation = useCreateRenter();
	const { data: vacantFlatsData, isLoading: isLoadingFlats } = useVacantFlats();

	const {
		register,
		control,
		handleSubmit,
		setValue,
		watch,
		formState: { errors, isSubmitting },
	} = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			fullName: "",
			phone: "",
			nidNumber: "",
			occupation: "",
			bloodGroup: undefined,
			emergencyContactName: "",
			emergencyContactNumber: "",
			emergencyContactRelationship: "",
			startDate: "",
			flatId: "",
			dateOfBirth: "",
			familyMemberNamesArray: [],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control,
		name: "familyMemberNamesArray",
	});

	const [familyMemberInput, setFamilyMemberInput] = useState("");

	const handleAddFamilyMember = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				e.preventDefault();
				const name = familyMemberInput.trim();
				if (name && fields.length < 20 && name.length <= 100) {
					append({ name });
					setFamilyMemberInput("");
				}
			}
		},
		[familyMemberInput, fields.length, append],
	);

	const onSubmit = async (data: FormValues) => {
		setGlobalError("");
		try {
			await createMutation.mutateAsync({
				fullName: data.fullName,
				phone: data.phone,
				nidNumber: data.nidNumber,
				occupation: data.occupation,
				bloodGroup: data.bloodGroup,
				totalFamilyMembers: data.totalFamilyMembers,
				emergencyContactName: data.emergencyContactName,
				emergencyContactNumber: data.emergencyContactNumber,
				emergencyContactRelationship: data.emergencyContactRelationship,
				rentalStartDate: data.startDate,
				advanceAmountPaid: data.advanceAmount,
				flatId: data.flatId,
				monthlyRentAmount: data.monthlyRent,
				dateOfBirth: data.dateOfBirth || undefined,
				familyMemberNames: data.familyMemberNamesArray?.length
					? data.familyMemberNamesArray.map((f) => f.name)
					: undefined,
				nidPhoto: data.nidPhoto,
				digitalSignature: data.digitalSignature,
			});
			setSuccessMessage(t("renters.createSuccess"));
			router.push("/renters");
		} catch (err) {
			setGlobalError(
				err instanceof Error ? err.message : t("renters.saveError"),
			);
		}
	};

	const vacantFlats = vacantFlatsData?.data ?? [];

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
					href="/renters"
					className="text-sm text-steel no-underline hover:underline"
				>
					← {t("common.back")}
				</Link>
			</div>

			<h1 className="text-2xl font-bold text-ink mb-6">
				{t("renters.registerRenter")}
			</h1>

			<Card className="bg-canvas rounded-xl border border-hairline max-w-160">
				<CardContent className="p-6">
					<form onSubmit={handleSubmit(onSubmit)}>
						{/* Personal Information Section */}
						<h2 className="text-lg font-semibold text-ink mb-4 pb-2 border-b border-hairline">
							{t("renters.personalInfo")}
						</h2>

						<FormField
							label={t("renters.fullName")}
							required
							error={errors.fullName?.message}
							htmlFor="renter-fullname"
						>
							<FormInput
								id="renter-fullname"
								type="text"
								{...register("fullName")}
								hasError={!!errors.fullName}
								autoFocus
							/>
						</FormField>

						<FormField
							label={t("renters.phone")}
							required
							error={errors.phone?.message}
							htmlFor="renter-phone"
							helpText="01XXXXXXXXX"
						>
							<FormInput
								id="renter-phone"
								type="tel"
								{...register("phone")}
								hasError={!!errors.phone}
								maxLength={11}
							/>
						</FormField>

						<FormField
							label={t("renters.nidNumber")}
							required
							error={errors.nidNumber?.message}
							htmlFor="renter-nid"
							helpText="10-17 digits"
						>
							<FormInput
								id="renter-nid"
								type="text"
								{...register("nidNumber")}
								hasError={!!errors.nidNumber}
								maxLength={17}
							/>
						</FormField>

						<FormField
							label={t("renters.dateOfBirth")}
							error={errors.dateOfBirth?.message}
							htmlFor="renter-dob"
						>
							<FormInput
								id="renter-dob"
								type="date"
								{...register("dateOfBirth")}
								hasError={!!errors.dateOfBirth}
							/>
						</FormField>

						<FormField
							label={t("renters.occupation")}
							required
							error={errors.occupation?.message}
							htmlFor="renter-occupation"
						>
							<FormInput
								id="renter-occupation"
								type="text"
								{...register("occupation")}
								hasError={!!errors.occupation}
							/>
						</FormField>

						<FormField
							label={t("renters.bloodGroup")}
							required
							error={errors.bloodGroup?.message}
							htmlFor="renter-blood-group"
						>
							<select
								id="renter-blood-group"
								{...register("bloodGroup")}
								aria-invalid={!!errors.bloodGroup || undefined}
								className={[
									"block w-full px-3 py-2.5 text-base leading-6 rounded-md border min-h-11",
									"bg-background text-foreground",
									errors.bloodGroup
										? "border-error-text bg-error-bg"
										: "border-hairline",
								].join(" ")}
							>
								<option value="">{t("renters.selectBloodGroup")}</option>
								{BLOOD_GROUPS.map((bg) => (
									<option key={bg} value={bg}>
										{bg}
									</option>
								))}
							</select>
						</FormField>

						<FormField
							label={t("renters.familyMembers")}
							required
							error={errors.totalFamilyMembers?.message}
							htmlFor="renter-family-members"
							helpText="1-50"
						>
							<FormInput
								id="renter-family-members"
								type="number"
								{...register("totalFamilyMembers", {
									setValueAs: (v) =>
										v === "" ? undefined : Number.parseInt(v, 10),
								})}
								hasError={!!errors.totalFamilyMembers}
								min={1}
								max={50}
							/>
						</FormField>

						{/* Family Member Names (Optional) */}
						<FormField
							label={t("renters.familyMemberNames")}
							error={errors.familyMemberNamesArray?.message}
							htmlFor="renter-family-names"
							helpText={t("renters.familyMemberPlaceholder")}
						>
							<div className="flex gap-2">
								<FormInput
									id="renter-family-names"
									type="text"
									value={familyMemberInput}
									onChange={(e) => setFamilyMemberInput(e.target.value)}
									onKeyDown={handleAddFamilyMember}
									hasError={!!errors.familyMemberNamesArray}
									maxLength={100}
									className="flex-1"
								/>
								<Button
									type="button"
									onClick={() => {
										const name = familyMemberInput.trim();
										if (name && fields.length < 20 && name.length <= 100) {
											append({ name });
											setFamilyMemberInput("");
										}
									}}
									variant="outline"
									className="min-h-11 px-3"
									disabled={!familyMemberInput.trim() || fields.length >= 20}
								>
									<Plus className="w-5 h-5" />
								</Button>
							</div>
						</FormField>

						{fields.length > 0 && (
							<div className="flex flex-wrap gap-2 mb-4 -mt-2">
								{fields.map((field, idx) => (
									<span
										key={field.id}
										className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-blue-200 border border-hairline text-[0.8125rem] text-brand-blue-deep"
									>
										{field.name}
										<button
											type="button"
											onClick={() => remove(idx)}
											aria-label={`Remove ${field.name}`}
											className="inline-flex items-center justify-center min-w-xl min-h-xl border-none bg-transparent text-error-text cursor-pointer text-base font-bold"
										>
											×
										</button>
									</span>
								))}
							</div>
						)}

						{/* Emergency Contact Section */}
						<h2 className="text-lg font-semibold text-ink mb-4 mt-6 pb-2 border-b border-hairline">
							{t("renters.emergencyContact")}
						</h2>

						<FormField
							label={t("renters.emergencyContactName")}
							required
							error={errors.emergencyContactName?.message}
							htmlFor="renter-emergency-name"
						>
							<FormInput
								id="renter-emergency-name"
								type="text"
								{...register("emergencyContactName")}
								hasError={!!errors.emergencyContactName}
							/>
						</FormField>

						<FormField
							label={t("renters.emergencyContactNumber")}
							required
							error={errors.emergencyContactNumber?.message}
							htmlFor="renter-emergency-number"
							helpText="01XXXXXXXXX"
						>
							<FormInput
								id="renter-emergency-number"
								type="tel"
								{...register("emergencyContactNumber")}
								hasError={!!errors.emergencyContactNumber}
								maxLength={11}
							/>
						</FormField>

						<FormField
							label={t("renters.emergencyContactRelationship")}
							required
							error={errors.emergencyContactRelationship?.message}
							htmlFor="renter-emergency-relationship"
						>
							<FormInput
								id="renter-emergency-relationship"
								type="text"
								{...register("emergencyContactRelationship")}
								hasError={!!errors.emergencyContactRelationship}
							/>
						</FormField>

						{/* Rental Information Section */}
						<h2 className="text-lg font-semibold text-ink mb-4 mt-6 pb-2 border-b border-hairline">
							{t("renters.contractInfo")}
						</h2>

						<FormField
							label={t("renters.selectFlat")}
							required
							error={errors.flatId?.message}
							htmlFor="renter-flat"
						>
							<select
								id="renter-flat"
								{...register("flatId")}
								disabled={isLoadingFlats}
								aria-invalid={!!errors.flatId || undefined}
								className={[
									"block w-full px-3 py-2.5 text-base leading-6 rounded-md border min-h-11",
									"bg-background text-foreground",
									errors.flatId
										? "border-error-text bg-error-bg"
										: "border-hairline",
								].join(" ")}
							>
								<option value="">{t("renters.selectFlatPlaceholder")}</option>
								{vacantFlats.map((flat) => (
									<option key={flat.id} value={flat.id}>
										{flat.buildingName ?? ""} — {flat.flatNumber} (Floor{" "}
										{flat.floor})
									</option>
								))}
							</select>
						</FormField>

						<FormField
							label={t("renters.rentalStartDate")}
							required
							error={
								errors.startDate?.message || (errors as any).startDate?.message
							}
							htmlFor="renter-start-date"
						>
							<FormInput
								id="renter-start-date"
								type="date"
								{...register("startDate")}
								hasError={!!(errors as any).startDate}
							/>
						</FormField>

						<FormField
							label={t("renters.monthlyRent")}
							required
							error={errors.monthlyRent?.message}
							htmlFor="renter-monthly-rent"
							helpText="৳"
						>
							<FormInput
								id="renter-monthly-rent"
								type="number"
								{...register("monthlyRent", {
									setValueAs: (v) =>
										v === "" ? undefined : Number.parseFloat(v),
								})}
								hasError={!!errors.monthlyRent}
								min={0.01}
								step={0.01}
							/>
						</FormField>

						<FormField
							label={t("renters.advanceAmount")}
							required
							error={errors.advanceAmount?.message}
							htmlFor="renter-advance"
							helpText="৳"
						>
							<FormInput
								id="renter-advance"
								type="number"
								{...register("advanceAmount", {
									setValueAs: (v) =>
										v === "" ? undefined : Number.parseFloat(v),
								})}
								hasError={!!errors.advanceAmount}
								min={0.01}
								step={0.01}
							/>
						</FormField>

						{/* File Uploads Section */}
						<h2 className="text-lg font-semibold text-ink mb-4 mt-6 pb-2 border-b border-hairline">
							{t("renters.nidPhoto")} & {t("renters.digitalSignature")}
						</h2>

						<FormField
							label={t("renters.nidPhoto")}
							htmlFor="renter-nid-photo"
							helpText="JPEG, PNG, WebP • Max 5MB"
						>
							<FileUpload
								onFilesSelected={(f) => setValue("nidPhoto", f[0] || null)}
								maxFiles={1}
								disabled={isSubmitting || createMutation.isPending}
								capture="environment"
							/>
						</FormField>

						<FormField
							label={t("renters.digitalSignature")}
							htmlFor="renter-signature"
							helpText="JPEG, PNG, WebP • Max 5MB"
						>
							<FileUpload
								onFilesSelected={(f) =>
									setValue("digitalSignature", f[0] || null)
								}
								maxFiles={1}
								disabled={isSubmitting || createMutation.isPending}
							/>
						</FormField>

						{/* Submit */}
						<div className="flex gap-3 mt-6">
							<Button
								type="submit"
								disabled={isSubmitting || createMutation.isPending}
								className="min-h-11 rounded-full bg-primary text-on-primary font-semibold disabled:opacity-50"
							>
								{isSubmitting || createMutation.isPending
									? t("common.loading")
									: t("common.submit")}
							</Button>

							<Button
								asChild
								variant="outline"
								className="min-h-11 rounded-full"
							>
								<Link href="/renters">{t("common.cancel")}</Link>
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</>
	);
}
