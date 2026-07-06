"use client";

import { DashboardLayout } from "@/components/layout";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { SessionProvider, useSession } from "@/contexts/session-context";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Shared layout for all authenticated dashboard pages.
 * Renders the sidebar/navbar once — only the content area swaps on navigation.
 * This eliminates full-page re-renders when clicking sidebar links.
 */
function DashboardLayoutInner({ children }: { children: ReactNode }) {
	const { user, role, isLoading, error } = useSession();
	const pathname = usePathname();
	const router = useRouter();

	if (isLoading) {
		return (
			<div className="flex h-dvh items-center justify-center bg-surface">
				<div className="w-full max-w-md px-4">
					<LoadingSkeleton rows={5} showHeader />
				</div>
			</div>
		);
	}

	if (error || !user) {
		// If there is an error or no user, SessionProvider has already initiated a redirect to /login.
		// Returning null prevents rendering children that require a user, avoiding cascading errors.
		return null;
	}

	return (
		<DashboardLayout
			role={role}
			activePath={pathname}
			onNavigate={(href) => router.push(href)}
		>
			{children}
		</DashboardLayout>
	);
}

export default function AuthenticatedLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<SessionProvider>
			<DashboardLayoutInner>{children}</DashboardLayoutInner>
		</SessionProvider>
	);
}
