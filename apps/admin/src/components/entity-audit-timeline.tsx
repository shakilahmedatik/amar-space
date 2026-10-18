"use client";

import { Badge } from "@omniheaven/ui";
import { ChevronDown, ChevronUp, Clock, History } from "lucide-react";
import { useState } from "react";
import { trpc } from "../lib/trpc";
import { JsonDiffViewer } from "./json-diff-viewer";

interface EntityAuditTimelineProps {
  entityType: string;
  entityId: string;
  title?: string;
  className?: string;
}

export function EntityAuditTimeline({
  entityType,
  entityId,
  title = "Audit History & Timeline",
  className = "",
}: EntityAuditTimelineProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const {
    data: logs,
    isLoading,
    error,
  } = trpc.audit.getEntityAuditTrail.useQuery(
    { entityType, entityId },
    { enabled: Boolean(entityType && entityId) },
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        </div>
        <span className="text-xs text-foreground-muted">{logs?.length ?? 0} historical events</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-surface animate-pulse border border-border"
            />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-xs text-destructive">
          Failed to load audit history: {error.message}
        </div>
      ) : !logs || logs.length === 0 ? (
        <div className="p-6 text-center rounded-xl border border-dashed border-border bg-card text-xs text-foreground-muted">
          No audit entries recorded for this {entityType} yet.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
          {logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const date = new Date(log.createdAt);

            return (
              <div key={log.id} className="relative group">
                {/* Timeline Dot */}
                <div className="absolute -left-6 top-1.5 size-5 rounded-full border-2 border-primary bg-card flex items-center justify-center shadow-xs">
                  <div className="size-1.5 rounded-full bg-primary" />
                </div>

                <div className="p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={
                          log.action === "CREATE"
                            ? "default"
                            : log.action === "DELETE"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[10px] uppercase font-bold tracking-wider"
                      >
                        {log.action}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground">
                        {log.actorEmail}
                      </span>
                      <Badge variant="outline" className="text-[10px] text-foreground-muted">
                        {log.actorRole}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-foreground-muted tabular-nums">
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        <span>
                          {date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span>
                          {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="p-1 rounded-md hover:bg-surface text-foreground transition-colors"
                        aria-label={isExpanded ? "Collapse diff" : "Expand diff"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {log.metadata && typeof log.metadata === "object" ? (
                    <div className="text-xs text-foreground-muted bg-surface/50 p-2.5 rounded-lg border border-border/50">
                      {Object.entries(log.metadata as Record<string, unknown>).map(([key, val]) => (
                        <span key={key} className="mr-3">
                          <strong className="text-foreground">{key}:</strong> {String(val)}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {isExpanded && (
                    <div className="pt-2">
                      <JsonDiffViewer oldValue={log.oldValue} newValue={log.newValue} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
