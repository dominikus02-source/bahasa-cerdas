/**
 * GET /api/admin/ai-quota/audit-log — Admin quota action audit log.
 *
 * Founder-only. Returns paginated log of all quota-related admin actions.
 *
 * Query params:
 *   page          (default 1)
 *   limit         (default 50, max 100)
 *   action        (optional: EXTEND_TRIAL | RESET_CREDITS | ALLOCATE_CREDITS)
 *   targetUserId  (optional): filter by target user
 *   adminUserId   (optional): filter by admin
 *   search        (optional): search in target/admin user name or email
 *   from          (optional): ISO date string, filter logs after this date
 *   to            (optional): ISO date string, filter logs before this date
 *
 * Response includes minimal user info (id, fullName, email, role).
 * No sensitive fields exposed.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db as prisma } from "@/lib/db";

const VALID_ACTIONS = ["EXTEND_TRIAL", "RESET_CREDITS", "ALLOCATE_CREDITS"];

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const actionFilter = searchParams.get("action") || "";
    const targetUserId = searchParams.get("targetUserId") || "";
    const adminUserId = searchParams.get("adminUserId") || "";
    const search = searchParams.get("search") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const where: any = {};

    if (actionFilter && VALID_ACTIONS.includes(actionFilter)) {
      where.action = actionFilter;
    }
    if (targetUserId) {
      where.targetUserId = targetUserId;
    }
    if (adminUserId) {
      where.adminUserId = adminUserId;
    }
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        where.createdAt = { ...where.createdAt, gte: fromDate };
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        where.createdAt = { ...where.createdAt, lte: toDate };
      }
    }

    // Search in user names/emails — requires subquery approach
    // We handle search by filtering admin/target user IDs
    let adminIdFilter: string[] | null = null;
    let targetIdFilter: string[] | null = null;

    if (search) {
      const searchUsers = await prisma.user.findMany({
        where: {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
        select: { id: true },
        take: 100,
      });
      const ids = searchUsers.map((u) => u.id);
      if (ids.length === 0) {
        // No matching users — return empty
        return NextResponse.json({
          success: true,
          data: {
            logs: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
          },
        });
      }
      where.OR = [
        { adminUserId: { in: ids } },
        { targetUserId: { in: ids } },
      ];
    }

    const total = await prisma.adminQuotaAuditLog.count({ where });

    const logs = await prisma.adminQuotaAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        admin: {
          select: { id: true, fullName: true, email: true },
        },
        target: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        logs: logs.map((l) => ({
          id: l.id,
          action: l.action,
          amount: l.amount,
          previousValue: l.previousValue,
          newValue: l.newValue,
          reason: l.reason,
          createdAt: l.createdAt.toISOString(),
          admin: l.admin,
          target: l.target,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error("[Admin Quota Audit Log] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal error" }, { status: 500 });
  }
}
