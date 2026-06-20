"use client";

import { Button } from "@/components/ui/button";
import { FormField, FormInput } from "@/components/ui/form-field";
import {
	useApplyAdjustment,
	useUnpaidBillsForContract,
} from "@/hooks/use-deposits";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { type FormEvent, useCallback, useState } from "react";

interface DepositAdjustmentFormProps {
	contractId: string;
	remainingBalance: number;
	onSuccess?: () => void;
}

/**
 * Adjustment form (Owner only) with amount, optional bill link, and note.
 * Amount must be min 0.01 and must not exceed remaining balance.
 * Note max 500 chars.
 */
export function DepositAdjustmentForm({
	contractId,
	remainingBalance,
	onSuccess,
}: DepositAdjustmentFormProps) {
	const { t } = useTranslation();
	const [amount, setAmount] = useState("");
	const [billId, setBillId] = useState("");
	const [note, setNote] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [successMessage, setSuccessMessage] = useState("");

	const { data: billsData } = useUnpaidBillsForContract(contractId);
	const adjustMutation = useApplyAdjustment(contractId);

	const validate = useCallback((): boolean => {
		const newErrors: Record<string, string> = {};

		const amountNum = Number.parseFloat(amount);
		if (!amount || Number.isNaN(amountNum)) {
			newErrors.amount = t("deposits.amountRequired");
		} else if (amountNum < 0.01) {
			newErrors.amount = t("deposits.amountMin");
		} else if (amountNum > remainingBalance) {
			newErrors.amount = t("deposits.amountExceedsBalance");
		}

		if (note.length > 500) {
			newErrors.note = t("deposits.noteMaxLength");
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	}, [amount, note, remainingBalance, t]);

	const handleSubmit = useCallback(
		(e: FormEvent) => {
			e.preventDefault();
			setSuccessMessage("");

			if (!validate()) return;

			const data: { amount: number; billId?: string; note?: string } = {
				amount: Number.parseFloat(amount),
			};
			if (billId) data.billId = billId;
			if (note.trim()) data.note = note.trim();

			adjustMutation.mutate(data, {
				onSuccess: () => {
					setAmount("");
					setBillId("");
					setNote("");
					setErrors({});
					setSuccessMessage(t("deposits.adjustSuccess"));
					onSuccess?.();
				},
				onError: (err) => {
					setErrors({ form: err.message || t("deposits.adjustError") });
				},
			});
		},
		[amount, billId, note, validate, adjustMutation, t, onSuccess],
	);

	const unpaidBills = billsData?.data || [];

	return (
		<div className="p-6 rounded-lg border border-hairline bg-canvas mb-6">
			<h2 className="text-lg font-semibold text-ink-strong mb-4 pb-2 border-b border-hairline">
				{t("deposits.applyAdjustment")}
			</h2>

			{successMessage && (
				<div
					role="status"
					className="px-4 py-3 rounded-md bg-success-bg border border-success-text/30 text-success-text text-sm mb-4 min-h-section-sm flex items-center"
				>
					{successMessage}
				</div>
			)}

			{errors.form && (
				<div
					role="alert"
					className="px-4 py-3 rounded-md bg-error-bg border border-error-text/30 text-error-text text-sm mb-4 min-h-section-sm flex items-center"
				>
					{errors.form}
				</div>
			)}

			<form onSubmit={handleSubmit}>
				<FormField
					label={t("deposits.amount")}
					error={errors.amount}
					required
					htmlFor="adjustment-amount"
				>
					<FormInput
						id="adjustment-amount"
						type="number"
						step="0.01"
						min="0.01"
						max={remainingBalance}
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						hasError={!!errors.amount}
						placeholder="0.00"
						aria-describedby={
							errors.amount ? "adjustment-amount-error" : undefined
						}
					/>
				</FormField>

				<FormField label={t("deposits.billLink")} htmlFor="adjustment-bill">
					<select
						id="adjustment-bill"
						value={billId}
						onChange={(e) => setBillId(e.target.value)}
						className="block w-full px-3 py-2.5 text-base leading-normal rounded-md border border-hairline bg-canvas text-ink min-h-11 focus:outline-none focus:ring-2 focus:ring-primary/50"
					>
						<option value="">{t("deposits.noBillLink")}</option>
						{unpaidBills.map((bill) => (
							<option key={bill.id} value={bill.id}>
								{bill.billingMonth} — {t("deposits.outstanding")}: ৳
								{(bill.outstanding ?? 0).toFixed(2)}
							</option>
						))}
					</select>
				</FormField>

				<FormField
					label={t("deposits.note")}
					error={errors.note}
					htmlFor="adjustment-note"
				>
					<textarea
						id="adjustment-note"
						value={note}
						onChange={(e) => setNote(e.target.value)}
						maxLength={500}
						placeholder={t("deposits.notePlaceholder")}
						rows={3}
						className={cn(
							"block w-full px-3 py-2.5 text-base leading-normal rounded-md border border-hairline bg-canvas text-ink resize-vertical min-h-section-lg focus:outline-none focus:ring-2 focus:ring-primary/50",
							errors.note && "border-error-text bg-error-bg",
						)}
						aria-invalid={!!errors.note || undefined}
					/>
				</FormField>

				<div className="flex justify-end">
					<Button
						type="submit"
						disabled={adjustMutation.isPending}
						className="rounded-full min-h-11 px-6"
					>
						{adjustMutation.isPending
							? t("common.loading")
							: t("deposits.applyAdjustment")}
					</Button>
				</div>
			</form>
		</div>
	);
}
