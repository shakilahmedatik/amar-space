"use client";

import {
  Badge,
  Button,
  Card,
  Input,
  Skeleton,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@omniheaven/ui";
import {
  AlertTriangle,
  Bell,
  Building,
  CheckCircle2,
  Columns,
  List,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "../lib/trpc";
import { CreateNoticeModal } from "./create-notice-modal";
import { MaintenanceDetailDrawer } from "./maintenance-detail-drawer";
import { ReportMaintenanceModal } from "./report-maintenance-modal";

interface MaintenanceOperationsViewProps {
  initialTab?: "maintenance" | "notices";
}

export function MaintenanceOperationsView({
  initialTab = "maintenance",
}: MaintenanceOperationsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"maintenance" | "notices">(initialTab);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Queries
  const {
    data: tickets = [],
    isLoading: isTicketsLoading,
    refetch: refetchTickets,
  } = trpc.operations.listMaintenanceRequests.useQuery({
    status: selectedStatus === "all" ? undefined : (selectedStatus as any),
    priority: selectedPriority === "all" ? undefined : (selectedPriority as any),
    category: selectedCategory === "all" ? undefined : (selectedCategory as any),
  });

  const {
    data: notices = [],
    isLoading: isNoticesLoading,
    refetch: refetchNotices,
  } = trpc.operations.listNotices.useQuery({
    activeOnly: false,
  });

  // Notice mutations
  const pinMutation = trpc.operations.pinNotice.useMutation({
    onSuccess: () => refetchNotices(),
  });

  const deleteNoticeMutation = trpc.operations.deleteNotice.useMutation({
    onSuccess: () => refetchNotices(),
  });

  // Calculate Metrics
  const activeTicketsCount = tickets.filter(
    (t) => t.status === "open" || t.status === "assigned" || t.status === "in_progress",
  ).length;
  const urgentTicketsCount = tickets.filter(
    (t) => t.priority === "urgent" && t.status !== "closed",
  ).length;
  const resolvedCount = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed",
  ).length;
  const activeNoticesCount = notices.filter(
    (n) => !n.expiresAt || new Date(n.expiresAt) > new Date(),
  ).length;

  // Filter tickets by search term
  const filteredTickets = tickets.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const titleMatch = t.title.toLowerCase().includes(term);
    const flatMatch = t.flat?.flatNumber.toLowerCase().includes(term);
    const buildingMatch = t.building?.name.toLowerCase().includes(term);
    const staffMatch = t.assignedToStaff?.name?.toLowerCase().includes(term);
    return titleMatch || flatMatch || buildingMatch || staffMatch;
  });

  // Group into Kanban columns
  const kanbanColumns = [
    {
      id: "open",
      label: "Open",
      color: "border-amber-500/30 bg-amber-500/5",
      badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      tickets: filteredTickets.filter((t) => t.status === "open"),
    },
    {
      id: "assigned",
      label: "Assigned",
      color: "border-blue-500/30 bg-blue-500/5",
      badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      tickets: filteredTickets.filter((t) => t.status === "assigned"),
    },
    {
      id: "in_progress",
      label: "In Progress",
      color: "border-purple-500/30 bg-purple-500/5",
      badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      tickets: filteredTickets.filter((t) => t.status === "in_progress"),
    },
    {
      id: "resolved",
      label: "Resolved",
      color: "border-emerald-500/30 bg-emerald-500/5",
      badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      tickets: filteredTickets.filter((t) => t.status === "resolved"),
    },
    {
      id: "closed",
      label: "Closed",
      color: "border-border bg-surface/30",
      badgeColor: "bg-surface-elevated text-foreground-muted border-border",
      tickets: filteredTickets.filter((t) => t.status === "closed"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Maintenance & Operations
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Track repair tickets, dispatch caretakers, record expenses, and broadcast notices
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === "maintenance" ? (
            <Button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="h-11 px-4 text-xs font-bold bg-primary text-primary-foreground shadow-sm flex items-center gap-2 min-h-[44px]"
            >
              <Plus className="size-4" /> Report Issue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setIsNoticeModalOpen(true)}
              className="h-11 px-4 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-2 min-h-[44px]"
            >
              <Plus className="size-4" /> Publish Notice
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4 bg-card border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
              Active Tickets
            </span>
            <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Wrench className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{activeTicketsCount}</p>
          <span className="text-[10px] text-foreground-muted">Open, assigned, or active</span>
        </Card>

        <Card className="p-4 bg-card border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
              Urgent Attention
            </span>
            <div className="size-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{urgentTicketsCount}</p>
          <span className="text-[10px] text-foreground-muted">High or urgent dispatch</span>
        </Card>

        <Card className="p-4 bg-card border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
              Resolved Tickets
            </span>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{resolvedCount}</p>
          <span className="text-[10px] text-emerald-600">Work completed & signed off</span>
        </Card>

        <Card className="p-4 bg-card border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
              Active Notices
            </span>
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Bell className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{activeNoticesCount}</p>
          <span className="text-[10px] text-foreground-muted">Building broadcast alerts</span>
        </Card>
      </div>

      {/* Subtab Switcher */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("maintenance")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all min-h-[44px] flex items-center gap-2 ${
              activeSubTab === "maintenance"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-foreground-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            <Wrench className="size-4" />
            <span>Work Orders ({tickets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("notices")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all min-h-[44px] flex items-center gap-2 ${
              activeSubTab === "notices"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-foreground-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            <Bell className="size-4" />
            <span>Notice Board ({notices.length})</span>
          </button>
        </div>

        {activeSubTab === "maintenance" && (
          <div className="hidden sm:flex items-center gap-1 bg-surface p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ${
                viewMode === "kanban"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
              title="Kanban Board View"
            >
              <Columns className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ${
                viewMode === "table"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
              title="Table View"
            >
              <List className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* SUBTAB 1: WORK ORDERS / MAINTENANCE */}
      {activeSubTab === "maintenance" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="size-4 absolute left-3 top-3 text-foreground-muted" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ticket title, flat number, building, or staff..."
                className="pl-9 h-10 text-xs w-full"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-10 px-3 text-xs rounded-xl bg-surface border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 shrink-0"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="h-10 px-3 text-xs rounded-xl bg-surface border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 shrink-0"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-10 px-3 text-xs rounded-xl bg-surface border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 shrink-0"
              >
                <option value="all">All Categories</option>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="generator">Generator</option>
                <option value="elevator">Elevator</option>
                <option value="carpentry">Carpentry</option>
                <option value="sanitary">Sanitary</option>
                <option value="appliance">Appliance</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>

          {/* Tickets Display */}
          {isTicketsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border flex flex-col items-center justify-center gap-3">
              <div className="size-12 rounded-full bg-surface flex items-center justify-center text-foreground-muted">
                <Wrench className="size-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">No Maintenance Tickets Found</h3>
                <p className="text-xs text-foreground-muted mt-1 max-w-sm">
                  There are no work orders matching your current filter criteria.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="h-9 px-4 text-xs font-semibold bg-primary text-primary-foreground min-h-[36px]"
              >
                + Report New Issue
              </Button>
            </Card>
          ) : viewMode === "kanban" ? (
            /* KANBAN BOARD VIEW */
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {kanbanColumns.map((col) => (
                <div key={col.id} className="space-y-3">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-xs font-bold text-foreground">{col.label}</span>
                    <Badge variant="outline" className={`text-[10px] font-bold ${col.badgeColor}`}>
                      {col.tickets.length}
                    </Badge>
                  </div>

                  <div className="space-y-2.5 min-h-[300px]">
                    {col.tickets.map((t) => (
                      <Card
                        key={t.id}
                        onClick={() => setSelectedTicketId(t.id)}
                        className="p-3.5 bg-card border border-border hover:border-primary/50 transition-all cursor-pointer shadow-xs hover:shadow-md space-y-2.5 rounded-xl group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {t.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-bold shrink-0 capitalize ${
                              t.priority === "urgent"
                                ? "text-rose-600 bg-rose-500/10 border-rose-500/20"
                                : t.priority === "high"
                                  ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
                                  : "text-blue-600 bg-blue-500/10 border-blue-500/20"
                            }`}
                          >
                            {t.priority}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
                          <Building className="size-3 shrink-0" />
                          <span className="truncate">
                            {t.flat ? `Flat ${t.flat.flatNumber}` : "Common Area"}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-foreground-muted">
                          <span className="capitalize font-medium">{t.category}</span>
                          <span className="truncate max-w-[100px]">
                            {t.assignedToStaff
                              ? t.assignedToStaff.name || "Assigned"
                              : "Unassigned"}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* TABLE VIEW */
            <Card className="overflow-hidden border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-bold">Ticket</TableHead>
                    <TableHead className="text-xs font-bold">Location</TableHead>
                    <TableHead className="text-xs font-bold">Category</TableHead>
                    <TableHead className="text-xs font-bold">Priority</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                    <TableHead className="text-xs font-bold">Assigned Staff</TableHead>
                    <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((t) => (
                    <TableRow key={t.id} className="hover:bg-surface/50">
                      <TableCell className="text-xs font-semibold text-foreground max-w-[200px] truncate">
                        {t.title}
                      </TableCell>
                      <TableCell className="text-xs text-foreground-muted">
                        {t.flat ? `Flat ${t.flat.flatNumber}` : "Common Area"}
                      </TableCell>
                      <TableCell className="text-xs capitalize">{t.category}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold capitalize ${
                            t.priority === "urgent"
                              ? "text-rose-600 bg-rose-500/10 border-rose-500/20"
                              : t.priority === "high"
                                ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
                                : "text-blue-600 bg-blue-500/10 border-blue-500/20"
                          }`}
                        >
                          {t.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={t.status as any} />
                      </TableCell>
                      <TableCell className="text-xs text-foreground-muted">
                        {t.assignedToStaff?.name || t.assignedToStaff?.email || "Unassigned"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedTicketId(t.id)}
                          className="h-8 px-3 text-xs"
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* SUBTAB 2: NOTICE BOARD */}
      {activeSubTab === "notices" && (
        <div className="space-y-6">
          {isNoticesLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : notices.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border flex flex-col items-center justify-center gap-3">
              <div className="size-12 rounded-full bg-surface flex items-center justify-center text-foreground-muted">
                <Bell className="size-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Notice Board is Empty</h3>
                <p className="text-xs text-foreground-muted mt-1 max-w-sm">
                  Broadcast advisories on water tank cleaning, power servicing, or gate hours.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setIsNoticeModalOpen(true)}
                className="h-9 px-4 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white min-h-[36px]"
              >
                + Broadcast First Notice
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {notices.map((n) => {
                const isExpired = n.expiresAt && new Date(n.expiresAt) < new Date();
                return (
                  <Card
                    key={n.id}
                    className={`p-5 transition-all rounded-2xl border ${
                      n.isPinned
                        ? "border-amber-500/40 bg-amber-500/5 shadow-xs"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {n.isPinned && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold bg-amber-500/10 text-amber-600 border-amber-500/20 flex items-center gap-1"
                            >
                              <Pin className="size-3" /> Pinned Announcement
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] font-semibold capitalize">
                            Target: {n.targetAudience.replace("_", " ")}
                          </Badge>
                          {isExpired && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold text-rose-500 border-rose-500/20"
                            >
                              Expired
                            </Badge>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-foreground">{n.title}</h3>

                        <div className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap pt-1 font-sans">
                          {n.body}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-border">
                        <div className="text-[10px] text-foreground-muted text-right">
                          <span className="block">
                            {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}
                          </span>
                          {n.authorUser && (
                            <span className="block font-medium">
                              By {n.authorUser.name || "Admin"}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              pinMutation.mutate({
                                noticeId: n.id,
                                isPinned: !n.isPinned,
                              })
                            }
                            className="h-8 px-2.5 text-[11px] flex items-center gap-1"
                            title={n.isPinned ? "Unpin notice" : "Pin notice"}
                          >
                            {n.isPinned ? (
                              <>
                                <PinOff className="size-3 text-amber-600" /> Unpin
                              </>
                            ) : (
                              <>
                                <Pin className="size-3 text-foreground-muted" /> Pin
                              </>
                            )}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this notice?")) {
                                deleteNoticeMutation.mutate({ noticeId: n.id });
                              }
                            }}
                            className="h-8 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                            title="Delete notice"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Global Modals */}
      <ReportMaintenanceModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={() => refetchTickets()}
      />

      <MaintenanceDetailDrawer
        requestId={selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
        onUpdated={() => refetchTickets()}
      />

      <CreateNoticeModal
        isOpen={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
        onSuccess={() => refetchNotices()}
      />
    </div>
  );
}
