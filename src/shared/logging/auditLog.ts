import { logger } from "./logger";

export interface AuditLogEntry {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    changes?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
    requestId?: string;
    timestamp: string;
}

export function auditLog(entry: Omit<AuditLogEntry, "timestamp">): void {
    logger.info("AUDIT_LOG", { ...entry, timestamp: new Date().toISOString() });
}

export function auditAuthEvent(
    action: "login" | "logout" | "register" | "refresh" | "failed_login",
    userId: string | undefined,
    metadata?: Record<string, unknown>,
): void {
    auditLog({ userId, action: `auth.${action}`, resource: "authentication", metadata });
}
