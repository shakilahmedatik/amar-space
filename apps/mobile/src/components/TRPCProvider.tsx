"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import type React from "react";
import { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import type { PropertyType } from "../types";

export function MobileTRPCProvider({
  children,
  propertyType,
}: {
  children: React.ReactNode;
  propertyType: PropertyType;
}) {
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

  const activeOrgId = propertyType === "hotel" ? "org-grand-haven" : "org-bashundhara-tower";

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: `${process.env.EXPO_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/trpc`,
            headers() {
              return {
                "x-organization-id": activeOrgId,
              };
            },
            fetch(url, options) {
              return fetch(url, {
                ...options,
                credentials: "include",
              });
            },
          }),
        ],
      }),
    [activeOrgId],
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
