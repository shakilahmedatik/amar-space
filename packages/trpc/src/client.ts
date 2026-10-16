import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "./routers/app";

export function createOmniTRPCClient(baseUrl: string, getToken?: () => string | null | undefined) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        headers() {
          const token = getToken?.();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}

export type { AppRouter };
