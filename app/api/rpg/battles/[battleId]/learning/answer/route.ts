import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRpgFounderPreviewApiAccess } from "@/lib/game/rpg/server-access";
import { parseSubmitLearningAnswerInput } from "@/lib/game/rpg/server-contracts";
import {
  PendekarLearningError,
  PendekarOwnershipError,
  PendekarStateService,
} from "@/lib/game/rpg/server-state";

export const dynamic = "force-dynamic";

type BattleRouteContext = { params: Promise<{ battleId: string }> };

/** Evaluate only an answer plus replay key; all learning and question identity is server-resolved. */
export async function POST(request: NextRequest, context: BattleRouteContext) {
  const access = await requireRpgFounderPreviewApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { battleId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Learning answer body must be valid JSON" } },
      { status: 400 },
    );
  }
  const parsed = parseSubmitLearningAnswerInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const result = await new PendekarStateService(db).submitAuthoritativeLearningAnswer(access.userId, battleId, parsed.value);
    return NextResponse.json({ result }, { status: result.category === "EVALUATED" ? 201 : 200 });
  } catch (error) {
    if (error instanceof PendekarOwnershipError) {
      return NextResponse.json({ error: { code: "LEARNING_NOT_ACTIVE", message: "Battle is unavailable" } }, { status: 404 });
    }
    if (error instanceof PendekarLearningError) {
      const status = error.code === "LEARNING_EXPIRED" ? 410 : 409;
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status });
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to submit Pendekar learning answer" } },
      { status: 500 },
    );
  }
}
