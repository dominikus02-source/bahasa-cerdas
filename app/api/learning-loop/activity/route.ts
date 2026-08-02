import { NextRequest, NextResponse } from "next/server";
import { ActivityType, LearningSkillType } from "@prisma/client";
import { getUser } from "@/lib/supabase/server";
import { recordActivity } from "@/lib/learning-loop/activity";
import type { ActivityInput } from "@/lib/learning-loop/types";

/** Kumpulan nilai enum yang valid untuk validasi input klien. */
const VALID_TYPES = new Set<string>(Object.values(ActivityType));
const VALID_SKILLS = new Set<string>(Object.values(LearningSkillType));

/**
 * POST /api/learning-loop/activity — catat satu aktivitas belajar user.
 *
 * Body: `{ type, subtype?, skill?, skillDelta?, xp?, coin?, meta?, reference?,
 * journey? }`. `type` wajib dan harus dikenal; `skill` opsional tetapi harus
 * nilai enum yang valid.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  if (typeof body.type !== "string" || !VALID_TYPES.has(body.type)) {
    return NextResponse.json({ error: "type tidak dikenal" }, { status: 400 });
  }
  if (
    body.skill != null &&
    (typeof body.skill !== "string" || !VALID_SKILLS.has(body.skill))
  ) {
    return NextResponse.json({ error: "skill tidak dikenal" }, { status: 400 });
  }

  const input: ActivityInput = {
    userId: user.id,
    type: body.type as ActivityType,
    subtype: typeof body.subtype === "string" ? body.subtype : undefined,
    skill: typeof body.skill === "string" ? (body.skill as LearningSkillType) : null,
    skillDelta: typeof body.skillDelta === "number" ? body.skillDelta : undefined,
    xp: typeof body.xp === "number" ? body.xp : undefined,
    coin: typeof body.coin === "number" ? body.coin : undefined,
    meta: isObject(body.meta) ? (body.meta as Record<string, unknown>) : undefined,
    reference: typeof body.reference === "string" ? body.reference : undefined,
    journey: isObject(body.journey)
      ? (body.journey as { title: string; description?: string; icon?: string })
      : null,
  };

  await recordActivity(input);
  return NextResponse.json({ ok: true });
}

/** Guard: nilai adalah objek biasa (bukan null, bukan array). */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
