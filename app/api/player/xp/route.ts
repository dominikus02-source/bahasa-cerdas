import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { XP_SOURCES } from "@/lib/gamification/xp-engine";
import { evaluateBadges } from "@/lib/gamification/badge-engine";
import { awardXp } from "@/lib/award-xp";

/**
 * POST /player/xp — tambah XP lewat pintu tunggal `awardXp`.
 *
 * Keamanan: angka XP TIDAK diambil mentah dari klien. `amount` hanyalah usulan
 * maksimum; `awardXp` memangkasnya dengan batas per-submit per sumber, menegakkan
 * kuota harian, dan menerapkan XP Boost (lihat lib/award-xp.ts) + rate limit per
 * sesi di sini. `reference` menjadikan panggilan idempotent.
 *
 * Rute ini dulu memanggil `addXp` langsung — melewati kuota harian dan boost,
 * jadi pintu kedua yang lebih lemah. Jangan kembalikan.
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

  // Pemangkasan, kuota harian, boost, dan pencatatan ledger dikerjakan di dalam.
  const result = await awardXp(user.id, source, requested, body.reference);

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
