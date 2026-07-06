"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorFeedback } from "@/components/ui/error-feedback";
import { FormField, FormInput } from "@/components/ui/form-field";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useSession } from "@/contexts/session-context";
import {
	useApproveRegistration,
	useRegistrationRequests,
	useRejectRegistration,
} from "@/hooks/use-registration-requests";
import { useRenters } from "@/hooks/use-renters";
import type { RegistrationRequest, RenterListItem } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
	AlertCircle,
	Briefcase,
	Calendar,
	Check,
	CreditCard,
	Eye,
	FileText,
	Loader2,
	Phone,
	User,
	Users,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";

export default function RentersPage() {
	const { role } = useSession();
	const { t } = useTranslation();
	const [activeTab, setActiveTab] = useState<"active" | "pending">("active");
	const [page, setPage] = useState(1);

	// Fetch lists
	const {
		data: activeData,
		isLoading: isActiveLoading,
		isError: isActiveError,
		error: activeError,
	} = useRenters(page, 50, { enabled: activeTab === "active" });

	const {
		data: pendingData,
		isLoading: isPendingLoading,
		isError: isPendingError,
		error: pendingError,
	} = useRegistrationRequests();

	const canRegister = role === "owner" || role === "manager";

	// Pending count for tab bubble
	const pendingRequests = pendingData?.data ?? [];
	const pendingCount = pendingRequests.length;

	const activeColumns = useMemo<DataTableColumn<RenterListItem>[]>(
		() => [
			{
				key: "fullName",
				header: t("renters.fullName"),
				render: (row) => (
					<Link
						href={`/renters/${row.id}`}
						className="text-brand-blue-deep font-medium no-underline hover:underline"
					>
						{row.fullName}
					</Link>
				),
			},
			{
				key: "phone",
				header: t("renters.phone"),
				render: (row) => <span>{row.phone}</span>,
			},
			{
				key: "flatNumber",
				header: t("renters.flat"),
				render: (row) => <span>{row.flatNumber}</span>,
				width: "120px",
			},
			{
				key: "buildingName",
				header: t("renters.building"),
				render: (row) => <span>{row.buildingName}</span>,
			},
		],
		[t],
	);

	// Approval review states
	const [selectedRequest, setSelectedRequest] =
		useState<RegistrationRequest | null>(null);
	const [isReviewOpen, setIsReviewOpen] = useState(false);

	const handleOpenReview = (request: RegistrationRequest) => {
		setSelectedRequest(request);
		setIsReviewOpen(true);
	};

	const handleCloseReview = () => {
		setSelectedRequest(null);
		setIsReviewOpen(false);
	};

	return (
		<>
			{activeTab === "active" && isActiveError && (
				<ErrorFeedback
					message={activeError?.message || t("renters.loadError")}
					type="error"
					visible
				/>
			)}

			{activeTab === "pending" && isPendingError && (
				<ErrorFeedback
					message={pendingError?.message || "আবেদনগুলো লোড করা যায়নি।"}
					type="error"
					visible
				/>
			)}

			<div className="flex items-center justify-between mb-6 flex-wrap gap-4">
				<h1 className="text-2xl font-bold text-ink">{t("renters.title")}</h1>

				{canRegister && activeTab === "active" && (
					<Button
						asChild
						className="min-h-11 rounded-full bg-primary text-on-primary font-semibold hover:opacity-90 transition-opacity"
					>
						<Link href="/renters/new">{t("renters.registerRenter")}</Link>
					</Button>
				)}
			</div>

			{/* Tabs Layout */}
			{canRegister && (
				<div className="flex border-b border-hairline mb-6">
					<button
						type="button"
						onClick={() => setActiveTab("active")}
						className={cn(
							"px-4 py-2 text-base font-semibold border-b-2 transition-all duration-200",
							activeTab === "active"
								? "border-brand-blue-deep text-brand-blue-deep"
								: "border-transparent text-steel hover:text-ink",
						)}
					>
						সক্রিয় ভাড়াটিয়া
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("pending")}
						className={cn(
							"px-4 py-2 text-base font-semibold border-b-2 transition-all duration-200 flex items-center gap-2",
							activeTab === "pending"
								? "border-brand-blue-deep text-brand-blue-deep"
								: "border-transparent text-steel hover:text-ink",
						)}
					>
						<span>অপেক্ষমাণ আবেদন</span>
						{pendingCount > 0 && (
							<span className="bg-error-text text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
								{pendingCount}
							</span>
						)}
					</button>
				</div>
			)}

			{/* Render active renters */}
			{activeTab === "active" &&
				(isActiveLoading ? (
					<LoadingSkeleton rows={8} showHeader />
				) : (
					<DataTable<RenterListItem>
						columns={activeColumns}
						data={activeData?.data ?? []}
						getRowKey={(row) => row.id}
						pagination={
							activeData
								? {
										total: activeData.total,
										page: activeData.page,
										pageSize: activeData.pageSize,
									}
								: undefined
						}
						onPageChange={setPage}
						loading={isActiveLoading}
						emptyMessage={t("renters.noRenters")}
					/>
				))}

			{/* Render pending registrations */}
			{activeTab === "pending" &&
				(isPendingLoading ? (
					<LoadingSkeleton rows={4} showHeader />
				) : pendingRequests.length === 0 ? (
					<div className="flex flex-col items-center justify-center p-12 bg-surface rounded-xl border border-hairline text-center shadow-sm">
						<FileText className="h-12 w-12 text-steel mb-3" />
						<p className="text-base text-steel font-medium">
							কোনো অপেক্ষমাণ নিবন্ধন আবেদন নেই
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{pendingRequests.map((req) => (
							<div
								key={req.id}
								className="flex gap-4 p-5 bg-white border border-hairline rounded-xl shadow-sm hover:shadow-md transition-shadow relative"
							>
								<div className="shrink-0">
									{req.selfiePhotoUrl ? (
										<img
											src={req.selfiePhotoUrl}
											alt={req.fullName}
											className="h-16 w-16 rounded-full object-cover border-2 border-hairline"
										/>
									) : (
										<div className="h-16 w-16 rounded-full bg-surface border-2 border-hairline flex items-center justify-center text-steel">
											<User className="h-8 w-8" />
										</div>
									)}
								</div>

								<div className="flex-1 min-w-0">
									<h3 className="text-base font-bold text-ink truncate">
										{req.fullName}
									</h3>
									<p className="text-base text-steel flex items-center gap-1 mt-1">
										<Phone className="h-3.5 w-3.5" />
										{req.phone}
									</p>
									<div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-base text-ink">
										<div>
											<span className="text-steel font-medium">ভবন: </span>
											{req.buildingName || "N/A"}
										</div>
										<div>
											<span className="text-steel font-medium">ফ্ল্যাট: </span>
											{req.flatNumber || "N/A"}
										</div>
										<div>
											<span className="text-steel font-medium">তারিখ: </span>
											{req.rentalStartDate}
										</div>
										<div>
											<span className="text-steel font-medium">অগ্রিম: </span>৳
											{Number.parseFloat(req.advanceAmount).toLocaleString()}
										</div>
									</div>
								</div>

								<button
									type="button"
									onClick={() => handleOpenReview(req)}
									className="absolute right-4 top-4 flex min-h-9 items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-hairline text-base text-ink font-semibold hover:bg-surface-dark transition-colors active:scale-95"
								>
									<Eye className="h-4 w-4" />
									পর্যালোচনা
								</button>
							</div>
						))}
					</div>
				))}

			{/* Review Dialog */}
			{selectedRequest && (
				<ApproveRegistrationDialog
					open={isReviewOpen}
					request={selectedRequest}
					onClose={handleCloseReview}
				/>
			)}
		</>
	);
}

/**
 * Detailed application review and approve/reject dialog.
 */
function ApproveRegistrationDialog({
	open,
	request,
	onClose,
}: {
	open: boolean;
	request: RegistrationRequest;
	onClose: () => void;
}) {
	const approveMutation = useApproveRegistration();
	const rejectMutation = useRejectRegistration();
	const [monthlyRent, setMonthlyRent] = useState("");
	const [advanceAmount, setAdvanceAmount] = useState(request.advanceAmount);
	const [startDate, setStartDate] = useState(request.rentalStartDate);

	// Default utility charges
	const [gasBill, setGasBill] = useState("0");
	const [waterBill, setWaterBill] = useState("0");
	const [serviceCharge, setServiceCharge] = useState("0");
	const [otherCharges, setOtherCharges] = useState("0");

	const [errorMsg, setErrorMsg] = useState("");

	const [showRejectConfirm, setShowRejectConfirm] = useState(false);

	useEffect(() => {
		if (open) {
			setMonthlyRent("");
			setAdvanceAmount(request.advanceAmount);
			setStartDate(request.rentalStartDate);
			setGasBill("0");
			setWaterBill("0");
			setServiceCharge("0");
			setOtherCharges("0");
			setErrorMsg("");
			setShowRejectConfirm(false);
		}
	}, [open, request]);

	const handleReject = async () => {
		try {
			await rejectMutation.mutateAsync(request.id);
			onClose();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "বাতিলকরণে ত্রুটি হয়েছে।";
			setErrorMsg(msg);
		} finally {
			setShowRejectConfirm(false);
		}
	};

	const handleApproveSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMsg("");

		const rent = Number.parseFloat(monthlyRent);
		const adv = Number.parseFloat(advanceAmount);
		const gas = Number.parseFloat(gasBill) || 0;
		const water = Number.parseFloat(waterBill) || 0;
		const service = Number.parseFloat(serviceCharge) || 0;
		const other = Number.parseFloat(otherCharges) || 0;

		if (Number.isNaN(rent) || rent <= 0) {
			setErrorMsg("অনুগ্রহ করে সঠিক মাসিক ভাড়ার পরিমাণ দিন (০ থেকে বেশি)।");
			return;
		}

		if (Number.isNaN(adv) || adv < 0) {
			setErrorMsg("অনুগ্রহ করে সঠিক অগ্রিম পরিমাণ দিন।");
			return;
		}

		if (!startDate) {
			setErrorMsg("অনুগ্রহ করে ভাড়া শুরুর তারিখ নির্বাচন করুন।");
			return;
		}

		try {
			await approveMutation.mutateAsync({
				id: request.id,
				data: {
					monthlyRent: rent,
					advanceAmount: adv,
					startDate,
					gasBill: gas,
					waterBill: water,
					serviceCharge: service,
					otherCharges: other,
				},
			});
			onClose();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "অনুমোদনে ত্রুটি হয়েছে।";
			setErrorMsg(msg);
		}
	};

	const isLoading = approveMutation.isPending || rejectMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-2xl bg-white p-6 rounded-xl overflow-y-auto max-h-[90vh]">
				<DialogHeader>
					<DialogTitle className="text-lg font-bold text-ink">
						ভাড়াটিয়া আবেদন পর্যালোচনা
					</DialogTitle>
					<DialogDescription className="text-base text-steel">
						{request.fullName}-এর আবেদন পর্যালোচনা করে চুক্তি ও সার্ভিস চার্জ সেট করুন।
					</DialogDescription>
				</DialogHeader>

				{errorMsg && (
					<div
						className="flex items-center gap-2 bg-error-bg border border-error-text/20 p-3 rounded-lg text-base text-error-text"
						role="alert"
					>
						<AlertCircle className="h-5 w-5 shrink-0" />
						<span>{errorMsg}</span>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4 border-b border-hairline pb-6">
					{/* Tenant Profile details */}
					<div className="flex flex-col gap-3">
						<h4 className="text-base font-bold text-ink">আবেদনকারীর তথ্য:</h4>
						<div className="flex items-center gap-3">
							{request.selfiePhotoUrl ? (
								<div className="relative group">
									<img
										src={request.selfiePhotoUrl}
										alt="সেলফি"
										className="h-16 w-16 rounded-full object-cover border-2 border-hairline bg-white shadow-sm"
									/>
									<a
										href={request.selfiePhotoUrl}
										target="_blank"
										rel="noreferrer"
										className="absolute inset-0 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
									>
										দেখুন
									</a>
								</div>
							) : (
								<div className="h-16 w-16 rounded-full bg-surface border flex items-center justify-center text-steel">
									<User className="h-8 w-8" />
								</div>
							)}
							<div>
								<p className="text-base font-bold text-ink">
									{request.fullName}
								</p>
								<p className="text-base text-steel flex items-center gap-1">
									<Phone className="h-3.5 w-3.5" />
									{request.phone}
								</p>
							</div>
						</div>

						<div className="flex flex-col gap-1.5 text-base text-ink">
							<p>
								<span className="text-steel font-medium">NID নম্বর: </span>
								{request.nidNumber}
							</p>
							<p>
								<span className="text-steel font-medium">রক্তের গ্রুপ: </span>
								{request.bloodGroup}
							</p>
							<p>
								<span className="text-steel font-medium">পরিবারের সদস্য: </span>
								{request.familyMembers} জন
							</p>
							<p>
								<span className="text-steel font-medium">ফ্ল্যাট: </span>
								{request.buildingName} - {request.flatNumber}
							</p>
						</div>
					</div>

					{/* Emergency Contact */}
					<div className="flex flex-col gap-3">
						<h4 className="text-base font-bold text-ink">জরুরী যোগাযোগ:</h4>
						<div className="flex flex-col gap-1.5 text-base text-ink bg-surface p-4 rounded-lg border border-hairline">
							<p>
								<span className="text-steel font-medium">নাম: </span>
								{request.emergencyContactName}
							</p>
							<p>
								<span className="text-steel font-medium">সম্পর্ক: </span>
								{request.emergencyContactRelationship}
							</p>
							<p className="flex items-center gap-1 mt-1">
								<Phone className="h-3.5 w-3.5 text-steel" />
								{request.emergencyContact}
							</p>
						</div>

						{/* Document Links */}
						{(request.nidPhotoUrl || request.digitalSignatureUrl) && (
							<div className="mt-2 flex gap-3">
								{request.nidPhotoUrl && (
									<a
										href={request.nidPhotoUrl}
										target="_blank"
										rel="noreferrer"
										className="text-sm font-medium text-brand-blue hover:underline flex items-center gap-1"
									>
										<FileText className="h-4 w-4" />
										NID দেখুন
									</a>
								)}
								{request.digitalSignatureUrl && (
									<a
										href={request.digitalSignatureUrl}
										target="_blank"
										rel="noreferrer"
										className="text-sm font-medium text-brand-blue hover:underline flex items-center gap-1"
									>
										<FileText className="h-4 w-4" />
										স্বাক্ষর দেখুন
									</a>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Approval Form */}
				<form onSubmit={handleApproveSubmit} className="flex flex-col gap-4">
					<h3 className="text-base font-bold text-ink">
						অনুমোদন সেটিংস ও সার্ভিস চার্জ:
					</h3>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<FormField
							label="মাসিক ভাড়া (টাকা)"
							required
							htmlFor="modal-monthlyRent"
							icon={<CreditCard className="h-4 w-4 text-steel" />}
						>
							<FormInput
								id="modal-monthlyRent"
								type="number"
								value={monthlyRent}
								onChange={(e) => setMonthlyRent(e.target.value)}
								placeholder="ভাড়ার পরিমাণ লিখুন"
								required
								min={1}
							/>
						</FormField>

						<FormField
							label="অগ্রিম পরিমাণ (টাকা)"
							required
							htmlFor="modal-advanceAmount"
							icon={<CreditCard className="h-4 w-4 text-steel" />}
						>
							<FormInput
								id="modal-advanceAmount"
								type="number"
								value={advanceAmount}
								onChange={(e) => setAdvanceAmount(e.target.value)}
								placeholder="অগ্রিম পরিমাণ"
								required
								min={0}
							/>
						</FormField>

						<FormField
							label="ভাড়া শুরুর তারিখ"
							required
							htmlFor="modal-startDate"
							icon={<Calendar className="h-4 w-4 text-steel" />}
						>
							<FormInput
								id="modal-startDate"
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								required
							/>
						</FormField>

						<FormField
							label="সার্ভিস চার্জ (টাকা)"
							htmlFor="modal-serviceCharge"
							icon={<Briefcase className="h-4 w-4 text-steel" />}
						>
							<FormInput
								id="modal-serviceCharge"
								type="number"
								value={serviceCharge}
								onChange={(e) => setServiceCharge(e.target.value)}
								placeholder="সার্ভিস চার্জ"
								min={0}
							/>
						</FormField>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-dashed border-hairline pt-4 mt-2">
						<FormField label="গ্যাস বিল (ফিক্সড)" htmlFor="modal-gasBill">
							<FormInput
								id="modal-gasBill"
								type="number"
								value={gasBill}
								onChange={(e) => setGasBill(e.target.value)}
								min={0}
							/>
						</FormField>

						<FormField label="পানি বিল (ফিক্সড)" htmlFor="modal-waterBill">
							<FormInput
								id="modal-waterBill"
								type="number"
								value={waterBill}
								onChange={(e) => setWaterBill(e.target.value)}
								min={0}
							/>
						</FormField>

						<FormField label="অন্যান্য চার্জ" htmlFor="modal-otherCharges">
							<FormInput
								id="modal-otherCharges"
								type="number"
								value={otherCharges}
								onChange={(e) => setOtherCharges(e.target.value)}
								min={0}
							/>
						</FormField>
					</div>

					<DialogFooter className="mt-6 border-t border-hairline pt-4 flex gap-3 justify-end flex-row">
						<button
							type="button"
							onClick={() => setShowRejectConfirm(true)}
							disabled={isLoading}
							className="flex min-h-11 items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-error-text/30 bg-error-bg text-base text-error-text font-semibold hover:bg-error-text/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
						>
							<X className="h-5 w-5" />
							আবেদন বাতিল
						</button>

						<button
							type="submit"
							disabled={isLoading}
							className="flex-1 sm:flex-none flex min-h-11 items-center justify-center gap-1.5 px-6 py-2.5 rounded-lg bg-brand-blue-deep text-base text-white font-semibold hover:bg-brand-blue-deep/90 transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{isLoading ? (
								<>
									<Loader2 className="h-5 w-5 animate-spin" />
									অনুমোদন হচ্ছে...
								</>
							) : (
								<>
									<Check className="h-5 w-5" />
									অনুমোদন ও সক্রিয় করুন
								</>
							)}
						</button>
					</DialogFooter>
				</form>
			</DialogContent>

			<ConfirmDialog
				open={showRejectConfirm}
				onClose={() => setShowRejectConfirm(false)}
				onConfirm={handleReject}
				title="আবেদন বাতিল"
				description="আপনি কি নিশ্চিত যে আপনি এই আবেদনটি বাতিল করতে চান?"
				destructive
				loading={rejectMutation.isPending}
			/>
		</Dialog>
	);
}
