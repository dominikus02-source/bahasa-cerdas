import { NextResponse } from "next/server";
import { z } from "zod";
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin) throw new Error("ORIGIN");
}
export async function jsonBody(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > 10000) throw new Error("SIZE");
  return JSON.parse(text);
}
export function privacyFailure(error: unknown) {
  const bad = error instanceof z.ZodError || (error instanceof Error && ["ORIGIN", "SIZE"].includes(error.message));
  return NextResponse.json({ error: bad ? "Periksa data dan muat ulang halaman." : "Layanan privasi belum tersedia. Coba lagi atau hubungi pengelola." }, { status: bad ? 400 : 503 });
}
