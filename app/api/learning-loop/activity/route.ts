import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { recordActivity } from "@/lib/learning-loop/activity";
import { deriveClientEvent } from "@/lib/learning-loop/client-events";
import { rateLimitRoute } from "@/lib/rate-limit";

/**
 * POST /api/learning-loop/activity — catat satu aktivitas belajar user.
 *
 * Browser hanya boleh mengirim event telemetry ringan (LOGIN/SOCIAL). Semua
 * konsekuensi belajar/reward diturunkan oleh route fitur server-side.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimitRoute(req, {
    maxRequests: 30,
    windowSeconds: 60,
    identifier: "learning-loop-client-event",
  });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const input = deriveClientEvent(user.id, body.type);
  if (!input) {
    return NextResponse.json(
      { error: "Aktivitas belajar harus dicatat oleh fitur server yang memverifikasi hasilnya" },
      { status: 403 }
    );
  }

  await recordActivity(input);
  return NextResponse.json({ ok: true, type: input.type, rewards: { skillDelta: 0, xp: 0, coin: 0 } });
}
