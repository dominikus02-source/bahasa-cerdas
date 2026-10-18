import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<string, string> = {
  GURU_PRO_MONTHLY: "Guru Pro Bulanan",
  GURU_PRO_YEARLY: "Guru Pro Tahunan",
  MURID_PREMIUM_MONTHLY: "Premium Bulanan",
  MURID_PREMIUM_YEARLY: "Premium Tahunan",
};

/** GET /api/billing/riwayat — 20 pembayaran paket terakhir milik pengguna. */
export async function GET() {
  const user = (await getUser().catch(() => null)) as { id: string } | null;
  if (!user) return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });

  const rows = await db.transaksi.findMany({
    where: { userId: user.id, type: { in: ["PREMIUM_UPGRADE", "MURID_PREMIUM"] }, orderId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { orderId: true, amount: true, status: true, createdAt: true, metadata: true, reference: true },
  });

  const items = rows.map((r) => {
    const meta = (r.metadata || {}) as Record<string, unknown>;
    const planId = typeof meta.planId === "string" ? meta.planId : r.reference || "";
    return {
      orderId: r.orderId as string,
      planId,
      label: PLAN_LABELS[planId] || "Paket",
      amount: r.amount,
      hargaAsli: typeof meta.hargaAsli === "number" ? meta.hargaAsli : null,
      kuponKode: typeof meta.kuponKode === "string" ? meta.kuponKode : null,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ ok: true, items }, { headers: { "Cache-Control": "no-store" } });
}
