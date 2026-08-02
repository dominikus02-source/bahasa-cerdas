import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { addXp, XP_SOURCES, type XpSource } from "@/lib/gamification/xp-engine";
import { evaluateBadges } from "@/lib/gamification/badge-engine";
import { batasiXpSubmit } from "@/lib/xp-guard";

/**
 * POST /player/xp — tambah XP lewat engine universal.
 *
 * Keamanan: angka XP TIDAK diambil mentah dari klien. `amount` hanyalah usulan
 * maksimum; server memangkasnya dengan batas per-submit per sumber (lihat
 * lib/xp-guard.ts) + rate limit per sesi. `reference` menjadikan panggilan
 * idempotent (kombinasi userId+source+reference unik di DB).
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimitRoute(req, { maxRequests: 30, windowSeconds: 60, identifier: "bca-player-xp" });
  if (limited) return limited;

  let body: { source?: string; amount?: number; reference?: string; metadata?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const source = body.source?.toUpperCase();
  if (!source || !(XP_SOURCES as readonly string[]).includes(source)) {
    return NextResponse.json({ error: "Sumber XP tidak valid" }, { status: 400 });
  }

  const requested = Number.isFinite(body.amount) ? Math.max(1, Math.floor(body.amount ?? 0)) : 1;

  // Server decides real XP: cap per-submit per source.
  const capped = batasiXpSubmit(source, requested);

  const result = await addXp({
    userId: user.id,
    source: source as XpSource,
    amount: capped,
    reference: body.reference,
    metadata: body.metadata,
  });

  // Evaluasi badge setelah XP bertambah (best-effort).
  let badges: { total: number; unlocked: number } | undefined;
  try {
    const list = await evaluateBadges(user.id);
    badges = { total: list.length, unlocked: list.filter((b) => b.unlocked).length };
  } catch {
    badges = undefined;
  }

  return NextResponse.json({ result, badges });
}
