"use client";

import {
	type CreateNoticeTemplateInput,
	type UpdateNoticeTemplateInput,
	createNoticeTemplate,
	deleteNoticeTemplate,
	fetchNoticeTemplate,
	fetchNoticeTemplates,
	updateNoticeTemplate,
} from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_STALE_TIME } from "./constants";

export function useNoticeTemplates() {
	return useQuery({
		queryKey: ["notice-templates"],
		queryFn: () => fetchNoticeTemplates(),
		staleTime: DEFAULT_STALE_TIME,
	});
}

export function useNoticeTemplate(id: string) {
	return useQuery({
		queryKey: ["notice-templates", id],
		queryFn: () => fetchNoticeTemplate(id),
		enabled: !!id,
		staleTime: DEFAULT_STALE_TIME,
	});
}

export function useCreateNoticeTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateNoticeTemplateInput) => createNoticeTemplate(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notice-templates"] });
		},
	});
}

export function useUpdateNoticeTemplate(templateId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: UpdateNoticeTemplateInput) =>
			updateNoticeTemplate(templateId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["notice-templates", templateId],
			});
			queryClient.invalidateQueries({ queryKey: ["notice-templates"] });
		},
	});
}

export function useDeleteNoticeTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => deleteNoticeTemplate(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notice-templates"] });
		},
	});
}
