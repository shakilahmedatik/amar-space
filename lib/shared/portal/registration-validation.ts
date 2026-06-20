import { z } from "zod";

// ─── Portal Registration Form Validation ────────────────────────────────────
// Validates renter registration form inputs with Bangla error messages.

export const portalBloodGroupEnum = z.enum(
	["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
	{ error: "রক্তের গ্রুপ সঠিক নয়" },
);

export const portalPhoneSchema = z
	.string({ error: "ফোন নম্বর আবশ্যক" })
	.regex(/^01\d{9}$/, {
		message: "ফোন নম্বর ১১ সংখ্যার হতে হবে এবং 01 দিয়ে শুরু হতে হবে",
	});

export const portalNidSchema = z
	.string({ error: "জাতীয় পরিচয়পত্র নম্বর আবশ্যক" })
	.regex(/^(\d{10}|\d{17})$/, {
		message: "জাতীয় পরিচয়পত্র নম্বর ১০ অথবা ১৭ সংখ্যার হতে হবে",
	});

export const portalEmergencyContactSchema = z
	.string({ error: "জরুরি যোগাযোগ নম্বর আবশ্যক" })
	.regex(/^01\d{9}$/, {
		message: "জরুরি যোগাযোগ নম্বর ১১ সংখ্যার হতে হবে এবং 01 দিয়ে শুরু হতে হবে",
	});

/**
 * Validates that a rental start date is today or in the future,
 * but not more than 90 days from today.
 */
export const portalRentalStartDateSchema = z
	.string({ error: "ভাড়া শুরুর তারিখ আবশ্যক" })
	.regex(/^\d{4}-\d{2}-\d{2}$/, {
		message: "তারিখ YYYY-MM-DD ফরম্যাটে হতে হবে",
	})
	.refine(
		(dateStr) => {
			const date = new Date(dateStr);
			if (Number.isNaN(date.getTime())) return false;
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			return date >= today;
		},
		{ message: "ভাড়া শুরুর তারিখ আজ বা ভবিষ্যতের হতে হবে" },
	)
	.refine(
		(dateStr) => {
			const date = new Date(dateStr);
			if (Number.isNaN(date.getTime())) return true; // already caught above
			const maxDate = new Date();
			maxDate.setHours(0, 0, 0, 0);
			maxDate.setDate(maxDate.getDate() + 90);
			return date <= maxDate;
		},
		{ message: "ভাড়া শুরুর তারিখ আজ থেকে ৯০ দিনের মধ্যে হতে হবে" },
	);

export const portalDigitalSignatureSchema = z
	.string({ error: "ডিজিটাল স্বাক্ষর আবশ্যক" })
	.min(1, { message: "ডিজিটাল স্বাক্ষর আবশ্যক" })
	.refine(
		(val) => {
			// Validate non-empty base64 string
			try {
				// Check if it's a valid base64 string (with or without data URI prefix)
				const base64Content = val.includes(",") ? val.split(",")[1] : val;
				if (!base64Content || base64Content.length === 0) return false;
				return /^[A-Za-z0-9+/]+=*$/.test(base64Content);
			} catch {
				return false;
			}
		},
		{ message: "ডিজিটাল স্বাক্ষর সঠিক ফরম্যাটে নেই" },
	);

export const registrationFormSchema = z.object({
	fullName: z
		.string({ error: "পূর্ণ নাম আবশ্যক" })
		.min(1, { message: "পূর্ণ নাম আবশ্যক" })
		.max(100, { message: "পূর্ণ নাম সর্বোচ্চ ১০০ অক্ষরের হতে হবে" }),

	phone: portalPhoneSchema,

	nidNumber: portalNidSchema,

	nidPhoto: z
		.string({ error: "NID ছবি আবশ্যক" })
		.min(1, { message: "NID ছবি আবশ্যক" })
		.refine(
			(val) => {
				try {
					const base64Content = val.includes(",") ? val.split(",")[1] : val;
					if (!base64Content || base64Content.length === 0) return false;
					return /^[A-Za-z0-9+/]+=*$/.test(base64Content);
				} catch {
					return false;
				}
			},
			{ message: "NID ছবি সঠিক ফরম্যাটে নেই" },
		),

	selfiePhoto: z
		.string({ error: "সেলফি ছবি আবশ্যক" })
		.min(1, { message: "সেলফি ছবি আবশ্যক" })
		.refine(
			(val) => {
				try {
					const base64Content = val.includes(",") ? val.split(",")[1] : val;
					if (!base64Content || base64Content.length === 0) return false;
					return /^[A-Za-z0-9+/]+=*$/.test(base64Content);
				} catch {
					return false;
				}
			},
			{ message: "সেলফি ছবি সঠিক ফরম্যাটে নেই" },
		),

	bloodGroup: portalBloodGroupEnum,

	occupation: z
		.string({ error: "পেশা আবশ্যক" })
		.min(1, { message: "পেশা আবশ্যক" })
		.max(100, { message: "পেশা সর্বোচ্চ ১০০ অক্ষরের হতে হবে" }),

	familyMembers: z
		.number({ error: "পরিবারের সদস্য সংখ্যা আবশ্যক" })
		.int({ message: "পরিবারের সদস্য সংখ্যা পূর্ণসংখ্যা হতে হবে" })
		.min(1, { message: "পরিবারের সদস্য সংখ্যা কমপক্ষে ১ হতে হবে" })
		.max(20, { message: "পরিবারের সদস্য সংখ্যা সর্বোচ্চ ২০ হতে হবে" }),

	familyMemberNames: z
		.array(z.string().min(1, { message: "সদস্যের নাম আবশ্যক" }))
		.min(1, { message: "পারিবারিক সদস্যের নাম প্রদান করুন" }),

	emergencyContactName: z
		.string({ error: "জরুরি যোগাযোগের নাম আবশ্যক" })
		.min(1, { message: "জরুরি যোগাযোগের নাম আবশ্যক" })
		.max(200),

	emergencyContact: portalEmergencyContactSchema,

	emergencyContactRelationship: z
		.string({ error: "সম্পর্ক আবশ্যক" })
		.min(1, { message: "সম্পর্ক আবশ্যক" })
		.max(100),

	rentalStartDate: portalRentalStartDateSchema,

	advanceAmount: z
		.number({ error: "অগ্রিম পরিমাণ আবশ্যক" })
		.min(0, { message: "অগ্রিম পরিমাণ ০ বা তার বেশি হতে হবে" })
		.max(99_999_999, {
			message: "অগ্রিম পরিমাণ সর্বোচ্চ ৯,৯৯,৯৯,৯৯৯ হতে হবে",
		}),

	digitalSignature: portalDigitalSignatureSchema,
});

export type RegistrationFormInput = z.infer<typeof registrationFormSchema>;

/**
 * Validates registration form input and returns field-level Bangla error messages.
 * Returns `{ success: true, data }` on valid input, or `{ success: false, errors }` with
 * a map of field names to Bangla error messages on invalid input.
 */
export function validateRegistrationForm(input: unknown): {
	success: boolean;
	data?: RegistrationFormInput;
	errors?: Record<string, string>;
} {
	const result = registrationFormSchema.safeParse(input);

	if (result.success) {
		return { success: true, data: result.data };
	}

	const errors: Record<string, string> = {};
	for (const issue of result.error.issues) {
		const field = issue.path.join(".");
		// Only keep the first error per field
		if (!errors[field]) {
			errors[field] = issue.message;
		}
	}

	return { success: false, errors };
}
