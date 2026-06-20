"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { I18nProvider, type Locale } from "./i18n";
import { getQueryClient } from "./query-client";

interface ProvidersProps {
	children: ReactNode;
	/** Locale from server-side user profile (for authenticated users) */
	initialLocale?: Locale;
}

export function Providers({ children, initialLocale }: ProvidersProps) {
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			<I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>
		</QueryClientProvider>
	);
}
