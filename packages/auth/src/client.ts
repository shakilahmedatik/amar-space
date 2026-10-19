import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export function createOmniAuthClient(baseURL?: string) {
  const url =
    baseURL ||
    (typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      : "http://localhost:4000");

  return createAuthClient({
    baseURL: url,
    plugins: [organizationClient()],
  });
}

export const authClient = createOmniAuthClient();
export const {
  useSession,
  signIn,
  signUp,
  signOut,
  getSession,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  organization,
} = authClient;
