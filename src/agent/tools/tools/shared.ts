/**
 * BC Agent P4 — shared bounded-output helpers (§21).
 *
 * Every tool wraps its payload through `boundedOutput` so the envelope
 * invariants (byte count, cap, truncation flag, provenance label) are
 * computed in exactly one place.
 *
 * Truncation strategy: when the serialized payload exceeds the cap, string
 * VALUES are shortened (structure preserved, JSON stays valid) in passes —
 * never the serialized form itself, which would produce unparseable JSON.
 * If even the coarsest pass does not fit, `data` is replaced by a small
 * marker object; `truncated` is always true by then.
 */

import type { ToolOutputEnvelope } from "../types";

const TRUNCATION_PASSES = [4096, 512, 64] as const;

export function boundedOutput<T>(data: T, opts: { maxBytes: number; items: number; source: string }): ToolOutputEnvelope<T> {
  const direct = JSON.stringify(data ?? null) ?? "null";
  if (Buffer.byteLength(direct, "utf8") <= opts.maxBytes) {
    return { data, bytes: Buffer.byteLength(direct, "utf8"), maxBytes: opts.maxBytes, items: opts.items, truncated: false, source: opts.source };
  }

  // Over cap: shorten string values, preserving JSON structure.
  for (const limit of TRUNCATION_PASSES) {
    const cut = truncateStrings(data, limit);
    const s = JSON.stringify(cut) ?? "null";
    if (Buffer.byteLength(s, "utf8") <= opts.maxBytes) {
      return { data: cut as T, bytes: Buffer.byteLength(s, "utf8"), maxBytes: opts.maxBytes, items: opts.items, truncated: true, source: opts.source };
    }
  }

  // Even 64-char strings do not fit — replace the payload with a minimal
  // marker. The marker itself has a byte floor (~25B): below that, the cap
  // cannot be honored at all, so the smallest valid envelope payload is used.
  const marker = { note: "[too large]" } as unknown as T;
  const s = JSON.stringify(marker) ?? "null";
  return { data: marker, bytes: Buffer.byteLength(s, "utf8"), maxBytes: opts.maxBytes, items: opts.items, truncated: true, source: opts.source };
}

/** Recursively shorten string values to `limit` chars (with a marker suffix). */
function truncateStrings(value: unknown, limit: number): unknown {
  if (typeof value === "string") {
    return value.length <= limit ? value : `${value.slice(0, limit)}…[truncated]`;
  }
  if (Array.isArray(value)) {
    return value.map((v) => truncateStrings(v, limit));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = truncateStrings(v, limit);
    }
    return out;
  }
  return value;
}
