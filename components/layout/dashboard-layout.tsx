"use client";

import type { ReactNode } from "react";
import { BottomTabBar } from "./bottom-tab-bar";
import type { UserRole } from "./navigation-items";
import { Sidebar } from "./sidebar";
import { TopNavbar } from "./top-navbar";

interface DashboardLayoutProps {
	children: ReactNode;
	role: UserRole;
	activePath: string;
	onNavigate?: (href: string) => void;
}

/**
 * Main authenticated layout wrapper.
 *
 * Responsive behavior:
 * - Mobile (< 768px): Full-width content with BottomTabBar navigation
 * - Desktop (>= 768px): Fixed sidebar + fixed top navbar + scrollable content
 *
 * Requirements satisfied:
 * - 14.1: Mobile-first responsive layout
 * - 14.2: BottomTabBar for mobile, Sidebar for desktop
 * - 14.3: 44x44px minimum touch targets
 * - 14.4: Single-column layout for forms on mobile
 * - 14.5: Tailwind responsive utilities, no fixed pixel widths
 * - 14.7: Minimum 16px body text
 * - 14.8: Line-height 1.6
 * - 16.2: DashboardLayout component
 * - 16.8: Responsive navigation
 */
export function DashboardLayout({
	children,
	role,
	activePath,
	onNavigate,
}: DashboardLayoutProps) {
	return (
		<div className="flex h-dvh w-full overflow-hidden bg-surface">
			{/* Fixed full-height sidebar */}
			<Sidebar role={role} activePath={activePath} onNavigate={onNavigate} />

			{/* Content area with fixed top navbar and scrollable body */}
			<div className="flex-1 min-w-0 flex flex-col h-dvh">
				<TopNavbar onNavigate={onNavigate} />

				<main className="flex-1 overflow-y-auto text-base leading-relaxed pb-[72px] md:pb-0">
					<div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
						{children}
					</div>
				</main>
			</div>

			<BottomTabBar
				role={role}
				activePath={activePath}
				onNavigate={onNavigate}
			/>
		</div>
	);
}
