"use client";

import { Button } from "@/components/ui/button";
import { ErrorFeedback } from "@/components/ui/error-feedback";
import { useQrCode } from "@/hooks/use-qr-code";
import { useTranslation } from "@/lib/i18n";
import { downloadBlob, getQrFilename, printQrCode } from "@/lib/qr-code-utils";
import { cn } from "@/lib/utils";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, Printer, X } from "lucide-react";
import { useCallback, useId, useState } from "react";
import { QrCodePreview } from "./qr-code-preview";
import { SizeSelector } from "./size-selector";

interface QrCodeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	flatId: string;
	flatNumber: string;
	buildingName: string;
}

const MAX_RETRIES = 3;

/**
 * QR Code Dialog component for previewing, downloading, and printing QR codes.
 * Built on @radix-ui/react-dialog with full accessibility support.
 * Responsive: full-screen sheet below 640px, centered modal above.
 */
export function QrCodeDialog({
	open,
	onOpenChange,
	flatId,
	flatNumber,
	buildingName,
}: QrCodeDialogProps) {
	const { t } = useTranslation();
	const titleId = useId();
	const [size, setSize] = useState(300);
	const [feedback, setFeedback] = useState<{
		message: string;
		type: "success" | "error";
	} | null>(null);

	const { blobUrl, isLoading, error, retryCount, retry } = useQrCode({
		flatId,
		size,
		enabled: open,
	});

	const isActionDisabled = isLoading || !!error || !blobUrl;

	const handleDownload = useCallback(async () => {
		if (!blobUrl) return;

		try {
			const response = await fetch(blobUrl);
			const blob = await response.blob();
			downloadBlob(blob, getQrFilename(flatNumber));
			setFeedback({ message: t("qrCode.downloadSuccess"), type: "success" });
		} catch {
			setFeedback({ message: t("qrCode.downloadError"), type: "error" });
		}
	}, [blobUrl, flatNumber, t]);

	const handlePrint = useCallback(() => {
		if (!blobUrl) return;
		printQrCode(blobUrl, flatNumber, buildingName);
	}, [blobUrl, flatNumber, buildingName]);

	return (
		<>
			<ErrorFeedback
				message={feedback?.message ?? ""}
				type={feedback?.type ?? "error"}
				visible={!!feedback}
				duration={4000}
				onDismiss={() => setFeedback(null)}
			/>

			<Dialog.Root open={open} onOpenChange={onOpenChange}>
				<Dialog.Portal>
					<Dialog.Overlay
						className={cn(
							"fixed inset-0 z-50 bg-black/80",
							"data-[state=open]:animate-in data-[state=closed]:animate-out",
							"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
						)}
					/>
					<Dialog.Content
						aria-labelledby={titleId}
						className={cn(
							// Mobile: full-screen sheet
							"fixed inset-0 z-50 flex flex-col bg-background p-6 overflow-y-auto",
							// Desktop: centered modal
							"sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]",
							"sm:max-w-[480px] sm:w-full sm:max-h-[90vh] sm:rounded-xl sm:border sm:shadow-lg",
							// Animation
							"data-[state=open]:animate-in data-[state=closed]:animate-out",
							"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
							"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
							"sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]",
							"sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]",
						)}
					>
						{/* Header */}
						<div className="flex items-center justify-between mb-6">
							<Dialog.Title id={titleId} className="text-lg font-semibold">
								{t("qrCode.dialogTitle")}
							</Dialog.Title>
							<Dialog.Close asChild>
								<Button
									variant="ghost"
									size="icon"
									className="min-h-11 min-w-[44px] rounded-full"
									aria-label={t("qrCode.close")}
								>
									<X className="h-4 w-4" />
								</Button>
							</Dialog.Close>
						</div>

						{/* Size Selector */}
						<div className="mb-6">
							<p className="text-sm font-medium mb-2">
								{t("qrCode.sizeLabel")}
							</p>
							<SizeSelector
								value={size}
								onChange={setSize}
								disabled={isLoading}
							/>
						</div>

						{/* QR Code Preview */}
						<div className="flex-1 flex items-center justify-center mb-6">
							<QrCodePreview
								blobUrl={blobUrl}
								flatNumber={flatNumber}
								buildingName={buildingName}
								isLoading={isLoading}
								error={error}
								retryCount={retryCount}
								maxRetries={MAX_RETRIES}
								onRetry={retry}
							/>
						</div>

						{/* Action Buttons */}
						<div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
							<Button
								onClick={handleDownload}
								disabled={isActionDisabled}
								className="min-h-11 min-w-[44px] w-full sm:w-auto rounded-full"
							>
								<Download className="h-4 w-4" />
								{t("qrCode.download")}
							</Button>
							<Button
								variant="outline"
								onClick={handlePrint}
								disabled={isActionDisabled}
								className="min-h-11 min-w-[44px] w-full sm:w-auto rounded-full"
							>
								<Printer className="h-4 w-4" />
								{t("qrCode.print")}
							</Button>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	);
}
