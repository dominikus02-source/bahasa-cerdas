import { NextResponse } from "next/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import {
  isRoleIntentConfigured,
  parseRoleSelection,
  signRoleSelectionIntent,
  intentSetCookie,
} from "@/lib/auth/role-intent";

/**
 * POST /api/auth/role-intent { role: "GURU" | "MURID" | "UMUM", kategoriUmum? }
 *
 * UMUM hanya diterima bila flag server ENABLE_ROLE_UMUM aktif. kategoriUmum
 * opsional: tidak dikirim → UMUM; dikirim → wajib MAHASISWA/DOSEN/UMUM
 * (nilai lain ditolak 400).
 *
 * Seals an explicit role choice (made in a controlled UI) into a short-lived,
 * HMAC-signed httpOnly cookie that the OAuth callback consumes exactly once.
 * Only allowlisted roles are accepted; anything else is rejected, never stored.
 */
export async function POST(req: Request) {
  const rl = await rateLimitRoute(req, { maxRequests: 20, windowSeconds: 60, identifier: "role-intent" });
  if (rl) return rl;

  let role: unknown;
  let kategoriUmum: unknown;
  try {
    const body = await req.json();
    role = body?.role;
    kategoriUmum = body?.kategoriUmum;
  } catch {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const selection = parseRoleSelection(role, kategoriUmum);
  if (!selection) {
    return NextResponse.json({ error: "Peran tidak valid" }, { status: 400 });
  }

  const sealed = signRoleSelectionIntent(selection);
  if (!sealed) {
    return NextResponse.json(
      { error: "Layanan peran belum dikonfigurasi. Coba lagi nanti." },
      { status: 503 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", intentSetCookie(sealed));
  return res;
}
