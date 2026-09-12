/**
 * BC Agent P4 — persistence metadata sanitization (§23 security logging).
 *
 * The ONLY function allowed to shape what reaches the ToolExecution.outputMeta
 * column. Everything is bounded (strings ≤200 chars, arrays ≤5 items, depth
 * ≤2) and keyed by allowlist — free-form tool payloads never reach the DB,
 * and secret-looking values are dropped by pattern regardless of key.
 */

const MAX_VALUE_CHARS = 200;
const MAX_ARRAY_ITEMS = 5;
const SECRET_PATTERN = /(token|key|secret|password|authorization|credential|apikey|api_key)/i;

export function redactMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta).slice(0, 10)) {
    if (SECRET_PATTERN.test(k)) continue; // never persist secret-named fields
    out[k] = bound(v, 0);
  }
  return out;
}

function bound(v: unknown, depth: number): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.slice(0, MAX_VALUE_CHARS);
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.slice(0, MAX_ARRAY_ITEMS).map((item) => bound(item, depth + 1));
  if (depth >= 2) return "[truncated]";
  if (typeof v === "object") {
    const rec: Record<string, unknown> = {};
    for (const [k2, v2] of Object.entries(v as Record<string, unknown>).slice(0, 10)) {
      if (SECRET_PATTERN.test(k2)) continue;
      rec[k2] = bound(v2, depth + 1);
    }
    return rec;
  }
  return String(v).slice(0, MAX_VALUE_CHARS);
}
