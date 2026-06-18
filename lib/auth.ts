import { db } from "@/lib/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;
const FIFTEEN_MINUTES_IN_SECONDS = 15 * 60;

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		usePlural: true,
	}),
	secret: process.env.AUTH_SECRET,
	baseURL: process.env.AUTH_BASE_URL,
	trustedOrigins: process.env.AUTH_TRUSTED_ORIGINS
		? process.env.AUTH_TRUSTED_ORIGINS.split(",")
		: undefined,
	emailAndPassword: { enabled: true },
	user: {
		additionalFields: {
			role: {
				type: "string",
				required: false,
				defaultValue: "owner",
				input: false,
			},
			ownerAccountId: {
				type: "string",
				required: false,
				input: false,
			},
		},
	},
	session: {
		expiresIn: SEVEN_DAYS_IN_SECONDS,
		updateAge: 0,
	},
	rateLimit: {
		enabled: true,
		window: FIFTEEN_MINUTES_IN_SECONDS,
		max: 100,
		customRules: {
			"/sign-in/email": {
				window: FIFTEEN_MINUTES_IN_SECONDS,
				max: 5,
			},
			"/sign-up/email": {
				window: FIFTEEN_MINUTES_IN_SECONDS,
				max: 10,
			},
		},
	},
});
