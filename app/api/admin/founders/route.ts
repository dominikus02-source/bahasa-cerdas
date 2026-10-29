import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { withAdmin } from "@/lib/admin/guard";
import { SUPER_FOUNDER_EMAILS, isSuperFounder } from "@/lib/auth/super-founder";

/** GET /api/admin/founders — daftar founder + apakah penonton super founder. */
async function adminGET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const founders = await db.user.findMany({
    where: { isFounder: true },
    select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    canManage: isSuperFounder(user),
    founders: founders.map((f) => ({
      ...f,
      isSuperFounder: SUPER_FOUNDER_EMAILS.includes(f.email.toLowerCase()),
    })),
  });
}

export const GET = withAdmin(adminGET, { route: "/api/admin/founders", method: "GET" });
