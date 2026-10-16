import { z } from "zod";

export const PHONE_REGEX = /^01[3-9]\d{8}$/;
export const NID_REGEX = /^(\d{10}|\d{13}|\d{17})$/;

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
});

export const bdPhoneSchema = z
  .string()
  .transform((val) => {
    let cleaned = val.replace(/[\s\-()]/g, "");
    if (cleaned.startsWith("+880")) {
      cleaned = `0${cleaned.substring(4)}`;
    } else if (cleaned.startsWith("880")) {
      cleaned = `0${cleaned.substring(3)}`;
    }
    return cleaned;
  })
  .pipe(
    z.string().regex(PHONE_REGEX, {
      message: "Phone number must be 11 digits starting with 01",
    }),
  );

export const nidSchema = z
  .string()
  .transform((val) => val.replace(/[\s-]/g, ""))
  .pipe(
    z.string().regex(NID_REGEX, {
      message: "NID must be 10, 13, or 17 numeric digits",
    }),
  );

export const emailSchema = z
  .string()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((val) => /[A-Z]/.test(val), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((val) => /[a-z]/.test(val), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((val) => /\d/.test(val), {
    message: "Password must contain at least one digit",
  });
