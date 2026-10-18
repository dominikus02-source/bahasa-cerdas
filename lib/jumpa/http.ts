import { NextResponse } from "next/server";
import { JUMPA_ENABLED } from "@/lib/features";

const NO_STORE = { "Cache-Control": "private, no-store" };

export function jumpaJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/** 404 polos saat flag mati — fitur tidak terlihat sama sekali. */
export function jumpaDisabledResponse(): NextResponse | null {
  if (JUMPA_ENABLED) return null;
  return jumpaJson({ error: "Tidak ditemukan" }, 404);
}

export function jumpaError(status: number, code: string, message: string, extra?: Record<string, unknown>): NextResponse {
  return jumpaJson({ ...(extra ?? {}), error: message, code }, status);
}
