"use client";

import { Button } from "@/components/ui/button";
import { ErrorFeedback } from "@/components/ui/error-feedback";
import { useRecordPayment, useUnpaidBills } from "@/hooks/use-payments";
import type { PaymentMethod } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface FormErrors {
	billId?: string;
	amount?: string;
	paymentDate?: string;
	paymentMethod?: string;
	note?: string;
}

/**
 * Payment recording form page — /payments/new
 * Form with amount, date, method, note fields.
 */
export default function RecordPaymentPage() {
	const { t } = useTranslation();
	const _router = useRouter();
	// Form state
	const [billId, setBillId] = useState("");
	const [amount, setAmount] = useState("");
	const [paymentDate, setPaymentDate] = useState("");
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
	const [note, setNote] = useState("");
	const [errors, setErrors] = useState<FormErrors>({});
	const [successMessage, setSuccessMessage] = useState("");

	const { data: billsData, isLoading: billsLoading } = useUnpaidBills();
	const recordMutation = useRecordPayment();
	const validateForm = (): boolean => {
		const newErrors: FormErrors = {};

		if (!billId) {
			newErrors.billId = t("payments.billRequired");
		}

		const amountNum = Number.parseFloat(amount);
		if (!amount || Number.isNaN(amountNum)) {
			newErrors.amount = t("payments.amountRequired");
		} else if (amountNum < 0.01) {
			newErrors.amount = t("payments.amountMin");
		} else if (amountNum > 999999999.99) {
			newErrors.amount = t("payments.amountMax");
		} else {
			// Check max 2 decimal places
			const parts = amount.split(".");
			if (parts[1] && parts[1].length > 2) {
				newErrors.amount = t("payments.amountDecimal");
			}
		}

		if (!paymentDate) {
			newErrors.paymentDate = t("payments.dateRequired");
		} else {
			const selectedDate = new Date(paymentDate);
			const today = new Date();
			today.setHours(23, 59, 59, 999);
			if (selectedDate > today) {
				newErrors.paymentDate = t("payments.dateNotFuture");
			}
			const pastLimit = new Date();
			pastLimit.setDate(pastLimit.getDate() - 365);
			pastLimit.setHours(0, 0, 0, 0);
			if (selectedDate < pastLimit) {
				newErrors.paymentDate = t("payments.datePastLimit");
			}
		}

		if (!paymentMethod) {
			newErrors.paymentMethod = t("payments.methodRequired");
		}

		if (note && note.length > 500) {
			newErrors.note = t("payments.noteMax");
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSuccessMessage("");

		if (!validateForm()) return;

		try {
			await recordMutation.mutateAsync({
				billId,
				amount: Number.parseFloat(amount),
				paymentDate,
				paymentMethod: paymentMethod as PaymentMethod,
				note: note || undefined,
			});
			setSuccessMessage(t("payments.recordSuccess"));
			// Reset form
			setBillId("");
			setAmount("");
			setPaymentDate("");
			setPaymentMethod("");
			setNote("");
			setErrors({});
		} catch {
			// Error is handled by mutation state
		}
	};

	const selectedBill = billsData?.data?.find((b) => b.id === billId);
	const remainingBalance = selectedBill
		? Number(selectedBill.totalAmount) - Number(selectedBill.paidAmount)
		: null;

	useEffect(() => {
		if (remainingBalance !== null && remainingBalance > 0) {
			setAmount(remainingBalance.toFixed(2));
		} else {
			setAmount("");
		}
	}, [remainingBalance]);

	return (
		<>
			{successMessage && (
				<ErrorFeedback message={successMessage} type="success" visible />
			)}
			{recordMutation.isError && (
				<ErrorFeedback
					message={recordMutation.error?.message || t("payments.recordError")}
					type="error"
					visible
				/>
			)}

			<div className="mb-6">
				<Link
					href="/payments"
					className="text-steel text-sm no-underline inline-flex items-center min-h-11"
				>
					← {t("common.back")}
				</Link>
				<h1 className="text-2xl font-bold text-ink mt-2">
					{t("payments.recordPayment")}
				</h1>
			</div>

			<form
				onSubmit={handleSubmit}
				className="max-w-[600px] flex flex-col gap-5"
			>
				{/* Bill Selection */}
				<div>
					<label
						htmlFor="billId"
						className="block text-sm font-medium text-charcoal mb-1.5"
					>
						{t("payments.selectBill")} *
					</label>
					<select
						id="billId"
						value={billId}
						onChange={(e) => setBillId(e.target.value)}
						disabled={billsLoading}
						className={`w-full px-3 py-2.5 text-base rounded-md border bg-canvas text-ink min-h-11 ${
							errors.billId ? "border-error-text" : "border-hairline"
						}`}
					>
						<option value="">{t("payments.selectBillPlaceholder")}</option>
						{(billsData?.data || []).map((bill) => (
							<option key={bill.id} value={bill.id}>
								{bill.billingMonth} — {bill.renterName} ({bill.flatNumber}) — ৳
								{(Number(bill.totalAmount) - Number(bill.paidAmount)).toFixed(
									2,
								)}{" "}
								{t("payments.remaining")}
							</option>
						))}
					</select>
					{errors.billId && (
						<p className="text-error-text text-xs mt-1">{errors.billId}</p>
					)}
					{remainingBalance !== null && (
						<p className="text-steel text-xs mt-1">
							{t("payments.maxPayable")}: ৳{remainingBalance.toFixed(2)}
						</p>
					)}
				</div>

				{/* Amount */}
				<div>
					<label
						htmlFor="amount"
						className="block text-sm font-medium text-charcoal mb-1.5"
					>
						{t("payments.amount")} (৳) *
					</label>
					<input
						id="amount"
						type="number"
						step="0.01"
						min="0.01"
						max="999999999.99"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						placeholder="0.00"
						className={`w-full px-3 py-2.5 text-base rounded-md border bg-canvas text-ink min-h-11 ${
							errors.amount ? "border-error-text" : "border-hairline"
						}`}
					/>
					{errors.amount && (
						<p className="text-error-text text-xs mt-1">{errors.amount}</p>
					)}
				</div>

				{/* Payment Date */}
				<div>
					<label
						htmlFor="paymentDate"
						className="block text-sm font-medium text-charcoal mb-1.5"
					>
						{t("payments.date")} *
					</label>
					<input
						id="paymentDate"
						type="date"
						value={paymentDate}
						onChange={(e) => setPaymentDate(e.target.value)}
						max={new Date().toLocaleDateString("en-CA")}
						className={`w-full px-3 py-2.5 text-base rounded-md border bg-canvas text-ink min-h-11 ${
							errors.paymentDate ? "border-error-text" : "border-hairline"
						}`}
					/>
					{errors.paymentDate && (
						<p className="text-error-text text-xs mt-1">{errors.paymentDate}</p>
					)}
				</div>

				{/* Payment Method */}
				<div>
					<label
						htmlFor="paymentMethod"
						className="block text-sm font-medium text-charcoal mb-1.5"
					>
						{t("payments.method")} *
					</label>
					<select
						id="paymentMethod"
						value={paymentMethod}
						onChange={(e) =>
							setPaymentMethod(e.target.value as PaymentMethod | "")
						}
						className={`w-full px-3 py-2.5 text-base rounded-md border bg-canvas text-ink min-h-11 ${
							errors.paymentMethod ? "border-error-text" : "border-hairline"
						}`}
					>
						<option value="">{t("payments.selectMethod")}</option>
						<option value="cash">{t("payments.cash")}</option>
						<option value="bank_transfer">{t("payments.bankTransfer")}</option>
						<option value="mobile_banking">
							{t("payments.mobileBanking")}
						</option>
					</select>
					{errors.paymentMethod && (
						<p className="text-error-text text-xs mt-1">
							{errors.paymentMethod}
						</p>
					)}
				</div>

				{/* Note (optional) */}
				<div>
					<label
						htmlFor="note"
						className="block text-sm font-medium text-charcoal mb-1.5"
					>
						{t("payments.note")} ({t("payments.optional")})
					</label>
					<textarea
						id="note"
						value={note}
						onChange={(e) => setNote(e.target.value)}
						maxLength={500}
						rows={3}
						placeholder={t("payments.notePlaceholder")}
						className={`w-full px-3 py-2.5 text-base rounded-md border bg-canvas text-ink resize-y min-h-section-lg ${
							errors.note ? "border-error-text" : "border-hairline"
						}`}
					/>
					<p className="text-steel text-xs mt-1">{note.length}/500</p>
					{errors.note && (
						<p className="text-error-text text-xs mt-1">{errors.note}</p>
					)}
				</div>

				{/* Submit Button */}
				<div className="flex gap-3 mt-2">
					<Button
						type="submit"
						disabled={recordMutation.isPending}
						className="rounded-full min-h-11 bg-primary text-on-primary font-semibold disabled:opacity-60"
					>
						{recordMutation.isPending
							? t("common.loading")
							: t("payments.recordPayment")}
					</Button>
					<Button
						asChild
						variant="outline"
						className="rounded-full min-h-11 text-charcoal border-hairline"
					>
						<Link href="/payments">{t("common.cancel")}</Link>
					</Button>
				</div>
			</form>
		</>
	);
}
