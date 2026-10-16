import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";

export function createOmniAuthClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    plugins: [organizationClient()],
  });
}
