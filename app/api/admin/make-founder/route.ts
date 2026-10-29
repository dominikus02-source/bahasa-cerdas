import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { withAdmin } from "@/lib/admin/guard";
import { isSuperFounder } from "@/lib/auth/super-founder";

/**
 * POST /api/admin/make-founder — { email }
 * HANYA super founder (lib/auth/super-founder.ts). Founder lain → 403.
 * Dicatat ke AdminAuditLog oleh withAdmin; wajib konfirmasi ketik.
 */
async function adminPOST(req: Request) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isSuperFounder(user)) {
      return NextResponse.json({ error: "Hanya super founder yang bisa menambah founder." }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    if (!email) return NextResponse.json({ error: "Email wajib diisi." }, { status: 400 })

    const existing = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, isFounder: true },
    })
    if (!existing) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 })
    if (existing.isFounder) {
      return NextResponse.json({ success: true, alreadyFounder: true, email })
    }

    const target = await db.user.update({
      where: { id: existing.id },
      data: { isFounder: true },
      select: { id: true, email: true, fullName: true },
    })

    return NextResponse.json({ success: true, userId: target.id, email: target.email, fullName: target.fullName })
  } catch (error: any) {
    console.error("POST /api/admin/make-founder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export const POST = withAdmin(adminPOST, { route: "/api/admin/make-founder", method: "POST" });
