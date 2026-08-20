import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { db } from "@/lib/db";

const MAX_COIN_PER_REQ = 100;

/**
 * POST /player/coin { action: "add"|"deduct", amount, reason, reference }
 *
 * Endpoint untuk operasi koin. Sekarang menggunakan User.coins (canonical wallet)
 * sebagai satu-satunya sumber kebenaran saldo koin.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimitRoute(req, { maxRequests: 20, windowSeconds: 60, identifier: "bca-player-coin" });
  if (limited) return limited;

  let body: { action?: string; amount?: number; reason?: string; reference?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const action = body.action === "deduct" ? "deduct" : "add";
  const amount = Number.isFinite(body.amount) ? Math.min(MAX_COIN_PER_REQ, Math.max(1, Math.floor(body.amount ?? 0))) : 1;
  const reason = (body.reason || "SYSTEM").slice(0, 40);

  // Penambahan koin adalah konsekuensi bisnis, bukan telemetry klien. Hanya
  // tooling admin/founder yang boleh memanggil jalur add; fitur murid memakai
  // route server-side masing-masing (quest, karya, game, dan seterusnya).
  if (action === "add" && !user.isFounder && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Penambahan koin hanya dapat dilakukan oleh sistem" }, { status: 403 });
  }

  if (action === "deduct") {
    // Check balance on User.coins (canonical wallet)
    const u = await db.user.findUnique({ where: { id: user.id }, select: { coins: true } });
    if (!u || u.coins < amount) {
      return NextResponse.json({ error: "Koin tidak mencukupi", balance: u?.coins ?? 0 }, { status: 400 });
    }
    await db.$transaction([
      db.coinTransaction.create({ data: { userId: user.id, amount: -amount, reason, reference: body.reference } }),
      db.user.update({ where: { id: user.id }, data: { coins: { decrement: amount } } }),
    ]);
    const updated = await db.user.findUnique({ where: { id: user.id }, select: { coins: true } });
    return NextResponse.json({ action, balance: updated?.coins ?? 0 });
  }

  // Add: idempotent via (reason, reference)
  if (body.reference) {
    const existing = await db.coinTransaction.findFirst({
      where: { userId: user.id, reason, reference: body.reference },
      select: { id: true },
    });
    if (existing) {
      const u = await db.user.findUnique({ where: { id: user.id }, select: { coins: true } });
      return NextResponse.json({ action, balance: u?.coins ?? 0, duplicate: true });
    }
  }

  await db.$transaction([
    db.coinTransaction.create({ data: { userId: user.id, amount, reason, reference: body.reference } }),
    db.user.update({ where: { id: user.id }, data: { coins: { increment: amount } } }),
  ]);
  const updated = await db.user.findUnique({ where: { id: user.id }, select: { coins: true } });
  return NextResponse.json({ action, balance: updated?.coins ?? 0, duplicate: false });
}
