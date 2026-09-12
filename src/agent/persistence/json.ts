/**
 * BC Agent P2 — canonical JSON helpers for Json columns.
 *
 * `toDbJson` is the single write-path conversion: it strips `undefined`
 * (JSON has no such value) and produces a Prisma-compatible JSON payload.
 * Reads are cast back through `JsonValue` — the shapes written are exactly
 * the core's readonly arrays/records, so the cast is total for data written
 * through this module.
 */

import type { Prisma } from "@prisma/client";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export function toDbJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value, (_k, v) => (v === undefined ? null : v))) as Prisma.InputJsonValue;
}

/**
 * Single read-path cast: data written through `toDbJson` is exactly the
 * core's readonly arrays/records, so `fromDbJson<T>` is total for rows this
 * module produced. Rows written by any other path are rejected upstream by
 * the service's validation.
 */
export function fromDbJson<T>(value: Prisma.JsonValue): T {
  return value as unknown as T;
}
