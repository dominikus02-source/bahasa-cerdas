import { NextRequest, NextResponse } from "next/server";
import { RobloxServiceError } from "@/lib/roblox/errors";
import { asRecord } from "@/lib/roblox/json";
import { authenticateRobloxServer } from "@/lib/roblox/server-auth";

export async function authorizeRobloxServer(req: NextRequest): Promise<
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: NextResponse }
> {
  const raw = req.method === "GET" ? "" : await req.text();
  const auth = await authenticateRobloxServer({
    method: req.method,
    contentType: req.headers.get("content-type"),
    authorization: req.headers.get("authorization"),
    timestamp: req.headers.get("x-roblox-timestamp"),
    requestId: req.headers.get("x-request-id"),
    signature: req.headers.get("x-roblox-signature"),
    rawBody: raw,
  });
  if (!auth.ok) return { ok: false, response: robloxError(auth.status, auth.error, auth.message) };

  const jobId = req.headers.get("x-roblox-job-id");
  const placeId = req.headers.get("x-roblox-place-id");
  if (jobId || placeId) {
    console.info("ROBLOX_SERVER_REQUEST", {
      scheme: auth.scheme,
      path: req.nextUrl.pathname,
      jobId: jobId?.slice(0, 80) ?? null,
      placeId: placeId?.slice(0, 20) ?? null,
    });
  }

  if (req.method === "GET") return { ok: true, body: {} };
  try {
    const parsed = asRecord(JSON.parse(raw) as unknown);
    if (!parsed) return { ok: false, response: robloxError(400, "INVALID_JSON", "JSON harus berupa objek.") };
    return { ok: true, body: parsed };
  } catch {
    return { ok: false, response: robloxError(400, "INVALID_JSON", "JSON tidak valid.") };
  }
}

export function robloxError(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status, headers: { "Cache-Control": "no-store" } });
}

export function fromRobloxService(error: unknown) {
  if (error instanceof RobloxServiceError) return robloxError(error.status, error.code, error.message);
  console.error("ROBLOX_API_FAILED", error instanceof Error ? error.message : "unknown");
  return robloxError(500, "SERVER_ERROR", "Terjadi kesalahan. Coba lagi.");
}
