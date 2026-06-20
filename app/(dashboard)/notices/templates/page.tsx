"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorFeedback } from "@/components/ui/error-feedback";
import { FormInput } from "@/components/ui/form-field";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
	useDeleteNoticeTemplate,
	useNoticeTemplates,
} from "@/hooks/use-notice-templates";
import type { NoticeTemplate } from "@/lib/api-client";
import { updateNoticeTemplate } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

export default function NoticeTemplatesPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { data, isLoading, isError, error } = useNoticeTemplates();
	const deleteMutation = useDeleteNoticeTemplate();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState("");

	const updateMutation = useMutation({
		mutationFn: ({ id, name }: { id: string; name: string }) =>
			updateNoticeTemplate(id, { name }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notice-templates"] });
			setEditingId(null);
			setEditName("");
			setSuccessMessage(t("notices.templateUpdated"));
		},
	});

	function startEdit(template: NoticeTemplate) {
		setEditingId(template.id);
		setEditName(template.name);
	}

	function cancelEdit() {
		setEditingId(null);
		setEditName("");
	}

	async function handleSaveEdit(template: NoticeTemplate) {
		if (!editName.trim()) return;
		updateMutation.mutate({
			id: template.id,
			name: editName.trim(),
		});
	}

	async function handleDelete() {
		if (!deleteId) return;
		deleteMutation.mutate(deleteId, {
			onSuccess: () => {
				setDeleteId(null);
				setSuccessMessage(t("notices.templateDeleted"));
			},
		});
	}

	const columns: DataTableColumn<NoticeTemplate>[] = [
		{
			key: "name",
			header: t("notices.templateName"),
			render: (row) =>
				editingId === row.id ? (
					<FormInput
						type="text"
						value={editName}
						onChange={(e) => setEditName(e.target.value)}
						className="max-w-xs"
					/>
				) : (
					<span className="font-medium text-ink-strong">{row.name}</span>
				),
		},
		{
			key: "title",
			header: t("notices.noticeTitle"),
			render: (row) => <span className="text-ink">{row.title || "—"}</span>,
		},
		{
			key: "targetAudience",
			header: t("notices.targetAudience"),
			render: (row) => (
				<span className="text-[0.8125rem] text-ink">
					{audienceLabels[row.targetAudience as keyof typeof audienceLabels] ||
						row.targetAudience}
				</span>
			),
		},
		{
			key: "actions",
			header: "",
			render: (row) =>
				editingId === row.id ? (
					<div className="flex gap-2">
						<Button
							type="button"
							size="sm"
							onClick={() => handleSaveEdit(row)}
							disabled={!editName.trim()}
							className="rounded-full text-xs"
						>
							{t("common.save")}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={cancelEdit}
							className="rounded-full text-xs"
						>
							{t("common.cancel")}
						</Button>
					</div>
				) : (
					<div className="flex gap-2">
						<Button
							asChild
							variant="outline"
							size="sm"
							className="rounded-full text-xs"
						>
							<Link href={`/notices/new?templateId=${row.id}`}>
								{t("notices.useTemplate")}
							</Link>
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => startEdit(row)}
							className="rounded-full text-xs"
						>
							{t("common.edit")}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setDeleteId(row.id)}
							className="rounded-full text-xs border-error-text text-error-text hover:bg-error-bg"
						>
							{t("common.delete")}
						</Button>
					</div>
				),
			width: "280px",
		},
	];

	const audienceLabels: Record<string, string> = {
		all_renters: t("notices.allRenters"),
		specific_building: t("notices.specificBuilding"),
		specific_flat: t("notices.specificFlat"),
		managers_only: t("notices.managersOnly"),
	};

	return (
		<>
			{successMessage && (
				<ErrorFeedback
					message={successMessage}
					type="success"
					visible
					onDismiss={() => setSuccessMessage("")}
				/>
			)}
			{isError && (
				<ErrorFeedback
					message={error?.message || t("notices.loadError")}
					type="error"
					visible
				/>
			)}

			<div className="flex items-center justify-between mb-6 flex-wrap gap-4">
				<h1 className="text-2xl font-bold text-ink-strong">
					{t("notices.templatesTitle")}
				</h1>
				<div className="flex gap-3">
					<Button asChild variant="outline" className="min-h-11 rounded-full">
						<Link href="/notices">{t("common.back")}</Link>
					</Button>
					<Button
						asChild
						className="min-h-11 rounded-full bg-primary text-on-primary font-semibold"
					>
						<Link href="/notices/new">{t("notices.createNotice")}</Link>
					</Button>
				</div>
			</div>

			{isLoading ? (
				<LoadingSkeleton rows={5} showHeader />
			) : (
				<Card>
					<CardContent className="p-6">
						<DataTable<NoticeTemplate>
							columns={columns}
							data={data?.data ?? []}
							getRowKey={(row) => row.id}
							loading={isLoading}
							emptyMessage={t("notices.noTemplates")}
						/>
					</CardContent>
				</Card>
			)}

			<ConfirmDialog
				open={!!deleteId}
				title={t("notices.deleteTemplateTitle")}
				description={t("notices.deleteTemplateDescription")}
				onConfirm={handleDelete}
				onClose={() => setDeleteId(null)}
				loading={deleteMutation.isPending}
			/>
		</>
	);
}
