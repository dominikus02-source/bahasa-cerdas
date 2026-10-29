import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { withAdmin } from "@/lib/admin/guard";
import { SUPER_FOUNDER_EMAILS, isSuperFounder } from "@/lib/auth/super-founder";

/**
 * POST /api/admin/revoke-founder — { email }
 * Cabut status founder (akses admin + Pro seumur hidup + lencana). HANYA super
 * founder. Akun TIDAK dihapus; role & data guru tetap. Super founder tidak bisa
 * dicabut lewat sini (ubah lib/auth/super-founder.ts lewat PR).
 * Dicatat ke AdminAuditLog oleh withAdmin; wajib konfirmasi ketik.
 */
async function adminPOST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSuperFounder(user)) {
      return NextResponse.json({ error: "Hanya super founder yang bisa mencabut founder." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) return NextResponse.json({ error: "Email wajib diisi." }, { status: 400 });
    if (SUPER_FOUNDER_EMAILS.includes(email)) {
      return NextResponse.json({ error: "Super founder tidak bisa dicabut dari sini." }, { status: 400 });
    }

    const existing = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, isFounder: true },
    });
    if (!existing) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    if (!existing.isFounder) return NextResponse.json({ success: true, alreadyRevoked: true, email });

    await db.user.update({ where: { id: existing.id }, data: { isFounder: false } });
    return NextResponse.json({ success: true, userId: existing.id, email });
  } catch (error: any) {
    console.error("POST /api/admin/revoke-founder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = withAdmin(adminPOST, { route: "/api/admin/revoke-founder", method: "POST" });
