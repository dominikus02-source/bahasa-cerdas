import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin } from "@/lib/admin/guard";

/** GET /api/admin/audit-log?page=1&q=withdrawals — log aksi admin terbaru. */
async function adminGET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const q = (sp.get("q") || "").trim().slice(0, 100);
  const take = 30;
  const where = q
    ? { OR: [{ path: { contains: q, mode: "insensitive" as const } }, { actorEmail: { contains: q, mode: "insensitive" as const } }] }
    : {};
  const [entries, total] = await Promise.all([
    db.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      select: { id: true, actorEmail: true, method: true, path: true, status: true, targetUserId: true, metadata: true, createdAt: true },
    }),
    db.adminAuditLog.count({ where }),
  ]);
  return NextResponse.json({ entries, total, page, pages: Math.max(1, Math.ceil(total / take)) });
}

export const GET = withAdmin(adminGET, { route: "/api/admin/audit-log", method: "GET" });
