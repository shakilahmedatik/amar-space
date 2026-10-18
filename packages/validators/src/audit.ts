import { z } from "zod";

export const AUDIT_ERROR_CODES = {
  AUDIT_FORBIDDEN: "AUDIT_FORBIDDEN",
  AUDIT_LOG_WRITE_FAILED: "AUDIT_LOG_WRITE_FAILED",
  INVALID_DATE_RANGE: "INVALID_DATE_RANGE",
} as const;

export type AuditErrorCode = (typeof AUDIT_ERROR_CODES)[keyof typeof AUDIT_ERROR_CODES];

export const SENSITIVE_KEYS = [
  "password",
  "secret",
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "apikey",
  "creditcard",
  "cvv",
  "authorization",
  "cookie",
  "privatekey",
];

/**
 * Recursively sanitizes any sensitive keys in data snapshots before serialization
 * to ensure passwords, tokens, and payment secrets are never leaked into audit trails.
 */
export function sanitizeAuditValue<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString() as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item)) as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive));

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null) {
      sanitized[key] = sanitizeAuditValue(val);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized as T;
}

export const listAuditLogsSchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actorUserId: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

export type ListAuditLogsInput = z.infer<typeof listAuditLogsSchema>;

export const getEntityAuditTrailSchema = z.object({
  entityType: z.string().min(1, "Entity type is required"),
  entityId: z.string().min(1, "Entity ID is required"),
  limit: z.number().int().min(1).max(200).default(50),
});

export type GetEntityAuditTrailInput = z.infer<typeof getEntityAuditTrailSchema>;

export const exportAuditReportCsvSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  entityType: z.string().optional(),
  action: z.string().optional(),
});

export type ExportAuditReportCsvInput = z.infer<typeof exportAuditReportCsvSchema>;

/**
 * Validates that startDate <= endDate and the range does not exceed maxDays (default 90).
 */
export function validateDateRange(
  startDateStr?: string,
  endDateStr?: string,
  maxDays = 90,
): { valid: boolean; error?: string } {
  if (!startDateStr || !endDateStr) {
    return { valid: true };
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { valid: false, error: "Invalid date format provided" };
  }

  if (start > end) {
    return { valid: false, error: "Start date must be earlier than or equal to end date" };
  }

  const diffMs = end.getTime() - start.getTime();
  const maxMs = maxDays * 24 * 60 * 60 * 1000;

  if (diffMs > maxMs) {
    return {
      valid: false,
      error: `Date range exceeds maximum allowed window of ${maxDays} days`,
    };
  }

  return { valid: true };
}

/**
 * Safely encodes a cell for RFC 4180 CSV export and prevents formula injection.
 */
function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) {
    return "";
  }

  let str = typeof val === "object" ? JSON.stringify(val) : String(val);

  // Prevent formula injection in spreadsheet applications (Excel, LibreOffice)
  if (["=", "+", "-", "@", "\t", "\r"].some((char) => str.startsWith(char))) {
    str = `'${str}`;
  }

  // Quote if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export interface AuditLogExportRow {
  id: string;
  createdAt: Date | string;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  metadata: unknown;
  ipAddress: string | null;
}

/**
 * Formats audit log rows into a legally defensible, sanitized CSV report.
 */
export function generateAuditCsv(rows: AuditLogExportRow[]): string {
  const headers = [
    "Log ID",
    "Timestamp (UTC)",
    "Actor Email",
    "Actor Role",
    "Action",
    "Entity Type",
    "Entity ID",
    "Old Value",
    "New Value",
    "Metadata",
    "IP Address",
  ];

  const headerLine = headers.map(escapeCsvCell).join(",");
  const dataLines = rows.map((row) =>
    [
      row.id,
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      row.actorEmail,
      row.actorRole,
      row.action,
      row.entityType,
      row.entityId,
      row.oldValue,
      row.newValue,
      row.metadata,
      row.ipAddress ?? "",
    ]
      .map(escapeCsvCell)
      .join(","),
  );

  return [headerLine, ...dataLines].join("\r\n");
}
