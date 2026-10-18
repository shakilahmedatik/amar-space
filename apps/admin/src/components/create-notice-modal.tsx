"use client";

import { Button, Card, Input } from "@omniheaven/ui";
import { AlertTriangle, Bell, Loader2, Send, X } from "lucide-react";
import { useState } from "react";
import { trpc } from "../lib/trpc";

interface CreateNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateNoticeModal({ isOpen, onClose, onSuccess }: CreateNoticeModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetAudience, setTargetAudience] = useState<
    "all_renters" | "specific_building" | "specific_flat" | "managers_only"
  >("all_renters");
  const [targetBuildingId, setTargetBuildingId] = useState("");
  const [targetFlatId, setTargetFlatId] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load buildings
  const { data: buildingsData } = trpc.property.listBuildings.useQuery();
  const buildings = buildingsData || [];

  // Load flats if building selected
  const { data: flatsData } = trpc.property.listFlatsByBuilding.useQuery(
    { buildingId: targetBuildingId },
    { enabled: Boolean(targetBuildingId) && targetAudience === "specific_flat" },
  );
  const flats = flatsData || [];

  const createNoticeMutation = trpc.operations.createNotice.useMutation({
    onSuccess: () => {
      resetForm();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      setErrorMsg(err.message || "Failed to publish notice");
    },
  });

  const resetForm = () => {
    setTitle("");
    setBody("");
    setTargetAudience("all_renters");
    setTargetBuildingId("");
    setTargetFlatId("");
    setIsPinned(false);
    setExpiresAt("");
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || title.trim().length < 3) {
      setErrorMsg("Notice title must be at least 3 characters.");
      return;
    }
    if (!body.trim() || body.trim().length < 10) {
      setErrorMsg("Notice content must be at least 10 characters.");
      return;
    }

    if (targetAudience === "specific_building" && !targetBuildingId) {
      setErrorMsg("Please select a target building.");
      return;
    }

    if (targetAudience === "specific_flat" && !targetFlatId) {
      setErrorMsg("Please select a target flat.");
      return;
    }

    createNoticeMutation.mutate({
      title: title.trim(),
      body: body.trim(),
      targetAudience,
      targetBuildingId: targetBuildingId || null,
      targetFlatId: targetFlatId || null,
      isPinned,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-card border border-border-gold/30 shadow-2xl rounded-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-gold/20 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Bell className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-foreground">
                Publish Building Notice
              </h2>
              <p className="text-xs text-foreground-muted">
                Broadcast announcements, service advisories, and facility alerts
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
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label
              htmlFor="noticeTitle"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Notice Title <span className="text-rose-500">*</span>
            </label>
            <Input
              id="noticeTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled Generator Servicing & Brief Power Interruption"
              className="h-11 text-xs"
              required
            />
          </div>

          {/* Target Audience */}
          <div>
            <label
              htmlFor="targetAudience"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Target Audience
            </label>
            <select
              id="targetAudience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value as any)}
              className="w-full h-11 px-3 text-xs rounded-xl bg-surface border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              <option value="all_renters">All Residents (Entire Portfolio)</option>
              <option value="specific_building">Specific Building Only</option>
              <option value="specific_flat">Specific Flat Only</option>
              <option value="managers_only">Management & Staff Only</option>
            </select>
          </div>

          {/* Specific Building Selector */}
          {(targetAudience === "specific_building" || targetAudience === "specific_flat") && (
            <div>
              <label
                htmlFor="targetBuilding"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Target Building <span className="text-rose-500">*</span>
              </label>
              <select
                id="targetBuilding"
                value={targetBuildingId}
                onChange={(e) => {
                  setTargetBuildingId(e.target.value);
                  setTargetFlatId("");
                }}
                className="w-full h-11 px-3 text-xs rounded-xl bg-surface border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
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
          )}

          {/* Specific Flat Selector */}
          {targetAudience === "specific_flat" && (
            <div>
              <label
                htmlFor="targetFlat"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Target Flat <span className="text-rose-500">*</span>
              </label>
              <select
                id="targetFlat"
                value={targetFlatId}
                onChange={(e) => setTargetFlatId(e.target.value)}
                disabled={!targetBuildingId}
                className="w-full h-11 px-3 text-xs rounded-xl bg-surface border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                required
              >
                <option value="">Select Flat</option>
                {flats.map((f) => (
                  <option key={f.id} value={f.id}>
                    Flat {f.flatNumber} (Floor {f.floor})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notice Body */}
          <div>
            <label
              htmlFor="noticeBody"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Notice Body (Markdown Supported) <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="noticeBody"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write notice text here. You can use markdown like **bold**, *italics*, bullet lists, etc."
              rows={4}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-none font-mono"
              required
            />
          </div>

          {/* Options: Pin & Expiration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="size-4 rounded text-primary focus:ring-primary/20"
              />
              <div className="text-xs">
                <span className="font-semibold text-foreground block">Pin Announcement</span>
                <span className="text-[10px] text-foreground-muted">
                  Always highlight at top of notice board
                </span>
              </div>
            </label>

            <div>
              <label
                htmlFor="expiresAt"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Expiration Date (Optional)
              </label>
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-11 text-xs"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3 sticky bottom-0 bg-card">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createNoticeMutation.isPending}
              className="h-11 px-5 text-xs min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="luxury"
              disabled={createNoticeMutation.isPending}
              className="h-11 px-6 text-xs font-bold min-h-[44px] flex items-center gap-2"
            >
              {createNoticeMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  Broadcast Notice
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
