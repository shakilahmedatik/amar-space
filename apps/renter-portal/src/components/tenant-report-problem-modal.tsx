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

interface TenantReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { id: "plumbing", label: "Plumbing / Water", icon: "🚰" },
  { id: "electrical", label: "Electrical / Power", icon: "⚡" },
  { id: "hvac", label: "AC / Cooling", icon: "💨" },
  { id: "sanitary", label: "Toilet / Drainage", icon: "🚽" },
  { id: "carpentry", label: "Door / Window / Lock", icon: "🚪" },
  { id: "appliance", label: "Kitchen Appliance", icon: "❄️" },
  { id: "general", label: "Other / General", icon: "🔧" },
] as const;

export function TenantReportProblemModal({
  isOpen,
  onClose,
  onSuccess,
}: TenantReportProblemModalProps) {
  const [category, setCategory] = useState<string>("plumbing");
  const [isUrgent, setIsUrgent] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createTicketMutation = trpc.operations.createMyMaintenanceRequest.useMutation({
    onSuccess: () => {
      resetForm();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      setErrorMsg(err.message || "Failed to submit request. Please try again.");
    },
  });

  const resetForm = () => {
    setCategory("plumbing");
    setIsUrgent(false);
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
        setErrorMsg("Maximum of 5 photos allowed.");
        return;
      }
      setPhotoUrls([...photoUrls, photoUrlInput.trim()]);
      setPhotoUrlInput("");
      setErrorMsg(null);
    } catch {
      setErrorMsg("Please enter a valid image URL.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || title.trim().length < 3) {
      setErrorMsg("Please provide a title (at least 3 characters).");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setErrorMsg("Please describe the issue in detail (at least 10 characters).");
      return;
    }

    createTicketMutation.mutate({
      category: category as any,
      priority: isUrgent ? "urgent" : "medium",
      title: title.trim(),
      description: description.trim(),
      photoUrls,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border-gold/40 shadow-2xl rounded-2xl flex flex-col text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-gold/30 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 border border-border-gold/40 flex items-center justify-center text-primary shadow-xs">
              <Wrench className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-foreground">Report a Problem</h2>
              <p className="text-xs text-foreground-muted">
                Our caretaker team will be notified immediately
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Emergency / Urgent Banner */}
          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="size-4 rounded text-rose-600 focus:ring-rose-500/20"
            />
            <div className="text-xs">
              <span className="font-bold text-rose-600 dark:text-rose-400 block flex items-center gap-1.5">
                <AlertTriangle className="size-3.5" /> Urgent Emergency Request
              </span>
              <span className="text-[11px] text-foreground-muted">
                Water pipe burst, severe electrical sparks, gas leak, or security issue
              </span>
            </div>
          </label>

          {/* Category Chips */}
          <div>
            <span className="block text-xs font-semibold text-foreground mb-2">
              What kind of issue is it?
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all min-h-[44px] ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                        : "bg-surface border-border-gold/30 text-foreground hover:border-border-gold/60 hover:bg-surface/80"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="issueTitle"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Brief Summary <span className="text-rose-500">*</span>
            </label>
            <Input
              id="issueTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master bathroom tap leaking continuously"
              className="h-11 text-xs bg-surface border-border-gold/40 text-foreground focus:border-primary focus:ring-primary/20"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="issueDescription"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Detailed Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="issueDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe where the issue is, when it started, and any convenient time for caretaker inspection..."
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-border-gold/40 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              required
            />
          </div>

          {/* Photos */}
          <div>
            <span className="block text-xs font-semibold text-foreground mb-1.5">
              Add Photo URL (Optional)
            </span>
            <div className="flex gap-2">
              <Input
                value={photoUrlInput}
                onChange={(e) => setPhotoUrlInput(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="h-11 text-xs flex-1 bg-surface border-border-gold/40 text-foreground focus:border-primary focus:ring-primary/20"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddPhoto}
                className="h-11 px-3 text-xs shrink-0 min-h-[44px] border-border-gold/40 hover:bg-primary/10"
              >
                <Plus className="size-3.5 text-primary" /> Add
              </Button>
            </div>

            {photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {photoUrls.map((url, idx) => (
                  <span
                    key={url}
                    className="flex items-center gap-1.5 p-1.5 pl-2 rounded bg-surface border border-border-gold/30 text-[11px] text-foreground-muted"
                  >
                    <ImageIcon className="size-3 text-primary" />
                    <span className="max-w-[150px] truncate text-foreground">{url}</span>
                    <button
                      type="button"
                      onClick={() => setPhotoUrls(photoUrls.filter((_, i) => i !== idx))}
                      className="p-1 hover:text-rose-500 text-foreground-muted transition-colors"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-border-gold/30 flex items-center justify-end gap-3 sticky bottom-0 bg-card">
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
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
