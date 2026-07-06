"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./button";

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallbackMessage?: string;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);
	}

	resetError = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-hairline bg-error-bg p-8 text-center w-full h-full min-h-[200px]">
					<AlertCircle className="h-10 w-10 text-error-text" aria-hidden />
					<h3 className="text-base font-semibold text-error-text">
						{this.props.fallbackMessage || "সমস্যা হয়েছে"}
					</h3>
					<p className="text-sm text-steel">
						{this.state.error?.message ||
							"লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।"}
					</p>
					<Button
						type="button"
						variant="outline"
						onClick={this.resetError}
						className="mt-2 min-h-10"
					>
						<RefreshCw className="mr-2 h-4 w-4" aria-hidden />
						আবার চেষ্টা করুন
					</Button>
				</div>
			);
		}

		return this.props.children;
	}
}
