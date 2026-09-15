import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRpgFounderPreviewApiAccess } from "@/lib/game/rpg/server-access";
import {
  PendekarLearningError,
  PendekarOwnershipError,
  PendekarStateService,
} from "@/lib/game/rpg/server-state";

export const dynamic = "force-dynamic";

type BattleRouteContext = { params: Promise<{ battleId: string }> };

/** Server-select one quality-gated learning challenge for an owned active battle. */
export async function POST(_request: NextRequest, context: BattleRouteContext) {
  const access = await requireRpgFounderPreviewApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { battleId } = await context.params;

  try {
    const result = await new PendekarStateService(db).startAuthoritativeLearningSession(access.userId, battleId);
    return NextResponse.json({ result }, { status: result.category === "STARTED" ? 201 : 200 });
  } catch (error) {
    if (error instanceof PendekarOwnershipError) {
      return NextResponse.json({ error: { code: "LEARNING_NOT_ACTIVE", message: "Battle is unavailable" } }, { status: 404 });
    }
    if (error instanceof PendekarLearningError) {
      const status = error.code === "LEARNING_EXPIRED" ? 410 : 409;
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status });
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to start Pendekar learning" } },
      { status: 500 },
    );
  }
}
