import { db } from "@/lib/db";

/**
 * Jejak audit aksi admin (tabel AdminAuditLog).
 *
 * Aturan isi metadata: HANYA kunci yang aman. Nilai dengan kunci yang mirip
 * rahasia (password, token, secret, key, url, signature, cookie, otp, pin,
 * account number) TIDAK disimpan — cukup nama kuncinya. String dipotong 200
 * karakter. Penulisan log tidak pernah menggagalkan aksi (try/catch).
 */
const SENSITIVE_KEY = /pass|token|secret|key|url|sig|cookie|otp|pin|auth|credential|account.?number|rekening|nomor|phone|hp|base64|file|content|html|body/i;
const MAX_STRING = 200;
const MAX_KEYS = 40;
const MAX_ARRAY = 50;

export function sanitizeForAudit(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    if (depth >= 2) return `[array(${value.length})]`;
    return value.slice(0, MAX_ARRAY).map((v) => sanitizeForAudit(v, depth + 1));
  }
  if (typeof value === "object") {
    if (depth >= 2) return "[object]";
    const out: Record<string, unknown> = {};
    const redacted: string[] = [];
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, MAX_KEYS)) {
      if (SENSITIVE_KEY.test(k)) {
        redacted.push(k);
        continue;
      }
      out[k] = sanitizeForAudit(v, depth + 1);
    }
    if (redacted.length) out._redactedKeys = redacted;
    return out;
  }
  return String(value).slice(0, MAX_STRING);
}

export interface AdminAuditEntry {
  actorId: string;
  actorEmail: string;
  method: string;
  path: string;
  status: number;
  action?: string;
  targetUserId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

export async function logAdminAction(entry: AdminAuditEntry): Promise<void> {
  try {
    await db.adminAuditLog.create({
      data: {
        actorId: entry.actorId,
        actorEmail: entry.actorEmail.toLowerCase(),
        action: entry.action || `${entry.method} ${entry.path}`,
        method: entry.method,
        path: entry.path.slice(0, 300),
        status: entry.status,
        targetUserId: entry.targetUserId ?? null,
        metadata: (entry.metadata ? sanitizeForAudit(entry.metadata) : undefined) as never,
        ip: entry.ip?.slice(0, 64) ?? null,
        userAgent: entry.userAgent?.slice(0, 300) ?? null,
      },
    });
  } catch (error: any) {
    // Jangan pernah menggagalkan aksi karena log — tapi catat agar terlihat di log server.
    console.error("ADMIN_AUDIT_LOG_WRITE_FAILED", { path: entry.path, error: error?.message || String(error) });
  }
}
