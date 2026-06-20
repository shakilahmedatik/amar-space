import { apiFetch } from "../api";

export interface UserProfile {
	id: string;
	email: string;
	name: string;
	role: string;
	phone: string | null;
	languagePreference: string;
	createdAt: string;
}

export interface UpdateLanguageResponse {
	success: boolean;
	language: string;
}

export function fetchUserProfile(): Promise<UserProfile> {
	return apiFetch<UserProfile>("/api/settings/profile");
}

export function updateLanguagePreference(
	language: "bn" | "en",
): Promise<UpdateLanguageResponse> {
	return apiFetch<UpdateLanguageResponse>("/api/settings/language", {
		method: "PUT",
		body: JSON.stringify({ language }),
	});
}
