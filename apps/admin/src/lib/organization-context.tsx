"use client";

import type { ProductType } from "@omniheaven/validators";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { trpc } from "./trpc";

export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  productType: ProductType;
  logo?: string | null;
  role?: string;
}

// Fallback fixtures for preview/offline mode
export const DEFAULT_DEMO_ORG: OrganizationInfo = {
  id: "org-hotel-demo-01",
  name: "Grand Haven Luxury Resort",
  slug: "grand-haven",
  productType: "hotel",
  role: "owner",
};

export const DEMO_ORGANIZATIONS: OrganizationInfo[] = [
  DEFAULT_DEMO_ORG,
  {
    id: "org-building-demo-02",
    name: "Lakeview Residence Tower",
    slug: "lakeview-tower",
    productType: "building",
    role: "owner",
  },
];

interface OrganizationContextValue {
  organizations: OrganizationInfo[];
  activeOrg: OrganizationInfo;
  activeOrgId: string;
  productType: ProductType;
  isLoading: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
  isCreateModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
  isInviteModalOpen: boolean;
  setInviteModalOpen: (open: boolean) => void;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [activeOrgId, setActiveOrgId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("omniheaven_active_org_id") || DEFAULT_DEMO_ORG.id;
    }
    return DEFAULT_DEMO_ORG.id;
  });

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);

  // tRPC query to fetch user organizations
  const { data: serverOrgs, isLoading } = trpc.organization.listMyOrganizations.useQuery(
    undefined,
    {
      retry: false,
      staleTime: 60_000,
    },
  );

  const switchActiveMutation = trpc.organization.switchActive.useMutation();

  const router = useRouter();

  // Combine server orgs or fallback to demo orgs
  const organizations: OrganizationInfo[] = useMemo(() => {
    if (serverOrgs && serverOrgs.length > 0) {
      return serverOrgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        productType: o.productType as ProductType,
        logo: o.logo,
        role: o.role,
      }));
    }
    // Only fallback if query hasn't finished or in pure offline preview
    if (serverOrgs && serverOrgs.length === 0) {
      return [];
    }
    return DEMO_ORGANIZATIONS;
  }, [serverOrgs]);

  // Keep activeOrg in sync
  const activeOrg: OrganizationInfo = useMemo(() => {
    const found = organizations.find((o) => o.id === activeOrgId);
    if (found) return found;
    return organizations[0] ?? DEFAULT_DEMO_ORG;
  }, [organizations, activeOrgId]);

  // Ensure activeOrgId is valid once organizations are loaded
  useEffect(() => {
    if (organizations.length > 0 && !organizations.some((o) => o.id === activeOrgId)) {
      const nextId = organizations[0]?.id ?? DEFAULT_DEMO_ORG.id;
      setActiveOrgId(nextId);
      if (typeof window !== "undefined") {
        localStorage.setItem("omniheaven_active_org_id", nextId);
      }
    }
  }, [organizations, activeOrgId]);

  // If user is authenticated but has 0 organizations, redirect to /onboarding
  useEffect(() => {
    if (!isLoading && serverOrgs && serverOrgs.length === 0) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/onboarding")) {
        router.push("/onboarding");
      }
    }
  }, [isLoading, serverOrgs, router]);

  const switchOrganization = async (newOrgId: string) => {
    try {
      setActiveOrgId(newOrgId);
      if (typeof window !== "undefined") {
        localStorage.setItem("omniheaven_active_org_id", newOrgId);
      }

      // If user is connected to backend, perform switchActive RPC
      if (serverOrgs?.some((o) => o.id === newOrgId)) {
        await switchActiveMutation.mutateAsync({ organizationId: newOrgId });
      }

      // Invalidate all cached queries so new org's data is freshly fetched
      await queryClient.invalidateQueries();
    } catch (err) {
      console.error("Failed to switch organization:", err);
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        activeOrg,
        activeOrgId: activeOrg.id,
        productType: activeOrg.productType,
        isLoading,
        switchOrganization,
        isCreateModalOpen,
        setCreateModalOpen,
        isInviteModalOpen,
        setInviteModalOpen,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
