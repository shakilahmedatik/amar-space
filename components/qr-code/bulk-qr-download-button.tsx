"use client";

import { Button } from "@/components/ui/button";
import { useBulkQrDownload } from "@/hooks/use-bulk-qr-download";
import { useTranslation } from "@/lib/i18n";
import { Download, Loader2 } from "lucide-react";

interface BulkQrDownloadButtonProps {
	buildingId: string;
	buildingName: string;
}

/**
 * Button to download all QR codes for a building as a ZIP file.
 * Only rendered when user role is "owner" or "manager" (visibility controlled by parent).
 * Minimum touch target: 44×44px.
 */
export function BulkQrDownloadButton({
	buildingId,
	buildingName,
}: BulkQrDownloadButtonProps) {
	const { t } = useTranslation();
	const { download, isDownloading } = useBulkQrDownload({
		buildingId,
		buildingName,
	});

	return (
		<Button
			onClick={download}
			disabled={isDownloading}
			className="min-h-11 min-w-[44px] rounded-full"
		>
			{isDownloading ? (
				<Loader2 className="h-4 w-4 animate-spin" />
			) : (
				<Download className="h-4 w-4" />
			)}
			<span>{t("qrCode.bulkDownload")}</span>
		</Button>
	);
}
