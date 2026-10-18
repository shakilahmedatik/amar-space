"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import type React from "react";
import { useState } from "react";
import { OrganizationProvider } from "../lib/organization-context";
import { trpc } from "../lib/trpc";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/trpc`,
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
          headers() {
            const headers: Record<string, string> = {};
            if (typeof window !== "undefined") {
              const activeOrgId = localStorage.getItem("omniheaven_active_org_id");
              if (activeOrgId) {
                headers["x-organization-id"] = activeOrgId;
              }
            }
            return headers;
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <OrganizationProvider>{children}</OrganizationProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
