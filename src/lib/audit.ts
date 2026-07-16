import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "auth.register"
  | "auth.login"
  | "auth.login_failed"
  | "auth.login_locked"
  | "auth.logout"
  | "auth.logout_all"
  | "auth.refresh_reuse_detected"
  | "auth.password_forgot"
  | "auth.password_reset"
  | "auth.password_changed"
  | "auth.email_changed"
  | "account.deleted"
  | "admin.user_updated"
  | "admin.user_blocked"
  | "admin.user_deleted"
  | "entries.imported"
  | "entries.bulk_deleted";

/**
 * Log de auditoria. Nunca registrar senhas, tokens ou dados sensíveis
 * em `metadata` — apenas identificadores e contadores.
 */
export async function audit(
  action: AuditAction,
  options: {
    userId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId: options.userId ?? null,
        ip: options.ip?.slice(0, 45) ?? null,
        userAgent: options.userAgent?.slice(0, 300) ?? null,
        metadata: options.metadata
          ? JSON.parse(JSON.stringify(options.metadata))
          : undefined,
      },
    });
  } catch (error) {
    // Auditoria nunca deve derrubar a requisição principal.
    console.error("[audit] falha ao registrar log", error);
  }
}
