"use client";

import { FormField, FormInput } from "@/components/ui/form-field";
import { ImageCapture } from "@/components/ui/image-capture";
import { useTranslation } from "@/lib/i18n";
import {
	Calendar,
	Camera,
	CreditCard,
	FileText,
	Heart,
	Phone,
	Upload,
	User,
	Users,
} from "lucide-react";
import { BLOOD_GROUPS } from "@/lib/shared/constants";
import { SignaturePad } from "./signature-pad";

interface RegistrationFieldsProps {
	formData: {
		fullName: string;
		phone: string;
		nidNumber: string;
		bloodGroup: string;
		occupation: string;
		familyMembers: string;
		emergencyContactName: string;
		emergencyContact: string;
		emergencyContactRelationship: string;
		rentalStartDate: string;
		advanceAmount: string;
	};
	familyMemberNames: string[];
	fieldErrors: Record<string, string>;
	nidPhoto?: string;
	selfiePhoto?: string;
	digitalSignature: string;
	handleInputChange: (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => void;
	handleFieldFocus: () => void;
	handleNidPhotoChange: (base64: string) => void;
	handleSelfieChange: (base64: string) => void;
	handleSignatureChange: (signatureData: string | null) => void;
	handleFamilyMemberNameChange: (index: number, val: string) => void;
}

export function RegistrationFields({
	formData,
	familyMemberNames,
	fieldErrors,
	nidPhoto,
	selfiePhoto,
	handleInputChange,
	handleFieldFocus,
	handleNidPhotoChange,
	handleSelfieChange,
	handleSignatureChange,
	handleFamilyMemberNameChange,
}: RegistrationFieldsProps) {
	const { t } = useTranslation();

	return (
		<>
			{/* Full Name */}
			<FormField
				label={t("renters.fullName") || "পূর্ণ নাম"}
				icon={<User className="h-4 w-4" aria-hidden />}
				error={fieldErrors.fullName}
				htmlFor="reg-fullName"
			>
				<FormInput
					id="reg-fullName"
					type="text"
					name="fullName"
					value={formData.fullName}
					onChange={handleInputChange}
					onFocus={handleFieldFocus}
					placeholder="আপনার পূর্ণ নাম লিখুন"
					maxLength={100}
					hasError={!!fieldErrors.fullName}
				/>
			</FormField>

			{/* Phone */}
			<FormField
				label={t("renters.phone") || "ফোন নম্বর"}
				icon={<Phone className="h-4 w-4" aria-hidden />}
				error={fieldErrors.phone}
				htmlFor="reg-phone"
			>
				<FormInput
					id="reg-phone"
					type="tel"
					name="phone"
					value={formData.phone}
					onChange={handleInputChange}
					onFocus={handleFieldFocus}
					placeholder="01XXXXXXXXX"
					maxLength={11}
					hasError={!!fieldErrors.phone}
				/>
			</FormField>

			{/* NID Number */}
			<FormField
				label={t("renters.nidNumber") || "জাতীয় পরিচয়পত্র নম্বর"}
				icon={<CreditCard className="h-4 w-4" aria-hidden />}
				error={fieldErrors.nidNumber}
				htmlFor="reg-nidNumber"
			>
				<FormInput
					id="reg-nidNumber"
					type="text"
					name="nidNumber"
					value={formData.nidNumber}
					onChange={handleInputChange}
					onFocus={handleFieldFocus}
					placeholder="১০ বা ১৭ সংখ্যার NID নম্বর"
					maxLength={17}
					inputMode="numeric"
					hasError={!!fieldErrors.nidNumber}
				/>
			</FormField>

			{/* NID Photo - Mandatory */}
			<FormField
				label={t("renters.nidPhoto") || "NID ছবি (বাধ্যতামূলক)"}
				icon={<Upload className="h-4 w-4" aria-hidden />}
				error={fieldErrors.nidPhoto}
				htmlFor="reg-nidPhoto"
			>
				<ImageCapture
					value={nidPhoto}
					onChange={handleNidPhotoChange}
					onFocus={handleFieldFocus}
					facingMode="environment"
					isCircular={false}
					previewAlt="NID প্রিভিউ"
					cameraButtonLabel="ক্যামেরা দিয়ে NID-র ছবি তুলুন"
					uploadButtonLabel="NID ছবি আপলোড করুন"
					retakeButtonLabel="আবার তুলুন / আপলোড করুন"
				/>
			</FormField>

			{/* Selfie Photo - Mandatory */}
			<FormField
				label={t("renters.selfiePhoto") || "সেলফি ছবি (বাধ্যতামূলক)"}
				icon={<Camera className="h-4 w-4" aria-hidden />}
				error={fieldErrors.selfiePhoto}
				htmlFor="reg-selfiePhoto"
			>
				<ImageCapture
					value={selfiePhoto}
					onChange={handleSelfieChange}
					onFocus={handleFieldFocus}
					facingMode="user"
					isCircular={true}
					previewAlt="সেলফি প্রিভিউ"
					cameraButtonLabel="ক্যামেরা দিয়ে সেলফি তুলুন"
					uploadButtonLabel="সেলফি আপলোড করুন"
					retakeButtonLabel="আবার তুলুন / আপলোড করুন"
				/>
			</FormField>

			{/* Blood Group */}
			<FormField
				label={t("renters.bloodGroup") || "রক্তের গ্রুপ"}
				icon={<Heart className="h-4 w-4" aria-hidden />}
				error={fieldErrors.bloodGroup}
				htmlFor="reg-bloodGroup"
			>
				<select
					id="reg-bloodGroup"
					name="bloodGroup"
					value={formData.bloodGroup}
					onChange={handleInputChange}
					onFocus={handleFieldFocus}
					className={`w-full rounded-md border min-h-11 px-3 py-2 text-base text-ink focus:border-brand-blue-deep focus:outline-none focus:ring-1 focus:ring-brand-blue-deep ${
						fieldErrors.bloodGroup
							? "border-error-text bg-error-bg"
							: "border-hairline bg-white"
					}`}
					aria-invalid={!!fieldErrors.bloodGroup}
				>
					<option value="">
						{t("renters.selectBloodGroup") || "রক্তের গ্রুপ নির্বাচন করুন"}
					</option>
					{BLOOD_GROUPS.map((group) => (
						<option key={group} value={group}>
							{group}
						</option>
					))}
				</select>
			</FormField>

			{/* Occupation */}
			<FormField
				label={t("renters.occupation") || "পেশা"}
				icon={<User className="h-4 w-4" aria-hidden />}
				error={fieldErrors.occupation}
				htmlFor="reg-occupation"
			>
				<FormInput
					id="reg-occupation"
					type="text"
					name="occupation"
					value={formData.occupation}
					onChange={handleInputChange}
					onFocus={handleFieldFocus}
					placeholder="আপনার পেশা লিখুন"
					maxLength={100}
					hasError={!!fieldErrors.occupation}
				/>
			</FormField>

			{/* Family Members Count */}
			<FormField
				label={t("renters.familyMembers") || "পরিবারের সদস্য সংখ্যা"}
				icon={<Users className="h-4 w-4" aria-hidden />}
				error={fieldErrors.familyMembers}
				htmlFor="reg-familyMembers"
			>
				<FormInput
					id="reg-familyMembers"
					type="number"
					name="familyMembers"
					value={formData.familyMembers}
					onChange={handleInputChange}
					onFocus={handleFieldFocus}
					placeholder="১ থেকে ২০"
					min={1}
					max={20}
					inputMode="numeric"
					hasError={!!fieldErrors.familyMembers}
				/>
			</FormField>

			{/* Dynamic Family Member Names */}
			<div className="flex flex-col gap-3 pl-4 border-l-2 border-hairline bg-surface/50 p-3 rounded-r-lg">
				<span className="text-base font-semibold text-ink">
					{t("renters.familyMemberNames") || "পরিবারের सदस्यों নাম:"}
				</span>
				{familyMemberNames.map((name, index) => {
					const errorKey = `familyMemberNames.${index}`;
					return (
						<FormField
							key={`member-name-${index}`}
							label={`${t("renters.member") || "সদস্য"} ${index + 1}`}
							icon={<User className="h-4 w-4 text-steel" />}
							error={fieldErrors[errorKey]}
							htmlFor={`reg-familyMemberNames-${index}`}
						>
							<FormInput
								id={`reg-familyMemberNames-${index}`}
								type="text"
								value={name}
								onChange={(e) =>
									handleFamilyMemberNameChange(index, e.target.value)
								}
								onFocus={handleFieldFocus}
								placeholder={`${t("renters.member") || "সদস্য"} ${index + 1}-এর নাম লিখুন`}
								maxLength={100}
								hasError={!!fieldErrors[errorKey]}
							/>
						</FormField>
					);
				})}
				{fieldErrors.familyMemberNames && (
					<p className="text-base text-error-text flex items-center gap-1">
						<span className="text-error-text">*</span>
						{fieldErrors.familyMemberNames}
					</p>
				)}
			</div>

			{/* Emergency Contact Name */}
			<FormField
				label={t("renters.emergencyContactName") || "জরুরি যোগাযোগের ব্যক্তির নাম"}
				icon={<User className="h-4 w-4" aria-hidden />}
				error={fieldErrors.emergencyContactName}
				htmlFor="reg-emergencyContactName"
			>
				<FormInput
					id="reg-emergencyContactName"
					type="text"
					name="emergencyContactName"
					value={formData.emergencyContactName}
					onChange={handleInputChange}
					onFocus={handleFieldFocus}
					placeholder="জরুরি যোগাযোগের ব্যক্তির নাম লিখুন"
					maxLength={200}
					hasError={!!fieldErrors.emergencyContactName}
				/>
			</FormField>

			{/* Emergency Contact Phone */}
			<FormField
				label={t("renters.emergencyContactNumber") || "জরুরি যোগাযোগ নম্বর"}
				icon={<Phone className="h-4 w-4" aria-hidden />}
				error={fieldErrors.emergencyContact}
				htmlFor="reg-emergencyContact"
			>
				<FormInput
					id="reg-emergencyContact"
					type="tel"
					name="emergencyContact"
					value={formData.emergencyContact}
					onChange={handleInputChange}
					onFocus={handleFieldFocus}
					placeholder="01XXXXXXXXX"
					maxLength={11}
					hasError={!!fieldErrors.emergencyContact}
				/>
			</FormField>

			{/* Emergency Contact Relationship */}
			<FormField
				label={t("renters.emergencyContactRelationship") || "সম্পর্ক"}
				icon={<Users className="h-4 w-4" aria-hidden />}
				error={fieldErrors.emergencyContactRelationship}
				htmlFor="reg-emergencyContactRelationship"
			>
				<FormInput
					id="reg-emergencyContactRelationship"
					type="text"
					name="emergencyContactRelationship"
					value={formData.emergencyContactRelationship}
					onChange={handleInputChange}
					onFocus={handleFieldFocus}
					placeholder="যেমন: পিতা, ভাই, স্বামী ইত্যাদি"
					maxLength={100}
					hasError={!!fieldErrors.emergencyContactRelationship}
				/>
			</FormField>

			{/* Rental Start Date */}
			<FormField
				label={t("renters.rentalStartDate") || "ভাড়া শুরুর তারিখ"}
				icon={<Calendar className="h-4 w-4" aria-hidden />}
				error={fieldErrors.rentalStartDate}
				htmlFor="reg-rentalStartDate"
			>
				<FormInput
					id="reg-rentalStartDate"
					type="date"
					name="rentalStartDate"
					value={formData.rentalStartDate}
					onChange={handleInputChange}
					onFocus={handleFieldFocus}
					min={new Date().toISOString().split("T")[0]}
					max={(() => {
						const maxDate = new Date();
						maxDate.setDate(maxDate.getDate() + 90);
						return maxDate.toISOString().split("T")[0];
					})()}
					hasError={!!fieldErrors.rentalStartDate}
				/>
			</FormField>

			{/* Advance Amount */}
			<FormField
				label={t("renters.advanceAmount") || "অগ্রিম পরিমাণ (টাকা)"}
				icon={<CreditCard className="h-4 w-4" aria-hidden />}
				error={fieldErrors.advanceAmount}
				htmlFor="reg-advanceAmount"
			>
				<FormInput
					id="reg-advanceAmount"
					type="number"
					name="advanceAmount"
					value={formData.advanceAmount}
					onChange={handleInputChange}
					onFocus={handleFieldFocus}
					placeholder="০ থেকে ৯,৯৯,৯৯,৯৯৯"
					min={0}
					max={99999999}
					inputMode="numeric"
					hasError={!!fieldErrors.advanceAmount}
				/>
			</FormField>

			{/* Digital Signature */}
			<FormField
				label={t("renters.digitalSignature") || "ডিজিটাল স্বাক্ষর"}
				icon={<FileText className="h-4 w-4" aria-hidden />}
				error={fieldErrors.digitalSignature}
				htmlFor="reg-digitalSignature"
			>
				<div className="overflow-hidden rounded-lg border border-hairline bg-white">
					<SignaturePad
						onChange={handleSignatureChange}
						label={
							t("renters.digitalSignatureSignPrompt") ||
							"এখানে আঙুল দিয়ে স্বাক্ষর করুন"
						}
					/>
				</div>
			</FormField>
		</>
	);
}
