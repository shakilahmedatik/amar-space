"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "@/lib/i18n";
import { useCallback } from "react";

interface ConfirmDialogProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	destructive?: boolean;
	loading?: boolean;
}

/**
 * Confirmation dialog for destructive actions.
 * Uses shadcn AlertDialog. 44x44px minimum touch targets.
 */
export function ConfirmDialog({
	open,
	onClose,
	onConfirm,
	title,
	description,
	confirmLabel,
	cancelLabel,
	destructive = true,
	loading = false,
}: ConfirmDialogProps) {
	const { t } = useTranslation();

	const resolvedConfirmLabel = confirmLabel || t("common.confirm");
	const resolvedCancelLabel = cancelLabel || t("common.cancel");

	const handleConfirm = useCallback(() => {
		if (!loading) onConfirm();
	}, [onConfirm, loading]);

	return (
		<AlertDialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel
						onClick={onClose}
						className="min-h-11 rounded-full"
					>
						{resolvedCancelLabel}
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={loading}
						className={
							destructive
								? "min-h-11 rounded-full bg-error-text text-on-dark opacity-100 disabled:opacity-70"
								: "min-h-11 rounded-full opacity-100 disabled:opacity-70"
						}
					>
						{loading ? t("common.loading") : resolvedConfirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
