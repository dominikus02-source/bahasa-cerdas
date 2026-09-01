import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// ════════════════════════════════════════════════════════════════════
// DATA QUALITY — Admin Trust Layer
//
// Read-only integrity checks. Severity: CRITICAL / WARNING / INFO.
// Detect → Explain → Link to remediation. Never silently mutate.
// ════════════════════════════════════════════════════════════════════

interface Finding {
  severity: "CRITICAL" | "WARNING" | "INFO";
  category: string;
  message: string;
  count: number;
  details?: { userId: string; fullName: string; email: string; context: string }[];
  remediation?: string;
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const findings: Finding[] = [];

    // ── 1. CRITICAL: SUCCESS payment without entitlement ──
    const paymentMismatch = await db.user.findMany({
      where: {
        isFounder: false,
        transaksi: { some: { type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] }, status: "SUCCESS" } },
        OR: [{ isPremium: false }, { premiumUntil: null }, { premiumUntil: { lt: now } }],
      },
      select: { id: true, fullName: true, email: true },
    });
    if (paymentMismatch.length > 0) {
      findings.push({
        severity: "CRITICAL",
        category: "payment_mismatch",
        message: `${paymentMismatch.length} SUCCESS payment(s) without active entitlement`,
        count: paymentMismatch.length,
        details: paymentMismatch.map((u) => ({ userId: u.id, fullName: u.fullName, email: u.email, context: "Payment without entitlement" })),
        remediation: "Use Payment Health → Fix Entitlement",
      });
    }

    // ── 2. WARNING: Premium without payment evidence ──
    const premiumNoPayment = await db.user.findMany({
      where: {
        isFounder: false,
        isPremium: true,
        premiumUntil: { gt: now },
        NOT: {
          transaksi: { some: { type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] }, status: "SUCCESS" } },
        },
      },
      select: { id: true, fullName: true, email: true, role: true, premiumUntil: true },
      take: 20,
    });
    if (premiumNoPayment.length > 0) {
      findings.push({
        severity: "WARNING",
        category: "premium_no_payment",
        message: `${premiumNoPayment.length} user(s) with active Premium but no qualifying payment`,
        count: premiumNoPayment.length,
        details: premiumNoPayment.map((u) => ({
          userId: u.id, fullName: u.fullName, email: u.email,
          context: `Active until ${u.premiumUntil?.toLocaleDateString("id-ID")} — may be admin-granted or grandfathered`,
        })),
      });
    }

    // ── 3. WARNING: Duplicate orderId ──
    const duplicateOrders = await db.$queryRaw<{ orderId: string; count: bigint }[]>`
      SELECT "orderId", COUNT(*)::bigint AS count
      FROM "Transaksi"
      WHERE "orderId" IS NOT NULL AND "orderId" != ''
      GROUP BY "orderId"
      HAVING COUNT(*) > 1
    `;
    if (duplicateOrders.length > 0) {
      findings.push({
        severity: "WARNING",
        category: "duplicate_order_id",
        message: `${duplicateOrders.length} duplicate orderId(s) found`,
        count: duplicateOrders.length,
        details: duplicateOrders.slice(0, 10).map((d) => ({
          userId: "", fullName: "", email: "",
          context: `orderId=${d.orderId} appears ${d.count} times`,
        })),
      });
    }

    // ── 4. WARNING: Duplicate midtransId ──
    const duplicateMidtrans = await db.$queryRaw<{ midtransId: string; count: bigint }[]>`
      SELECT "midtransId", COUNT(*)::bigint AS count
      FROM "Transaksi"
      WHERE "midtransId" IS NOT NULL AND "midtransId" != ''
      GROUP BY "midtransId"
      HAVING COUNT(*) > 1
    `;
    if (duplicateMidtrans.length > 0) {
      findings.push({
        severity: "WARNING",
        category: "duplicate_midtrans_id",
        message: `${duplicateMidtrans.length} duplicate midtransId(s) found`,
        count: duplicateMidtrans.length,
        details: duplicateMidtrans.slice(0, 10).map((d) => ({
          userId: "", fullName: "", email: "",
          context: `midtransId=${d.midtransId} appears ${d.count} times`,
        })),
      });
    }

    // ── 5. INFO: Users with incomplete profiles ──
    const incompleteProfiles = await db.user.count({
      where: {
        isFounder: false,
        profile: { is: null },
      },
    });
    if (incompleteProfiles > 0) {
      findings.push({
        severity: "INFO",
        category: "incomplete_profile",
        message: `${incompleteProfiles} user(s) without Profile record`,
        count: incompleteProfiles,
      });
    }

    // ── 6. INFO: Expired premium but isPremium still true ──
    const expiredButFlagged = await db.user.count({
      where: {
        isFounder: false,
        isPremium: true,
        premiumUntil: { lt: now },
      },
    });
    if (expiredButFlagged > 0) {
      findings.push({
        severity: "INFO",
        category: "expired_flag",
        message: `${expiredButFlagged} user(s) with isPremium=true but premiumUntil expired`,
        count: expiredButFlagged,
      });
    }

    // ── 7. INFO: Orphan GroupMembers ──
    const orphanMembers = await db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "GroupMember" gm
      LEFT JOIN "User" u ON u.id = gm."userId"
      WHERE u.id IS NULL
    `;
    const orphanCount = Number(orphanMembers[0]?.count || 0);
    if (orphanCount > 0) {
      findings.push({
        severity: "WARNING",
        category: "orphan_group_member",
        message: `${orphanCount} orphan GroupMember record(s) (user deleted)`,
        count: orphanCount,
      });
    }

    // ── Summary ──
    const critical = findings.filter((f) => f.severity === "CRITICAL").length;
    const warnings = findings.filter((f) => f.severity === "WARNING").length;
    const infos = findings.filter((f) => f.severity === "INFO").length;

    return NextResponse.json({
      timestamp: now.toISOString(),
      summary: { total: findings.length, critical, warnings, infos },
      findings,
    });
  } catch (error) {
    console.error("[Data Quality] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
