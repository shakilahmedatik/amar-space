import imageCompression from "browser-image-compression";

/**
 * Converts a file to base64, optionally compressing it if it's an image.
 */
export async function compressImageFile(file: File): Promise<File> {
	if (!file.type.startsWith("image/")) {
		return file;
	}
	try {
		const options = {
			maxSizeMB: 1, // Max size 1MB
			maxWidthOrHeight: 1920,
			useWebWorker: true,
		};
		return await imageCompression(file, options);
	} catch (error) {
		console.error("Error compressing image:", error);
		// Fallback to original file on compression failure
		return file;
	}
}

export async function fileToBase64(
	file: File,
	compress = true,
): Promise<string> {
	let fileToProcess = file;

	if (compress && file.type.startsWith("image/")) {
		fileToProcess = await compressImageFile(file);
	}

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(fileToProcess);
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = (error) => reject(error);
	});
}
