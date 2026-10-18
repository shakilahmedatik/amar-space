"use client";

import { Badge } from "@omniheaven/ui";
import { ArrowRight, Check, Eye, EyeOff, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";

interface JsonDiffViewerProps {
  oldValue: unknown;
  newValue: unknown;
  className?: string;
}

type DiffStatus = "added" | "removed" | "modified" | "unchanged";

interface FieldDelta {
  key: string;
  status: DiffStatus;
  oldVal: unknown;
  newVal: unknown;
}

function formatValue(val: unknown): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

export function JsonDiffViewer({ oldValue, newValue, className = "" }: JsonDiffViewerProps) {
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [viewRawJson, setViewRawJson] = useState(false);

  const deltas = useMemo<FieldDelta[]>(() => {
    const isOldObj = typeof oldValue === "object" && oldValue !== null;
    const isNewObj = typeof newValue === "object" && newValue !== null;

    if (!isOldObj && !isNewObj) {
      if (oldValue === newValue) {
        return [{ key: "value", status: "unchanged", oldVal: oldValue, newVal: newValue }];
      }
      return [{ key: "value", status: "modified", oldVal: oldValue, newVal: newValue }];
    }

    const oldRecord = (isOldObj ? oldValue : {}) as Record<string, unknown>;
    const newRecord = (isNewObj ? newValue : {}) as Record<string, unknown>;

    const allKeys = Array.from(
      new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]),
    ).sort();

    return allKeys.map((key) => {
      const hasOld = key in oldRecord;
      const hasNew = key in newRecord;
      const oldV = oldRecord[key];
      const newV = newRecord[key];

      if (!hasOld && hasNew) {
        return { key, status: "added", oldVal: undefined, newVal: newV };
      }
      if (hasOld && !hasNew) {
        return { key, status: "removed", oldVal: oldV, newVal: undefined };
      }

      const isChanged = JSON.stringify(oldV) !== JSON.stringify(newV);
      return {
        key,
        status: isChanged ? "modified" : "unchanged",
        oldVal: oldV,
        newVal: newV,
      };
    });
  }, [oldValue, newValue]);

  const visibleDeltas = useMemo(() => {
    return showUnchanged ? deltas : deltas.filter((d) => d.status !== "unchanged");
  }, [deltas, showUnchanged]);

  const hasChanges = deltas.some((d) => d.status !== "unchanged");

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}>
      {/* Diff Controls Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">State Delta Inspector</span>
          <span className="text-[11px] text-foreground-muted">
            ({deltas.filter((d) => d.status === "added").length} added,{" "}
            {deltas.filter((d) => d.status === "modified").length} modified,{" "}
            {deltas.filter((d) => d.status === "removed").length} removed)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUnchanged((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-border bg-surface-elevated hover:bg-surface text-foreground transition-colors min-h-[32px]"
          >
            {showUnchanged ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
            <span>{showUnchanged ? "Hide Unchanged" : "Show All Fields"}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewRawJson((prev) => !prev)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-border bg-surface-elevated hover:bg-surface text-foreground transition-colors min-h-[32px]"
          >
            {viewRawJson ? "Visual Diff" : "Raw JSON"}
          </button>
        </div>
      </div>

      {viewRawJson ? (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border p-4 gap-4 text-[11px] font-mono">
          <div>
            <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider mb-2">
              Before State (Old Value)
            </p>
            <pre className="p-3 rounded-lg bg-surface border border-border overflow-x-auto text-foreground-muted max-h-72">
              {oldValue !== undefined && oldValue !== null
                ? JSON.stringify(oldValue, null, 2)
                : "<null>"}
            </pre>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider mb-2">
              After State (New Value)
            </p>
            <pre className="p-3 rounded-lg bg-surface border border-border overflow-x-auto text-foreground max-h-72">
              {newValue !== undefined && newValue !== null
                ? JSON.stringify(newValue, null, 2)
                : "<null>"}
            </pre>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {!hasChanges && !showUnchanged ? (
            <div className="p-6 text-center text-xs text-foreground-muted">
              No field changes detected between states.
            </div>
          ) : visibleDeltas.length === 0 ? (
            <div className="p-6 text-center text-xs text-foreground-muted">
              All {deltas.length} fields are identical. Click "Show All Fields" to inspect.
            </div>
          ) : (
            visibleDeltas.map((delta) => {
              if (delta.status === "added") {
                return (
                  <div
                    key={delta.key}
                    className="p-3 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <Plus className="size-3" />
                      </span>
                      <span className="font-semibold text-foreground">{delta.key}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      >
                        Added
                      </Badge>
                    </div>
                    <div className="text-emerald-700 dark:text-emerald-300 font-medium break-all max-w-xl">
                      {formatValue(delta.newVal)}
                    </div>
                  </div>
                );
              }

              if (delta.status === "removed") {
                return (
                  <div
                    key={delta.key}
                    className="p-3 bg-rose-500/5 hover:bg-rose-500/10 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400">
                        <Minus className="size-3" />
                      </span>
                      <span className="font-semibold text-foreground">{delta.key}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                      >
                        Removed
                      </Badge>
                    </div>
                    <div className="text-rose-700 dark:text-rose-300 line-through break-all max-w-xl">
                      {formatValue(delta.oldVal)}
                    </div>
                  </div>
                );
              }

              if (delta.status === "modified") {
                return (
                  <div
                    key={delta.key}
                    className="p-3 bg-amber-500/5 hover:bg-amber-500/10 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        <ArrowRight className="size-3" />
                      </span>
                      <span className="font-semibold text-foreground">{delta.key}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      >
                        Modified
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 font-medium break-all max-w-xl">
                      <span className="text-rose-600 dark:text-rose-400 line-through opacity-80">
                        {formatValue(delta.oldVal)}
                      </span>
                      <ArrowRight className="size-3.5 text-foreground-muted shrink-0" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatValue(delta.newVal)}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={delta.key}
                  className="p-2.5 px-3 hover:bg-surface/50 transition-colors flex items-center justify-between gap-2 text-xs font-mono opacity-60"
                >
                  <div className="flex items-center gap-2">
                    <Check className="size-3 text-foreground-muted" />
                    <span className="text-foreground">{delta.key}</span>
                  </div>
                  <span className="text-foreground-muted truncate max-w-md">
                    {formatValue(delta.newVal)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
