/**
 * BC Agent P4 — shared bounded HTTP fetch for external read-only tools
 * (§13/§14/§17). Node's global fetch (Node ≥18; repo runs Node 26) with:
 * - AbortSignal timeout (ONE per call)
 * - response size cap (Content-Length check + incremental read cap)
 * - typed error mapping (timeout / rate limit / unavailable / auth / failed)
 *
 * Responses are read as TEXT and bounded — no streaming into memory
 * unbounded, no binary handling needed for JSON APIs.
 */

import { ToolFailedError, ToolSystemError } from "../errors";

export interface FetchJsonOptions {
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly maxBytes: number;
  readonly toolName: string;
}

export type HttpFailureKind = "TIMEOUT" | "RATE_LIMITED" | "UNAVAILABLE" | "AUTH" | "FAILED";

export class HttpToolError extends ToolSystemError {
  readonly code: "TOOL_TIMEOUT" | "TOOL_RATE_LIMITED" | "TOOL_UNAVAILABLE" | "TOOL_FAILED";
  constructor(readonly kind: HttpFailureKind, toolName: string, status: number | null, detail: string) {
    super(`${toolName}: ${kind.toLowerCase()}${status ? ` (HTTP ${status})` : ""}: ${detail.slice(0, 160)}`);
    this.code = kind === "TIMEOUT" ? "TOOL_TIMEOUT" : kind === "RATE_LIMITED" ? "TOOL_RATE_LIMITED" : kind === "UNAVAILABLE" ? "TOOL_UNAVAILABLE" : "TOOL_FAILED";
  }
}

/** Bounded JSON GET. Throws HttpToolError with a typed kind on failure. */
export async function fetchJsonBounded(opts: FetchJsonOptions): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(opts.url, {
      method: "GET",
      headers: { Accept: "application/json", ...(opts.headers ?? {}) },
      signal: controller.signal,
      redirect: "follow",
    });

    if (res.status === 401 || res.status === 403) {
      throw new HttpToolError("AUTH", opts.toolName, res.status, "credential missing, invalid, or insufficient");
    }
    if (res.status === 429) {
      throw new HttpToolError("RATE_LIMITED", opts.toolName, res.status, "rate limited by the upstream API");
    }
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new HttpToolError("UNAVAILABLE", opts.toolName, res.status, "upstream temporarily unavailable");
    }
    if (!res.ok) {
      throw new HttpToolError("FAILED", opts.toolName, res.status, "non-OK response");
    }

    const len = res.headers.get("content-length");
    if (len && Number(len) > opts.maxBytes) {
      throw new HttpToolError("FAILED", opts.toolName, res.status, `response too large (${len} bytes, limit ${opts.maxBytes})`);
    }

    const text = await readBounded(res, opts.maxBytes, opts.toolName);
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new HttpToolError("FAILED", opts.toolName, res.status, "response was not valid JSON");
    }
  } catch (err) {
    if (err instanceof HttpToolError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new HttpToolError("TIMEOUT", opts.toolName, null, `request exceeded ${opts.timeoutMs}ms`);
    }
    throw new HttpToolError("UNAVAILABLE", opts.toolName, null, err instanceof Error ? err.message : "network error");
  } finally {
    clearTimeout(timer);
  }
}

async function readBounded(res: Response, maxBytes: number, toolName: string): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let received = 0;
  const chunks: string[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        throw new HttpToolError("FAILED", toolName, res.status, `response exceeded ${maxBytes} bytes mid-stream`);
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return chunks.join("");
  } finally {
    try {
      await reader.cancel();
    } catch {
      // body already closed — fine
    }
  }
}

/** Summarize a failure for durable metadata without leaking response bodies. */
export function httpFailureCode(err: unknown): { code: string; message: string } {
  if (err instanceof HttpToolError) return { code: err.code, message: err.message.slice(0, 200) };
  if (err instanceof ToolFailedError) return { code: err.code, message: err.message.slice(0, 200) };
  return { code: "TOOL_FAILED", message: err instanceof Error ? err.message.slice(0, 200) : "unknown failure" };
}
