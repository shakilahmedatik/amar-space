"use client";

import { Button, Card, Input } from "@omniheaven/ui";
import {
  AlertTriangle,
  Check,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "../lib/trpc";

interface ReportMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { id: "plumbing", label: "Plumbing", icon: "🚰" },
  { id: "electrical", label: "Electrical", icon: "⚡" },
  { id: "generator", label: "Generator", icon: "🔋" },
  { id: "elevator", label: "Elevator", icon: "🛗" },
  { id: "carpentry", label: "Carpentry", icon: "🪚" },
  { id: "sanitary", label: "Sanitary", icon: "🚽" },
  { id: "appliance", label: "Appliance", icon: "❄️" },
  { id: "hvac", label: "HVAC / AC", icon: "💨" },
  { id: "pest_control", label: "Pest Control", icon: "🐜" },
  { id: "general", label: "General", icon: "🔧" },
] as const;

const PRIORITIES = [
  { id: "low", label: "Low", color: "text-foreground-muted border-border" },
  { id: "medium", label: "Medium", color: "text-primary border-border-gold/40 bg-primary/10" },
  { id: "high", label: "High", color: "text-amber-600 border-amber-500/20 bg-amber-500/10" },
  { id: "urgent", label: "Urgent", color: "text-rose-600 border-rose-500/20 bg-rose-500/10" },
] as const;

export function ReportMaintenanceModal({
  isOpen,
  onClose,
  onSuccess,
}: ReportMaintenanceModalProps) {
  const [buildingId, setBuildingId] = useState("");
  const [flatId, setFlatId] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load buildings for selection
  const { data: buildingsData } = trpc.property.listBuildings.useQuery();
  const buildings = buildingsData || [];

  // Load flats for selected building
  const { data: flatsData, isLoading: flatsLoading } = trpc.property.listFlatsByBuilding.useQuery(
    { buildingId },
    { enabled: Boolean(buildingId) },
  );
  const flats = flatsData || [];

  const createTicketMutation = trpc.operations.createMaintenanceRequest.useMutation({
    onSuccess: () => {
      resetForm();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      setErrorMsg(err.message || "Failed to create maintenance ticket");
    },
  });

  const resetForm = () => {
    setBuildingId("");
    setFlatId("");
    setCategory("general");
    setPriority("medium");
    setTitle("");
    setDescription("");
    setPhotoUrls([]);
    setPhotoUrlInput("");
    setErrorMsg(null);
  };

  const handleAddPhoto = () => {
    if (!photoUrlInput.trim()) return;
    try {
      new URL(photoUrlInput.trim());
      if (photoUrls.length >= 5) {
        setErrorMsg("Maximum of 5 photos allowed per request.");
        return;
      }
      setPhotoUrls([...photoUrls, photoUrlInput.trim()]);
      setPhotoUrlInput("");
      setErrorMsg(null);
    } catch {
      setErrorMsg("Please enter a valid URL for the photo (http:// or https://)");
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!buildingId) {
      setErrorMsg("Please select a building.");
      return;
    }
    if (!title.trim() || title.trim().length < 3) {
      setErrorMsg("Title must be at least 3 characters.");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setErrorMsg("Please describe the issue in detail (at least 10 characters).");
      return;
    }

    createTicketMutation.mutate({
      buildingId,
      flatId: flatId || null,
      category: category as any,
      priority,
      title: title.trim(),
      description: description.trim(),
      photoUrls,
    });
  };

  if (!isOpen) return null;

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
              <h2 className="text-base font-serif font-bold text-foreground">
                Report Maintenance Ticket
              </h2>
              <p className="text-xs text-foreground-muted">
                Create a facility repair ticket, assign priority, and dispatch staff
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg hover:bg-surface text-foreground-muted hover:text-foreground flex items-center justify-center transition-colors min-h-[44px] min-w-[44px]"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Building & Flat Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="buildingSelect"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Target Building <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="buildingSelect"
                  value={buildingId}
                  onChange={(e) => {
                    setBuildingId(e.target.value);
                    setFlatId("");
                  }}
                  className="w-full h-11 px-3 py-2 text-xs rounded-xl bg-surface border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  required
                >
                  <option value="">Select Building</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="flatSelect"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Specific Flat / Common Area
              </label>
              <select
                id="flatSelect"
                value={flatId}
                onChange={(e) => setFlatId(e.target.value)}
                disabled={!buildingId || flatsLoading}
                className="w-full h-11 px-3 py-2 text-xs rounded-xl bg-surface border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              >
                <option value="">Building Common Area (Elevator, Lobby, Roof)</option>
                {flats.map((f) => (
                  <option key={f.id} value={f.id}>
                    Flat {f.flatNumber} (Floor {f.floor})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Chips */}
          <div>
            <span className="block text-xs font-semibold text-foreground mb-2">Category</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all min-h-[44px] ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-surface border-border text-foreground hover:bg-surface-elevated"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Selection */}
          <div>
            <span className="block text-xs font-semibold text-foreground mb-2">
              Dispatch Priority
            </span>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((p) => {
                const isSelected = priority === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPriority(p.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center min-h-[44px] ${
                      isSelected
                        ? "ring-2 ring-primary ring-offset-1 bg-surface-elevated"
                        : "opacity-75 hover:opacity-100"
                    } ${p.color}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="ticketTitle"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Issue Title <span className="text-rose-500">*</span>
            </label>
            <Input
              id="ticketTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master bathroom flush inlet leaking"
              className="h-11 text-xs"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="ticketDescription"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Detailed Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="ticketDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what is broken, location details, tenant availability, or emergency symptoms..."
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-none"
              required
            />
          </div>

          {/* Photos */}
          <div>
            <span className="block text-xs font-semibold text-foreground mb-1.5">
              Issue Photo URLs (Optional, max 5)
            </span>
            <div className="flex gap-2">
              <Input
                value={photoUrlInput}
                onChange={(e) => setPhotoUrlInput(e.target.value)}
                placeholder="https://images.example.com/photo.jpg"
                className="h-11 text-xs flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddPhoto}
                className="h-11 px-4 text-xs flex items-center gap-1.5 shrink-0 min-h-[44px]"
              >
                <Plus className="size-3.5" /> Add
              </Button>
            </div>

            {photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {photoUrls.map((url, idx) => (
                  <div
                    key={url}
                    className="flex items-center gap-2 p-1.5 pl-2.5 rounded-lg bg-surface border border-border text-xs text-foreground-muted"
                  >
                    <ImageIcon className="size-3.5 text-primary" />
                    <span className="max-w-[200px] truncate">{url}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="p-1 hover:text-rose-500 text-foreground-muted transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3 sticky bottom-0 bg-card">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createTicketMutation.isPending}
              className="h-11 px-5 text-xs min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="luxury"
              disabled={createTicketMutation.isPending}
              className="h-11 px-6 text-xs font-bold min-h-[44px] flex items-center gap-2"
            >
              {createTicketMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Creating Ticket...
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  Submit Work Order
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
