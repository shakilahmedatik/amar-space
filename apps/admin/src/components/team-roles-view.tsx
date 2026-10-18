"use client";

import {
  Badge,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@omniheaven/ui";
import type { OrgRole } from "@omniheaven/validators";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useOrganization } from "../lib/organization-context";
import { trpc } from "../lib/trpc";

function getRoleBadge(role: string) {
  switch (role) {
    case "owner":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          <ShieldAlert className="size-3" /> Owner
        </span>
      );
    case "admin":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
          <ShieldCheck className="size-3" /> Admin
        </span>
      );
    case "manager":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          <KeyRound className="size-3" /> Manager
        </span>
      );
    case "staff":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-surface-elevated text-foreground-muted border border-border">
          <UserCheck className="size-3" /> Staff
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-surface text-foreground-muted border border-border">
          <Users className="size-3" /> Member
        </span>
      );
  }
}

// Fallback demo members if server has no live DB records yet
const DEMO_MEMBERS = [
  {
    id: "mem-01",
    role: "owner",
    createdAt: new Date("2026-01-10T09:00:00Z"),
    user: {
      id: "usr-01",
      name: "Shakil Ahmed Atik",
      email: "atik@omniheaven.com",
      image: null,
    },
  },
  {
    id: "mem-02",
    role: "admin",
    createdAt: new Date("2026-02-14T11:30:00Z"),
    user: {
      id: "usr-02",
      name: "Tariqul Islam",
      email: "tariqul@omniheaven.com",
      image: null,
    },
  },
  {
    id: "mem-03",
    role: "manager",
    createdAt: new Date("2026-03-01T08:15:00Z"),
    user: {
      id: "usr-03",
      name: "Farhana Yasmin",
      email: "farhana.operations@omniheaven.com",
      image: null,
    },
  },
  {
    id: "mem-04",
    role: "staff",
    createdAt: new Date("2026-04-12T14:45:00Z"),
    user: {
      id: "usr-04",
      name: "Caretaker Rafiq",
      email: "rafiq.staff@omniheaven.com",
      image: null,
    },
  },
];

const DEMO_INVITATIONS = [
  {
    id: "inv-01",
    email: "finance.audit@omniheaven.com",
    role: "manager",
    status: "pending",
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    inviter: {
      id: "usr-01",
      name: "Shakil Ahmed Atik",
      email: "atik@omniheaven.com",
    },
  },
];

export function TeamRolesView() {
  const { activeOrg, setInviteModalOpen } = useOrganization();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"members" | "invitations">("members");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Queries
  const { data: serverMembers } = trpc.organization.listMembers.useQuery(undefined, {
    retry: false,
  });

  const { data: serverInvitations } = trpc.organization.listInvitations.useQuery(undefined, {
    retry: false,
  });

  // Mutations
  const updateRoleMutation = trpc.organization.updateMemberRole.useMutation();
  const removeMemberMutation = trpc.organization.removeMember.useMutation();

  const members = serverMembers && serverMembers.length > 0 ? serverMembers : DEMO_MEMBERS;
  const invitations =
    serverInvitations && serverInvitations.length > 0 ? serverInvitations : DEMO_INVITATIONS;

  const handleRoleChange = async (memberId: string, newRole: OrgRole) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updateRoleMutation.mutateAsync({ memberId, newRole });
      setSuccessMessage("Member role updated successfully.");
      await queryClient.invalidateQueries();
    } catch (err: any) {
      if (err.message?.includes("CANNOT_REMOVE_LAST_OWNER")) {
        setErrorMessage(
          "Invariant Protection: Cannot demote the sole remaining Owner. Assign another Owner first.",
        );
      } else {
        setErrorMessage(err.message || "Failed to update role.");
      }
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this property?`)) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await removeMemberMutation.mutateAsync({ memberId });
      setSuccessMessage(`${memberName} was removed from the team.`);
      await queryClient.invalidateQueries();
    } catch (err: any) {
      if (err.message?.includes("CANNOT_REMOVE_LAST_OWNER")) {
        setErrorMessage(
          "Invariant Protection: Cannot remove the sole remaining Owner of this organization.",
        );
      } else {
        setErrorMessage(err.message || "Failed to remove member.");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
            Team & Role Governance
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Manage administrative privileges, front-desk staff, caretakers, and pending invites for{" "}
            <span className="font-semibold text-foreground">{activeOrg.name}</span>.
          </p>
        </div>

        <Button
          variant="luxury"
          onClick={() => setInviteModalOpen(true)}
          className="min-h-[48px] px-5 flex items-center gap-2 text-xs font-bold shrink-0 self-start sm:self-auto shadow-sm"
        >
          <UserPlus className="size-4" />
          Invite Team Member
        </Button>
      </div>

      {/* Feedback Alerts */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs underline hover:no-underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs underline hover:no-underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs">
          <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Total Staff
          </p>
          <p className="text-2xl font-bold font-display text-foreground mt-1 tabular-nums">
            {members.length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs">
          <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Owners & Admins
          </p>
          <p className="text-2xl font-bold font-display text-primary mt-1 tabular-nums">
            {members.filter((m) => m.role === "owner" || m.role === "admin").length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs">
          <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Property Managers
          </p>
          <p className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {members.filter((m) => m.role === "manager").length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs">
          <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Pending Invites
          </p>
          <p className="text-2xl font-bold font-display text-amber-500 mt-1 tabular-nums">
            {invitations.filter((i) => i.status === "pending").length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all min-h-[44px] flex items-center gap-2 ${
            activeTab === "members"
              ? "bg-primary/10 text-primary border border-primary/20 shadow-2xs"
              : "text-foreground-muted hover:text-foreground hover:bg-surface"
          }`}
        >
          <Users className="size-4" />
          Active Team ({members.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("invitations")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all min-h-[44px] flex items-center gap-2 ${
            activeTab === "invitations"
              ? "bg-primary/10 text-primary border border-primary/20 shadow-2xs"
              : "text-foreground-muted hover:text-foreground hover:bg-surface"
          }`}
        >
          <Mail className="size-4" />
          Pending Invitations ({invitations.filter((i) => i.status === "pending").length})
        </button>
      </div>

      {/* Tab 1: Active Members Table */}
      {activeTab === "members" && (
        <Card variant="default" className="border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-surface/60">
                <TableRow className="border-b border-border">
                  <TableHead className="text-xs font-bold text-foreground-muted py-3 px-4">
                    Member Details
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground-muted py-3 px-4">
                    Current Role
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground-muted py-3 px-4 hidden md:table-cell">
                    Member Since
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground-muted py-3 px-4 text-right">
                    Governance Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const initials = member.user.name
                    ? member.user.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "U";

                  return (
                    <TableRow
                      key={member.id}
                      className="border-b border-border/50 hover:bg-surface/40"
                    >
                      {/* Name & Email */}
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-surface-elevated border border-border text-foreground font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {initials}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground leading-tight">
                              {member.user.name}
                            </p>
                            <p className="text-[11px] text-foreground-muted mt-0.5">
                              {member.user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Role Badge */}
                      <TableCell className="py-3.5 px-4">{getRoleBadge(member.role)}</TableCell>

                      {/* Joined Date */}
                      <TableCell className="py-3.5 px-4 hidden md:table-cell text-xs text-foreground-muted tabular-nums">
                        {new Date(member.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Role Selector */}
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value as OrgRole)}
                            aria-label={`Change role for ${member.user.name}`}
                            className="bg-background border border-border text-xs rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9 min-h-[36px]"
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="staff">Staff</option>
                            <option value="member">Member</option>
                          </select>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id, member.user.name)}
                            title="Remove member"
                            aria-label={`Remove ${member.user.name}`}
                            className="size-9 rounded-lg border border-border text-foreground-muted hover:text-rose-600 hover:border-rose-500/30 hover:bg-rose-500/10 flex items-center justify-center transition-colors min-h-[36px] min-w-[36px]"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Tab 2: Pending Invitations Table */}
      {activeTab === "invitations" && (
        <Card variant="default" className="border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-surface/60">
                <TableRow className="border-b border-border">
                  <TableHead className="text-xs font-bold text-foreground-muted py-3 px-4">
                    Invited Email
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground-muted py-3 px-4">
                    Assigned Role
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground-muted py-3 px-4">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground-muted py-3 px-4 hidden md:table-cell">
                    Expires At
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-xs text-foreground-muted"
                    >
                      No active or pending invitations.
                    </TableCell>
                  </TableRow>
                ) : (
                  invitations.map((inv) => (
                    <TableRow
                      key={inv.id}
                      className="border-b border-border/50 hover:bg-surface/40"
                    >
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Mail className="size-4 text-foreground-muted" />
                          <span className="text-xs font-semibold text-foreground">{inv.email}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5 px-4">{getRoleBadge(inv.role)}</TableCell>

                      <TableCell className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold tracking-wider py-0.5 px-2 ${
                            inv.status === "pending"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : inv.status === "accepted"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-surface text-foreground-muted border-border"
                          }`}
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-3.5 px-4 hidden md:table-cell text-xs text-foreground-muted tabular-nums">
                        {new Date(inv.expiresAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
