import { db, schema } from "@omniheaven/db";
import {
  renderEmailVerificationTemplate,
  renderPasswordResetTemplate,
  sendEmail,
} from "@omniheaven/email";
import { env } from "@omniheaven/env";
import { createLogger } from "@omniheaven/logger";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";

const logger = createLogger("auth");

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;
const FIFTEEN_MINUTES_IN_SECONDS = 15 * 60;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: {
      users: schema.users,
      sessions: schema.sessions,
      accounts: schema.accounts,
      verifications: schema.verifications,
      organizations: schema.organizations,
      members: schema.members,
      invitations: schema.invitations,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: env.AUTH_TRUSTED_ORIGINS.split(",").map((o) => o.trim()),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Allows immediate testing while verification link is delivered
    sendResetPassword: async ({ user, url }) => {
      logger.info({ userId: user.id, email: user.email }, "Dispatching password reset email");
      await sendEmail({
        to: user.email,
        subject: "Reset your omniHeaven password",
        html: renderPasswordResetTemplate({ name: user.name, url }),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      logger.info({ userId: user.id, email: user.email }, "Dispatching verification email");
      await sendEmail({
        to: user.email,
        subject: "Verify your omniHeaven email",
        html: renderEmailVerificationTemplate({ name: user.name, url }),
      });
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
    }),
  ],
  user: {
    additionalFields: {
      globalRole: {
        type: "string",
        required: false,
        defaultValue: "user",
        // Never accept this from the client. Role elevation is a server-only
        // operation (seed/bootstrap scripts); otherwise any sign-up request
        // could grant itself platform superadmin.
        input: false,
      },
    },
  },
  session: {
    expiresIn: SEVEN_DAYS_IN_SECONDS,
    updateAge: 24 * 60 * 60,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: env.COOKIE_DOMAIN || undefined,
    },
    useSecureCookies: env.NODE_ENV === "production",
  },
  rateLimit: {
    enabled: true,
    window: FIFTEEN_MINUTES_IN_SECONDS,
    max: 100,
  },
});

export { hashPassword, verifyPassword } from "better-auth/crypto";
export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
