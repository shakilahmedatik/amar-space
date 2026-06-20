"use client";

import { BulkQrDownloadButton } from "@/components/qr-code/bulk-qr-download-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorFeedback } from "@/components/ui/error-feedback";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSession } from "@/contexts/session-context";
import {
	useBuilding,
	useBuildingFlats,
	useUpdateBuilding,
} from "@/hooks/use-buildings";
import type { FlatSummary } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BuildingEditForm } from "../__components/building-edit-form";

export default function BuildingDetailPage() {
	const { role } = useSession();
	const { t } = useTranslation();
	const params = useParams();
	const buildingId = params.id as string;
	const [isEditing, setIsEditing] = useState(false);
	const [flatPage, setFlatPage] = useState(1);
	const [successMessage, setSuccessMessage] = useState("");
	const [formError, setFormError] = useState("");

	const { data: building, isLoading, isError, error } = useBuilding(buildingId);
	const { data: flatsData, isLoading: isLoadingFlats } = useBuildingFlats(
		buildingId,
		flatPage,
		50,
	);
	const updateMutation = useUpdateBuilding(buildingId);

	const isOwner = role === "owner";
	const isOwnerOrManager = role === "owner" || role === "manager";

	async function handleSave(data: Record<string, unknown>) {
		try {
			await updateMutation.mutateAsync(data);
			setSuccessMessage(t("buildings.updateSuccess"));
			setIsEditing(false);
		} catch (err) {
			setFormError(
				err instanceof Error ? err.message : t("buildings.saveError"),
			);
		}
	}

	function handleCancel() {
		setIsEditing(false);
		setFormError("");
	}

	const flatColumns: DataTableColumn<FlatSummary>[] = [
		{
			key: "flatNumber",
			header: t("flats.flatNumber"),
			render: (row) => (
				<Link
					href={`/flats/${row.id}`}
					className="text-brand-blue-deep font-medium no-underline hover:underline"
				>
					{row.flatNumber}
				</Link>
			),
		},
		{
			key: "floor",
			header: t("flats.floor"),
			render: (row) => <span>{row.floor}</span>,
			width: "100px",
		},
		{
			key: "status",
			header: t("flats.status"),
			render: (row) => <StatusBadge status={row.status} />,
			width: "160px",
		},
	];

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
			{formError && (
				<ErrorFeedback
					message={formError}
					type="error"
					visible
					onDismiss={() => setFormError("")}
				/>
			)}
			{isError && (
				<ErrorFeedback
					message={error?.message || t("buildings.loadError")}
					type="error"
					visible
				/>
			)}

			<div className="mb-6">
				<Link
					href="/buildings"
					className="text-sm text-steel no-underline hover:underline"
				>
					← {t("common.back")}
				</Link>
			</div>

			{isLoading ? (
				<LoadingSkeleton rows={6} showHeader />
			) : building ? (
				<>
					<Card className="bg-canvas border-hairline mb-8">
						<CardContent className="p-6">
							<div className="flex items-center justify-between mb-6 flex-wrap gap-3">
								<h1 className="text-2xl font-bold text-ink">
									{isEditing
										? t("buildings.editBuilding")
										: t("buildings.buildingDetail")}
								</h1>

								{isOwner && !isEditing && (
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsEditing(true)}
										className="rounded-full min-h-11 text-brand-blue-deep border-brand-blue-deep cursor-pointer"
									>
										{t("common.edit")}
									</Button>
								)}

								{isOwnerOrManager && !isEditing && (
									<BulkQrDownloadButton
										buildingId={buildingId}
										buildingName={building.name}
									/>
								)}
							</div>

							{isEditing ? (
								<BuildingEditForm
									building={building}
									onSave={handleSave}
									onCancel={handleCancel}
									isPending={updateMutation.isPending}
								/>
							) : (
								<div className="flex flex-col gap-6">
									{building.coverImageUrl && (
										<div className="relative w-full aspect-3/1 rounded-lg overflow-hidden border border-hairline">
											<Image
												src={building.coverImageUrl}
												alt={`${building.name} Cover`}
												className="object-cover"
												fill
												unoptimized
											/>
										</div>
									)}

									<div className="flex items-start gap-6 flex-col sm:flex-row">
										{building.logoUrl && (
											<div className="relative w-20 h-20 rounded-full overflow-hidden border border-hairline shrink-0 bg-white shadow-sm">
												<Image
													src={building.logoUrl}
													alt={`${building.name} Logo`}
													className="object-cover"
													fill
													unoptimized
												/>
											</div>
										)}
										<div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))] flex-1 w-full">
											<div>
												<p className="text-xs font-medium text-steel mb-1">
													{t("buildings.buildingName")}
												</p>
												<p className="text-base font-semibold text-ink">
													{building.name}
												</p>
											</div>
											<div>
												<p className="text-xs font-medium text-steel mb-1">
													{t("buildings.address")}
												</p>
												<p className="text-base text-ink">{building.address}</p>
											</div>
											<div>
												<p className="text-xs font-medium text-steel mb-1">
													{t("buildings.totalFloors")}
												</p>
												<p className="text-base text-ink">
													{building.totalFloors ?? "—"}
												</p>
											</div>
											{building.whatsappGroupLink && (
												<div>
													<p className="text-xs font-medium text-steel mb-1">
														{t("buildings.whatsappGroupLink")}
													</p>
													<a
														href={building.whatsappGroupLink}
														target="_blank"
														rel="noopener noreferrer"
														className="text-brand-blue-deep font-semibold text-sm hover:underline inline-flex items-center gap-1 break-all"
													>
														{building.whatsappGroupLink}
													</a>
												</div>
											)}
											{building.managerPhone && (
												<div>
													<p className="text-xs font-medium text-steel mb-1">
														{t("buildings.managerPhone")}
													</p>
													<a
														href={`tel:${building.managerPhone}`}
														className="text-brand-blue-deep font-semibold text-sm hover:underline inline-flex items-center gap-1"
													>
														{building.managerPhone}
													</a>
												</div>
											)}
										</div>
									</div>

									{building.rules && (
										<div className="border-t border-hairline pt-6">
											<h2 className="text-lg font-semibold text-ink mb-2">
												{t("buildings.buildingRules")}
											</h2>
											<p className="text-sm text-charcoal whitespace-pre-line leading-relaxed">
												{building.rules}
											</p>
										</div>
									)}

									{building.emergencyContacts &&
										building.emergencyContacts.length > 0 && (
											<div className="border-t border-hairline pt-6">
												<h2 className="text-lg font-semibold text-ink mb-4">
													{t("buildings.emergencyContacts")}
												</h2>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													{building.emergencyContacts.map((contact) => (
														<div
															key={contact.id}
															className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-surface p-4"
														>
															<div className="flex flex-col">
																<span className="text-base font-medium text-ink">
																	{contact.name}
																</span>
																<span className="text-xs text-steel">
																	{contact.role} •{" "}
																	{contact.type === "building"
																		? t("buildings.buildingType")
																		: t("buildings.nearbyType")}
																</span>
															</div>
															{contact.phone && (
																<a
																	href={`tel:${contact.phone}`}
																	className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-brand-blue-deep px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-blue-deep/90"
																>
																	{contact.phone}
																</a>
															)}
														</div>
													))}
												</div>
											</div>
										)}
								</div>
							)}
						</CardContent>
					</Card>

					<div>
						<h2 className="text-xl font-semibold text-ink mb-4">
							{t("buildings.flatsInBuilding")}
						</h2>

						{isLoadingFlats ? (
							<LoadingSkeleton rows={5} showHeader />
						) : (
							<DataTable<FlatSummary>
								columns={flatColumns}
								data={flatsData?.data ?? []}
								getRowKey={(row) => row.id}
								pagination={
									flatsData
										? {
												total: flatsData.total,
												page: flatsData.page,
												pageSize: flatsData.pageSize,
											}
										: undefined
								}
								onPageChange={setFlatPage}
								loading={isLoadingFlats}
								emptyMessage={t("flats.noFlats")}
							/>
						)}
					</div>
				</>
			) : null}
		</>
	);
}
