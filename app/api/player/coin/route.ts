import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { addCoin, deductCoin } from "@/lib/gamification/coin-engine";

const MAX_COIN_PER_REQ = 100;

/**
 * POST /player/coin { action: "add"|"deduct", amount, reason, reference }
 *
 * Endpoint untuk operasi koin engine. Dipakai fitur yang butuh menambah/
 * mengurangi saldo koin PlayerProfile. Server membatasi amount per request.
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

  if (action === "deduct") {
    const res = await deductCoin(user.id, amount, reason, body.reference);
    if (!res.success) {
      return NextResponse.json({ error: "Koin tidak mencukupi", balance: res.balance }, { status: 400 });
    }
    return NextResponse.json({ action, balance: res.balance });
  }

  const res = await addCoin(user.id, amount, reason, body.reference);
  return NextResponse.json({ action, balance: res.balance, duplicate: res.duplicate });
}
