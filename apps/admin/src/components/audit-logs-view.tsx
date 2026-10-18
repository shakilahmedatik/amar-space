"use client";

import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@omniheaven/ui";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  Globe,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import { JsonDiffViewer } from "./json-diff-viewer";

export function AuditLogsView() {
  // Query Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(0);
  const pageSize = 20;

  // Selected Log for Deep Inspection Drawer/Modal
  const [inspectingLog, setInspectingLog] = useState<any | null>(null);

  // CSV Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [exportEndDate, setExportEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [exportError, setExportError] = useState<string | null>(null);

  // tRPC Queries & Mutations
  const {
    data: auditData,
    isLoading,
    refetch,
    isFetching,
  } = trpc.audit.listAuditLogs.useQuery({
    entityType: entityTypeFilter || undefined,
    action: actionFilter || undefined,
    startDate: startDateFilter || undefined,
    endDate: endDateFilter || undefined,
    limit: pageSize,
    offset: currentPage * pageSize,
  });

  const exportMutation = trpc.audit.exportAuditReportCsv.useMutation();

  const logs = auditData?.logs ?? [];
  const totalLogs = auditData?.total ?? 0;
  const totalPages = Math.ceil(totalLogs / pageSize);

  // Client-side text search on current page for actor email or entityId
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase().trim();
    return logs.filter(
      (log) =>
        log.actorEmail.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.ipAddress?.toLowerCase().includes(q),
    );
  }, [logs, searchQuery]);

  // Derived KPI Stats
  const kpiStats = useMemo(() => {
    const financialActions = new Set(["ADJUST", "PAY"]);
    const financialEntities = new Set(["bill", "advance_adjustment", "payment"]);

    const financialCount = logs.filter(
      (l) => financialActions.has(l.action) || financialEntities.has(l.entityType),
    ).length;

    const opsCount = logs.filter(
      (l) => l.entityType === "maintenance" || l.entityType === "notice",
    ).length;

    const uniqueActors = new Set(logs.map((l) => l.actorEmail)).size;

    return {
      total: totalLogs,
      financial: financialCount,
      operations: opsCount,
      uniqueActors,
    };
  }, [logs, totalLogs]);

  const hasActiveFilters = Boolean(
    searchQuery || entityTypeFilter || actionFilter || startDateFilter || endDateFilter,
  );

  const resetFilters = () => {
    setSearchQuery("");
    setEntityTypeFilter("");
    setActionFilter("");
    setStartDateFilter("");
    setEndDateFilter("");
    setCurrentPage(0);
  };

  const handleExportCsv = async () => {
    setExportError(null);
    try {
      const result = await exportMutation.mutateAsync({
        startDate: exportStartDate || new Date().toISOString().slice(0, 10),
        endDate: exportEndDate || new Date().toISOString().slice(0, 10),
        entityType: entityTypeFilter || undefined,
        action: actionFilter || undefined,
      });

      // Trigger browser file download
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", result.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExportModalOpen(false);
      refetch();
    } catch (err: any) {
      setExportError(err.message || "Failed to export audit report");
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold text-[10px]">
            CREATE
          </Badge>
        );
      case "UPDATE":
        return (
          <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 font-semibold text-[10px]">
            UPDATE
          </Badge>
        );
      case "DELETE":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-semibold text-[10px]">
            DELETE
          </Badge>
        );
      case "ADJUST":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold text-[10px]">
            ADJUST
          </Badge>
        );
      case "PAY":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold text-[10px]">
            PAY
          </Badge>
        );
      case "ASSIGN":
        return (
          <Badge className="bg-primary/15 text-primary border-border-gold/40 font-semibold text-[10px]">
            ASSIGN
          </Badge>
        );
      case "EXPORT":
        return (
          <Badge className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30 font-semibold text-[10px]">
            EXPORT
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {action}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-gold/30">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-serif tracking-tight text-foreground">
              Audit Logs & Security
            </h1>
            <Badge
              variant="outline"
              className="gold-hairline text-foreground text-xs font-semibold gap-1"
            >
              <ShieldCheck className="size-3 text-primary" />
              <span>Immutable Ledger</span>
            </Badge>
          </div>
          <p className="text-xs text-foreground-muted mt-1">
            Forensic append-only audit trail capturing state diffs, actor provenance, and IP
            addresses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs min-h-[40px] gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="luxury"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            className="text-xs min-h-[40px] gap-1.5"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border border-border-gold/30 shadow-xs hover:border-primary/40 transition-all rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted">Total Mutations</span>
            <Activity className="size-4 text-primary" />
          </div>
          <p className="text-2xl font-serif font-bold tabular-nums text-foreground mt-2">
            {kpiStats.total}
          </p>
          <p className="text-[11px] text-foreground-muted mt-0.5">Committed across platform</p>
        </Card>

        <Card className="p-4 bg-card border border-border-gold/30 shadow-xs hover:border-primary/40 transition-all rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted">Financial Edits</span>
            <FileSpreadsheet className="size-4 text-amber-500" />
          </div>
          <p className="text-2xl font-serif font-bold tabular-nums text-foreground mt-2">
            {kpiStats.financial}
          </p>
          <p className="text-[11px] text-foreground-muted mt-0.5">Bills, payments & adjustments</p>
        </Card>

        <Card className="p-4 bg-card border border-border-gold/30 shadow-xs hover:border-primary/40 transition-all rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted">Operations & Notices</span>
            <FileCheck2 className="size-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-serif font-bold tabular-nums text-foreground mt-2">
            {kpiStats.operations}
          </p>
          <p className="text-[11px] text-foreground-muted mt-0.5">
            Repairs, dispatches, broadcasts
          </p>
        </Card>

        <Card className="p-4 bg-card border border-border-gold/30 shadow-xs hover:border-primary/40 transition-all rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted">Distinct Actors</span>
            <User className="size-4 text-primary" />
          </div>
          <p className="text-2xl font-serif font-bold tabular-nums text-foreground mt-2">
            {kpiStats.uniqueActors}
          </p>
          <p className="text-[11px] text-foreground-muted mt-0.5">Active team members logged</p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-card border border-border-gold/30 shadow-xs rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-foreground-muted" />
            <Input
              placeholder="Search actor or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs min-h-[40px]"
            />
          </div>

          {/* Entity Type Filter */}
          <div>
            <select
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full text-xs min-h-[40px] px-3 py-2 rounded-xl bg-surface border border-border text-foreground font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="">All Entity Types</option>
              <option value="flat">Flats</option>
              <option value="contract">Lease Contracts</option>
              <option value="bill">Bills & Utilities</option>
              <option value="advance_adjustment">Advance Adjustments</option>
              <option value="payment">Payments</option>
              <option value="maintenance">Maintenance</option>
              <option value="notice">Building Notices</option>
              <option value="organization">Organization</option>
              <option value="audit_log">Audit Exports</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full text-xs min-h-[40px] px-3 py-2 rounded-xl bg-surface border border-border text-foreground font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="ADJUST">ADJUST</option>
              <option value="PAY">PAY</option>
              <option value="ASSIGN">ASSIGN</option>
              <option value="EXPORT">EXPORT</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="relative">
            <Input
              type="date"
              placeholder="Start Date"
              value={startDateFilter}
              onChange={(e) => {
                setStartDateFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="text-xs min-h-[40px]"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <Input
              type="date"
              placeholder="End Date"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="text-xs min-h-[40px]"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
            <span className="text-foreground-muted">
              Showing {filteredLogs.length} matching events
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs text-foreground-muted hover:text-foreground h-7 gap-1"
            >
              <X className="size-3" />
              <span>Reset All Filters</span>
            </Button>
          </div>
        )}
      </Card>

      {/* Audit Log Table (Desktop) / Cards (Mobile) */}
      <Card className="bg-card border border-border-gold/30 shadow-xs rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-surface animate-pulse border border-border"
              />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Shield className="size-10 text-foreground-muted mx-auto opacity-50" />
            <h3 className="text-base font-semibold text-foreground">No Audit Records Found</h3>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              No state changes matched the specified filters. Try adjusting your date range or
              clearing the entity search.
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs mt-2">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface border-b border-border text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp (UTC)</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">IP & Provenance</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((log) => {
                    const date = new Date(log.createdAt);
                    return (
                      <tr key={log.id} className="hover:bg-surface/50 transition-colors group">
                        <td className="py-3.5 px-4 tabular-nums text-foreground">
                          <div className="font-medium">
                            {date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[10px] text-foreground-muted">
                            {date.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground truncate max-w-[180px]">
                            {log.actorEmail}
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[9px] uppercase tracking-wider px-1.5 py-0 mt-0.5"
                          >
                            {log.actorRole}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4">{getActionBadge(log.action)}</td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-foreground capitalize">
                            {log.entityType.replace("_", " ")}
                          </div>
                          <div className="text-[10px] text-foreground-muted font-mono truncate max-w-[140px]">
                            {log.entityId}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 tabular-nums">
                          <div className="flex items-center gap-1.5 text-foreground font-mono text-[11px]">
                            <Globe className="size-3 text-foreground-muted" />
                            <span>{log.ipAddress || "Local / System"}</span>
                          </div>
                          {log.userAgent && (
                            <div className="text-[10px] text-foreground-muted truncate max-w-[160px]">
                              {log.userAgent}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInspectingLog(log)}
                            className="text-xs h-8 gap-1.5"
                          >
                            <Eye className="size-3.5" />
                            <span>Inspect</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< 768px) */}
            <div className="md:hidden divide-y divide-border">
              {filteredLogs.map((log) => {
                const date = new Date(log.createdAt);
                return (
                  <div key={log.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      {getActionBadge(log.action)}
                      <span className="text-[11px] text-foreground-muted tabular-nums">
                        {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                        {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{log.actorEmail}</p>
                        <p className="text-[10px] text-foreground-muted capitalize">
                          Role: {log.actorRole} • Entity: {log.entityType.replace("_", " ")}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectingLog(log)}
                        className="text-xs h-8 gap-1"
                      >
                        <Eye className="size-3" />
                        <span>Inspect</span>
                      </Button>
                    </div>

                    {log.ipAddress && (
                      <p className="text-[10px] font-mono text-foreground-muted flex items-center gap-1">
                        <Globe className="size-3" />
                        <span>IP: {log.ipAddress}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 bg-surface border-t border-border text-xs">
                <span className="text-foreground-muted">
                  Page {currentPage + 1} of {totalPages} ({totalLogs} total events)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronLeft className="size-3" />
                    <span>Previous</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="h-8 gap-1 text-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="size-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Log Inspection Dialog */}
      {inspectingLog && (
        <Dialog open={Boolean(inspectingLog)} onOpenChange={() => setInspectingLog(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-border-gold/30 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold font-serif">
                  Audit Entry Details
                </DialogTitle>
                {getActionBadge(inspectingLog.action)}
              </div>
              <DialogDescription className="text-xs text-foreground-muted">
                Immutable record committed on {new Date(inspectingLog.createdAt).toUTCString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Provenance Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface border border-border text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-foreground-muted">
                    Actor
                  </span>
                  <p className="font-semibold text-foreground truncate">
                    {inspectingLog.actorEmail}
                  </p>
                  <p className="text-[11px] text-foreground-muted">
                    Role: {inspectingLog.actorRole}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-foreground-muted">
                    Entity Target
                  </span>
                  <p className="font-semibold text-foreground capitalize">
                    {inspectingLog.entityType.replace("_", " ")}
                  </p>
                  <p className="text-[10px] font-mono text-foreground-muted truncate">
                    ID: {inspectingLog.entityId}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-foreground-muted">
                    IP Address
                  </span>
                  <p className="font-mono text-foreground font-semibold">
                    {inspectingLog.ipAddress || "System Internal"}
                  </p>
                </div>
              </div>

              {/* User Agent & Context */}
              {inspectingLog.userAgent && (
                <div className="p-3 rounded-xl bg-surface border border-border text-xs">
                  <span className="text-[10px] uppercase font-semibold text-foreground-muted block mb-1">
                    Client User Agent
                  </span>
                  <p className="font-mono text-[11px] text-foreground-muted break-all">
                    {inspectingLog.userAgent}
                  </p>
                </div>
              )}

              {/* Metadata (if any) */}
              {inspectingLog.metadata && typeof inspectingLog.metadata === "object" && (
                <div className="p-3 rounded-xl bg-surface border border-border text-xs space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-foreground-muted block">
                    Execution Metadata & Notes
                  </span>
                  <pre className="font-mono text-[11px] text-foreground overflow-x-auto">
                    {JSON.stringify(inspectingLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* State Diff Viewer */}
              <div>
                <span className="text-xs font-bold text-foreground block mb-2">
                  Deterministic Field Differences (Before vs After)
                </span>
                <JsonDiffViewer
                  oldValue={inspectingLog.oldValue}
                  newValue={inspectingLog.newValue}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectingLog(null)}
                className="text-xs min-h-[40px]"
              >
                Close Inspector
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CSV Export Dialog */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="max-w-md border-border-gold/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-serif flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              <span>Export Certified Audit Report</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground-muted">
              Generate a legally defensible, sanitized CSV export of all financial and operational
              mutations for chartered accountants or tax authorities.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {exportError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-center gap-2">
                <ShieldAlert className="size-4 shrink-0" />
                <span>{exportError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="exportStartDate" className="text-xs font-semibold">
                Start Date
              </Label>
              <Input
                id="exportStartDate"
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="text-xs min-h-[40px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exportEndDate" className="text-xs font-semibold">
                End Date
              </Label>
              <Input
                id="exportEndDate"
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="text-xs min-h-[40px]"
              />
            </div>

            <p className="text-[11px] text-foreground-muted bg-surface p-3 rounded-xl border border-border">
              <strong>Compliance Notice:</strong> The maximum export window is strictly capped at 90
              days. Exporting generates a certified immutable record in the platform audit log.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportModalOpen(false)}
              disabled={exportMutation.isPending}
              className="text-xs min-h-[40px]"
            >
              Cancel
            </Button>
            <Button
              variant="luxury"
              size="sm"
              onClick={handleExportCsv}
              disabled={exportMutation.isPending}
              className="text-xs min-h-[40px] gap-1.5"
            >
              {exportMutation.isPending ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Generating CSV...</span>
                </>
              ) : (
                <>
                  <Download className="size-3.5" />
                  <span>Download Report</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
