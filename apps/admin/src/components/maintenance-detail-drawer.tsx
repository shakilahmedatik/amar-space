"use client";

import { Badge, Button, Card, CurrencyDisplay, Input, StatusBadge } from "@omniheaven/ui";
import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Play,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "../lib/trpc";

interface MaintenanceDetailDrawerProps {
  requestId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_STEPS = [
  { id: "open", label: "Open" },
  { id: "assigned", label: "Assigned" },
  { id: "in_progress", label: "In Progress" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
] as const;

export function MaintenanceDetailDrawer({
  requestId,
  onClose,
  onUpdated,
}: MaintenanceDetailDrawerProps) {
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [repairCost, setRepairCost] = useState("0.00");
  const [costBilledTo, setCostBilledTo] = useState<"landlord" | "tenant" | "shared">("landlord");
  const [resPhotoInput, setResPhotoInput] = useState("");
  const [resolutionPhotos, setResolutionPhotos] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load ticket details
  const {
    data: ticket,
    isLoading,
    refetch,
  } = trpc.operations.getMaintenanceRequestById.useQuery(
    { requestId: requestId || "" },
    { enabled: Boolean(requestId) },
  );

  // Load organization members for staff assignment
  const { data: members } = trpc.organization.listMembers.useQuery(undefined, {
    enabled: Boolean(requestId),
  });

  // Mutations
  const assignStaffMutation = trpc.operations.assignStaffToRequest.useMutation({
    onSuccess: () => {
      refetch();
      onUpdated();
      setErrorMsg(null);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const updateStatusMutation = trpc.operations.updateRequestStatus.useMutation({
    onSuccess: () => {
      refetch();
      onUpdated();
      setErrorMsg(null);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const resolveTicketMutation = trpc.operations.resolveMaintenanceRequest.useMutation({
    onSuccess: () => {
      setShowResolveForm(false);
      refetch();
      onUpdated();
      setErrorMsg(null);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  if (!requestId) return null;

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.id === ticket?.status);

  const handleAssignStaff = () => {
    if (!selectedStaffId) return;
    assignStaffMutation.mutate({
      requestId,
      staffUserId: selectedStaffId,
    });
  };

  const handleStartWork = () => {
    updateStatusMutation.mutate({
      requestId,
      status: "in_progress",
    });
  };

  const handleCloseTicket = () => {
    updateStatusMutation.mutate({
      requestId,
      status: "closed",
    });
  };

  const handleAddResPhoto = () => {
    if (!resPhotoInput.trim()) return;
    try {
      new URL(resPhotoInput.trim());
      setResolutionPhotos([...resolutionPhotos, resPhotoInput.trim()]);
      setResPhotoInput("");
    } catch {
      setErrorMsg("Please enter a valid URL for the resolution photo.");
    }
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes.trim() || resolutionNotes.trim().length < 5) {
      setErrorMsg("Resolution notes must be at least 5 characters.");
      return;
    }

    resolveTicketMutation.mutate({
      requestId,
      resolutionNotes: resolutionNotes.trim(),
      repairCost,
      costBilledTo,
      resolutionPhotoUrls: resolutionPhotos,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border-gold/30 shadow-2xl rounded-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-gold/20 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 border border-border-gold/30 flex items-center justify-center text-primary">
              <Wrench className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-serif font-bold text-foreground">
                  {ticket?.title || "Maintenance Ticket"}
                </h2>
                {ticket?.status && <StatusBadge status={ticket.status as any} />}
              </div>
              <p className="text-xs text-foreground-muted">Ticket ID: {ticket?.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg hover:bg-surface text-foreground-muted hover:text-foreground flex items-center justify-center transition-colors min-h-[44px] min-w-[44px]"
            aria-label="Close drawer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-foreground-muted text-xs">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span>Loading ticket details...</span>
          </div>
        ) : !ticket ? (
          <div className="p-8 text-center text-xs text-rose-500">
            Ticket not found or access restricted.
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Stepper / Timeline */}
            <div className="p-4 rounded-xl bg-surface border border-border">
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted mb-3">
                Lifecycle Progression
              </p>
              <div className="flex items-center justify-between relative">
                {STATUS_STEPS.map((step, idx) => {
                  const isDone = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  return (
                    <div key={step.id} className="flex flex-col items-center relative z-10">
                      <div
                        className={`size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isCurrent
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                            : isDone
                              ? "bg-emerald-500 text-white"
                              : "bg-surface-elevated text-foreground-muted border border-border"
                        }`}
                      >
                        {isDone ? <Check className="size-3.5" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[10px] font-semibold mt-1.5 ${
                          isCurrent
                            ? "text-primary"
                            : isDone
                              ? "text-foreground"
                              : "text-foreground-muted"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Metadata Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[10px] uppercase font-bold text-foreground-muted block mb-1">
                  Category
                </span>
                <Badge variant="outline" className="text-[11px] font-semibold capitalize">
                  {ticket.category}
                </Badge>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[10px] uppercase font-bold text-foreground-muted block mb-1">
                  Priority
                </span>
                <Badge
                  variant="outline"
                  className={`text-[11px] font-bold capitalize ${
                    ticket.priority === "urgent"
                      ? "text-rose-600 bg-rose-500/10 border-rose-500/20"
                      : ticket.priority === "high"
                        ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
                        : ticket.priority === "medium"
                          ? "text-primary bg-primary/10 border-border-gold/30"
                          : "text-foreground-muted bg-surface border-border"
                  }`}
                >
                  {ticket.priority}
                </Badge>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[10px] uppercase font-bold text-foreground-muted block mb-1">
                  Location
                </span>
                <div className="font-semibold text-foreground truncate">
                  {ticket.flat ? `Flat ${ticket.flat.flatNumber}` : "Common Area"}
                </div>
                <div className="text-[10px] text-foreground-muted truncate">
                  {ticket.building?.name}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[10px] uppercase font-bold text-foreground-muted block mb-1">
                  Reported By
                </span>
                <div className="font-semibold text-foreground truncate">
                  {ticket.requestedBy || ticket.requestedByUser?.name || "Tenant"}
                </div>
                <div className="text-[10px] text-foreground-muted truncate">
                  {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ""}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                Issue Description
              </h4>
              <div className="p-4 rounded-xl bg-surface border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </div>
            </div>

            {/* Issue Photos */}
            {ticket.photoUrls && Array.isArray(ticket.photoUrls) && ticket.photoUrls.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                  Attached Photos ({ticket.photoUrls.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ticket.photoUrls.map((url, idx) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-video rounded-xl overflow-hidden border border-border bg-surface block"
                    >
                      {/* biome-ignore lint/performance/noImgElement: Dynamic user-uploaded external URLs */}
                      <img
                        src={url}
                        alt={`Attachment ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Current Staff Assignment & Dispatch */}
            <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Assigned Technician / Caretaker
                  </h4>
                  <p className="text-[11px] text-foreground-muted">
                    {ticket.assignedToStaff
                      ? `${ticket.assignedToStaff.name || ticket.assignedToStaff.email} is assigned`
                      : "Unassigned. Select a staff member to dispatch."}
                  </p>
                </div>
                {ticket.assignedToStaff && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-primary/10 text-primary border-border-gold/30 font-semibold"
                  >
                    Dispatched
                  </Badge>
                )}
              </div>

              {ticket.status !== "closed" && (
                <div className="flex items-center gap-2 pt-1">
                  <select
                    value={selectedStaffId || ticket.assignedToStaffId || ""}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="flex-1 h-10 px-3 text-xs rounded-xl bg-card border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select team member...</option>
                    {members?.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user?.name || m.user?.email} ({m.role})
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="luxury"
                    onClick={handleAssignStaff}
                    disabled={!selectedStaffId || assignStaffMutation.isPending}
                    className="h-10 px-4 text-xs font-semibold min-h-[40px]"
                  >
                    {assignStaffMutation.isPending ? "Assigning..." : "Assign Staff"}
                  </Button>
                </div>
              )}
            </div>

            {/* Resolution Information (If Resolved or Closed) */}
            {(ticket.status === "resolved" || ticket.status === "closed") && (
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                    <CheckCircle2 className="size-4" />
                    <span>Resolution Report</span>
                  </div>
                  <span className="text-[10px] text-foreground-muted">
                    {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleDateString() : ""}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-surface border border-border text-xs text-foreground whitespace-pre-wrap">
                  {ticket.resolutionNotes || "No resolution notes submitted."}
                </div>

                <div className="flex items-center gap-4 text-xs pt-1">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-foreground-muted block">
                      Repair Cost
                    </span>
                    <CurrencyDisplay
                      amount={Number(ticket.repairCost || "0")}
                      className="text-sm font-bold text-foreground"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-foreground-muted block">
                      Cost Billed To
                    </span>
                    <Badge variant="outline" className="text-[10px] font-semibold capitalize">
                      {ticket.costBilledTo || "Landlord"}
                    </Badge>
                  </div>
                </div>

                {ticket.resolutionPhotoUrls &&
                  Array.isArray(ticket.resolutionPhotoUrls) &&
                  ticket.resolutionPhotoUrls.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] uppercase font-bold text-foreground-muted block">
                        Proof of Work Photos
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ticket.resolutionPhotoUrls.map((url, idx) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative aspect-video rounded-xl overflow-hidden border border-border bg-surface block"
                          >
                            {/* biome-ignore lint/performance/noImgElement: Dynamic user-uploaded external URLs */}
                            <img
                              src={url}
                              alt={`Proof ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Resolve Form Trigger / Form */}
            {ticket.status === "in_progress" && (
              <div className="p-4 rounded-xl border border-border bg-surface space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Resolve This Work Order</h4>
                    <p className="text-[11px] text-foreground-muted">
                      Submit diagnosis, resolution notes, and recorded repair expenses
                    </p>
                  </div>
                  {!showResolveForm && (
                    <Button
                      type="button"
                      onClick={() => setShowResolveForm(true)}
                      className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white min-h-[36px]"
                    >
                      Resolve Work Order
                    </Button>
                  )}
                </div>

                {showResolveForm && (
                  <form
                    onSubmit={handleResolveSubmit}
                    className="space-y-4 pt-2 border-t border-border"
                  >
                    <div>
                      <label
                        htmlFor="resNotes"
                        className="block text-xs font-semibold text-foreground mb-1"
                      >
                        Resolution Notes <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        id="resNotes"
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Explain work performed, parts replaced, and preventive checks..."
                        rows={3}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="costAmount"
                          className="block text-xs font-semibold text-foreground mb-1"
                        >
                          Repair Cost (৳)
                        </label>
                        <Input
                          id="costAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={repairCost}
                          onChange={(e) => setRepairCost(e.target.value)}
                          placeholder="0.00"
                          className="h-10 text-xs"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="billedTo"
                          className="block text-xs font-semibold text-foreground mb-1"
                        >
                          Cost Billed To
                        </label>
                        <select
                          id="billedTo"
                          value={costBilledTo}
                          onChange={(e) => setCostBilledTo(e.target.value as any)}
                          className="w-full h-10 px-3 text-xs rounded-xl bg-card border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="landlord">Landlord (Operating Expense)</option>
                          <option value="tenant">Tenant (Billed on Invoice)</option>
                          <option value="shared">Shared (50% Split)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-foreground mb-1">
                        Proof of Work Photos (Optional)
                      </span>

                      <div className="flex gap-2">
                        <Input
                          value={resPhotoInput}
                          onChange={(e) => setResPhotoInput(e.target.value)}
                          placeholder="https://images.example.com/proof.jpg"
                          className="h-10 text-xs flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddResPhoto}
                          className="h-10 px-3 text-xs"
                        >
                          Add Photo
                        </Button>
                      </div>

                      {resolutionPhotos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {resolutionPhotos.map((url, _i) => (
                            <span
                              key={url}
                              className="text-[11px] p-1.5 rounded bg-card border border-border flex items-center gap-1.5"
                            >
                              <ImageIcon className="size-3 text-primary" />
                              <span className="max-w-[150px] truncate">{url}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowResolveForm(false)}
                        className="h-9 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={resolveTicketMutation.isPending}
                        className="h-9 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                      >
                        {resolveTicketMutation.isPending ? "Submitting..." : "Submit Resolution"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Quick Actions Footer */}
            <div className="pt-4 border-t border-border flex items-center justify-between sticky bottom-0 bg-card">
              <div>
                {ticket.status === "open" || ticket.status === "assigned" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleStartWork}
                    disabled={updateStatusMutation.isPending}
                    className="h-11 px-4 text-xs font-semibold flex items-center gap-1.5 min-h-[44px]"
                  >
                    <Play className="size-3.5 text-amber-500" /> Start Work (In Progress)
                  </Button>
                ) : ticket.status === "resolved" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseTicket}
                    disabled={updateStatusMutation.isPending}
                    className="h-11 px-4 text-xs font-semibold flex items-center gap-1.5 min-h-[44px]"
                  >
                    <Archive className="size-3.5 text-foreground-muted" /> Archive & Close
                  </Button>
                ) : null}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-11 px-6 text-xs min-h-[44px]"
              >
                Close Drawer
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
