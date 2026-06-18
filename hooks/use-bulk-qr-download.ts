"use client";

import { BASE_URL } from "@/lib/api";
import { downloadBlob, getBulkQrFilename } from "@/lib/qr-code-utils";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";

interface UseBulkQrDownloadOptions {
	buildingId: string;
	buildingName: string;
}

interface BulkQrFeedback {
	message: string;
	type: "error" | "success";
	visible: boolean;
}

interface UseBulkQrDownloadReturn {
	download: () => void;
	isDownloading: boolean;
	feedback: BulkQrFeedback | null;
	dismissFeedback: () => void;
}

/**
 * TanStack Query mutation hook for downloading all QR codes for a building as a ZIP.
 * Handles 30-second timeout, file download trigger, and error feedback.
 */
export function useBulkQrDownload({
	buildingId,
	buildingName,
}: UseBulkQrDownloadOptions): UseBulkQrDownloadReturn {
	const [feedback, setFeedback] = useState<BulkQrFeedback | null>(null);

	const dismissFeedback = useCallback(() => {
		setFeedback(null);
	}, []);

	const mutation = useMutation<Blob, Error>({
		mutationFn: async () => {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30_000);

			try {
				const response = await fetch(
					`${BASE_URL}/api/buildings/${buildingId}/qr-codes?size=300`,
					{
						credentials: "include",
						signal: controller.signal,
					},
				);

				if (!response.ok) {
					const status = response.status;
					if (status === 403) {
						throw new Error("PERMISSION_DENIED");
					}
					if (status === 404) {
						throw new Error("NO_QR_CODES");
					}
					if (status >= 500) {
						throw new Error("SERVER_ERROR");
					}
					throw new Error("DOWNLOAD_FAILED");
				}

				return await response.blob();
			} finally {
				clearTimeout(timeoutId);
			}
		},
		onSuccess: (blob) => {
			const filename = getBulkQrFilename(buildingName);
			downloadBlob(blob, filename);
			setFeedback({
				message: "BULK_DOWNLOAD_SUCCESS",
				type: "success",
				visible: true,
			});
		},
		onError: (error) => {
			let message: string;

			if (error.name === "AbortError") {
				message = "CONNECTION_ERROR";
			} else {
				switch (error.message) {
					case "PERMISSION_DENIED":
						message = "PERMISSION_DENIED";
						break;
					case "NO_QR_CODES":
						message = "NO_QR_CODES";
						break;
					case "SERVER_ERROR":
						message = "SERVER_ERROR";
						break;
					default:
						message = "CONNECTION_ERROR";
						break;
				}
			}

			setFeedback({
				message,
				type: "error",
				visible: true,
			});
		},
	});

	const download = useCallback(() => {
		setFeedback(null);
		mutation.mutate();
	}, [mutation]);

	return {
		download,
		isDownloading: mutation.isPending,
		feedback,
		dismissFeedback,
	};
}
