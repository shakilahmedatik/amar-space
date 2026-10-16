import { db, schema } from "@omniheaven/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";

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
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.AUTH_BASE_URL || "http://localhost:3001",
  trustedOrigins: process.env.AUTH_TRUSTED_ORIGINS
    ? process.env.AUTH_TRUSTED_ORIGINS.split(",")
    : [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
      ],
  emailAndPassword: {
    enabled: true,
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
      },
    },
  },
  session: {
    expiresIn: SEVEN_DAYS_IN_SECONDS,
    updateAge: 24 * 60 * 60,
  },
  rateLimit: {
    enabled: true,
    window: FIFTEEN_MINUTES_IN_SECONDS,
    max: 100,
  },
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
