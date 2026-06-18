/**
 * Replaces non-alphanumeric characters (except Bengali Unicode U+0980–U+09FF
 * and hyphens) with underscores. Used for generating safe filenames from flat
 * numbers and building names.
 */
export function sanitizeFilename(input: string): string {
	return input.replace(/[^a-zA-Z0-9\u0980-\u09FF-]/g, "_");
}

/**
 * Generates the download filename for a single flat QR code.
 */
export function getQrFilename(flatNumber: string): string {
	return `${sanitizeFilename(flatNumber)}_qr.png`;
}

/**
 * Generates the download filename for a building's bulk QR ZIP.
 */
export function getBulkQrFilename(buildingName: string): string {
	return `${sanitizeFilename(buildingName)}_qr_codes.zip`;
}

/**
 * Triggers a browser file download from a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

/**
 * Opens the browser print dialog with a print layout containing the flat
 * number, building name, and QR code image at minimum 200×200px.
 * Uses a hidden iframe to avoid disrupting the current page layout.
 */
export function printQrCode(
	blobUrl: string,
	flatNumber: string,
	buildingName: string,
): void {
	const iframe = document.createElement("iframe");
	iframe.style.position = "fixed";
	iframe.style.left = "-9999px";
	iframe.style.width = "0";
	iframe.style.height = "0";
	document.body.appendChild(iframe);

	const doc = iframe.contentDocument;
	if (!doc) return;

	doc.open();
	doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR Code - ${flatNumber}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; }
        h1 { font-size: 18px; margin-bottom: 8px; }
        h2 { font-size: 14px; color: #666; margin-bottom: 24px; }
        img { width: 200px; height: 200px; min-width: 200px; min-height: 200px; }
      </style>
    </head>
    <body>
      <h1>${flatNumber}</h1>
      <h2>${buildingName}</h2>
      <img src="${blobUrl}" alt="QR Code" />
    </body>
    </html>
  `);
	doc.close();

	iframe.contentWindow?.focus();
	iframe.contentWindow?.print();

	// Cleanup after print dialog closes
	setTimeout(() => document.body.removeChild(iframe), 1000);
}
