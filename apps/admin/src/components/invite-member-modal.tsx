"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@omniheaven/ui";
import { inviteMemberSchema, type OrgRole } from "@omniheaven/validators";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  Mail,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useOrganization } from "../lib/organization-context";
import { trpc } from "../lib/trpc";

interface RoleOption {
  id: OrgRole;
  title: string;
  badge: string;
  description: string;
  permissions: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: "admin",
    title: "Organization Admin",
    badge: "Executive",
    description: "Manage properties, staff, billing, and operational policies.",
    permissions: ["Full property management", "Invite & remove staff", "Financial ledgers & rates"],
    icon: ShieldCheck,
  },
  {
    id: "manager",
    title: "Property Manager",
    badge: "Operations",
    description: "Day-to-day oversight of bookings, leases, renters, and maintenance.",
    permissions: ["Manage units & leases", "Assign work orders", "Issue notices & rent bills"],
    icon: KeyRound,
  },
  {
    id: "staff",
    title: "Operations Staff",
    badge: "Staff",
    description: "Front-desk check-in, housekeeping logs, meter reading & caretaker duties.",
    permissions: ["Front-desk check-ins", "Log utility readings", "Resolve maintenance tickets"],
    icon: UserCheck,
  },
  {
    id: "member",
    title: "Viewer / Member",
    badge: "Read Only",
    description: "Auditors, junior staff, or external stakeholders with view-only permissions.",
    permissions: ["View property occupancy", "View status reports", "No editing access"],
    icon: Users,
  },
];

export function InviteMemberModal() {
  const { isInviteModalOpen, setInviteModalOpen, activeOrg } = useOrganization();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("staff");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const inviteMutation = trpc.organization.inviteMember.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validation = inviteMemberSchema.safeParse({
      email: email.trim(),
      role,
      expiresInDays,
    });

    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || "Invalid invitation details");
      return;
    }

    try {
      await inviteMutation.mutateAsync(validation.data);
      setSuccessMsg(`Invitation dispatched to ${email}. Token valid for ${expiresInDays} days.`);
      setEmail("");
      // Refresh invitations list and member cache
      await queryClient.invalidateQueries();
      setTimeout(() => {
        setSuccessMsg(null);
        setInviteModalOpen(false);
      }, 1500);
    } catch (err: any) {
      if (err.data?.code === "TOO_MANY_REQUESTS" || err.message?.includes("Rate limit")) {
        setErrorMsg(
          "Rate limit exceeded: You can send a maximum of 10 invitations per hour. Please wait before inviting more team members.",
        );
      } else {
        setErrorMsg(err.message || "Failed to dispatch invitation.");
      }
    }
  };

  return (
    <Dialog open={isInviteModalOpen} onOpenChange={setInviteModalOpen}>
      <DialogContent className="max-w-xl bg-card border-border shadow-2xl p-6 sm:p-8">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Mail className="size-4" />
            </span>
            <DialogTitle className="text-xl sm:text-2xl font-display font-bold text-foreground">
              Invite Team Member
            </DialogTitle>
          </div>
          <DialogDescription className="text-foreground-muted text-xs sm:text-sm">
            Grant secure role-based access to{" "}
            <strong className="text-foreground">{activeOrg.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Member Email */}
          <div className="space-y-1.5">
            <Label htmlFor="invite-email" className="text-xs font-semibold text-foreground">
              Colleague's Work Email <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="e.g. manager@lakeview-residence.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 text-sm bg-background border-border"
              required
            />
            <p className="text-[11px] text-foreground-muted">
              An invitation email with a secure single-use acceptance token will be delivered.
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Assigned Role & Responsibilities <span className="text-rose-500">*</span>
            </Label>
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
              {ROLE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = role === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRole(opt.id)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all min-h-[48px] ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/40 shadow-2xs"
                        : "border-border bg-card hover:bg-surface"
                    }`}
                  >
                    <span
                      className={`size-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold"
                          : "bg-surface border border-border text-foreground-muted"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground">{opt.title}</p>
                        <Badge
                          variant="outline"
                          className="text-[9px] py-0 px-1.5 font-bold uppercase tracking-wider text-primary border-primary/30"
                        >
                          {opt.badge}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-foreground-muted mt-0.5 leading-snug">
                        {opt.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {opt.permissions.map((p, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-foreground-muted border border-border/60"
                          >
                            ✓ {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expiration and Security Notice */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface/60 border border-border text-xs">
            <div className="flex items-center gap-2 text-foreground-muted">
              <Clock className="size-4 text-primary" />
              <span>Token Validity:</span>
            </div>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              aria-label="Invitation Expiration Window"
              className="bg-background border border-border text-xs font-semibold rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={3}>3 Days</option>
              <option value={7}>7 Days (Standard)</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
            </select>
          </div>

          <div className="p-2.5 rounded-lg bg-surface text-[11px] text-foreground-muted border border-border/50 flex items-center gap-2">
            <ShieldAlert className="size-3.5 text-primary shrink-0" />
            <span>Rate Limit Protection: Max 10 invitations allowed per user per hour.</span>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInviteModalOpen(false)}
              className="h-11 min-h-[48px] px-5 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="luxury"
              disabled={inviteMutation.isPending}
              className="h-11 min-h-[48px] px-6 text-xs font-bold"
            >
              {inviteMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Dispatching...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Send className="size-4" /> Send Invitation
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
