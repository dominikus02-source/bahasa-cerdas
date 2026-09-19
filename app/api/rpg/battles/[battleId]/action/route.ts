import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRpgPlayAccess } from "@/lib/game/rpg/server-access";
import { parseSubmitBattleActionInput } from "@/lib/game/rpg/server-contracts";
import {
  PendekarBattleActionError,
  PendekarOwnershipError,
  PendekarStateService,
} from "@/lib/game/rpg/server-state";

export const dynamic = "force-dynamic";

type BattleRouteContext = { params: Promise<{ battleId: string }> };

/** Resolve one server-authoritative combat intent for an owned preview battle. */
export async function POST(request: NextRequest, context: BattleRouteContext) {
  const access = await requireRpgPlayAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { battleId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Battle action body must be valid JSON" } },
      { status: 400 },
    );
  }
  const parsed = parseSubmitBattleActionInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const result = await new PendekarStateService(db).submitAuthoritativeBattleAction(access.userId, battleId, parsed.value);
    return NextResponse.json({ result }, { status: result.category === "RESOLVED" ? 201 : 200 });
  } catch (error) {
    if (error instanceof PendekarOwnershipError) {
      return NextResponse.json({ error: { code: "BATTLE_NOT_ACTIVE", message: "Battle is unavailable" } }, { status: 404 });
    }
    if (error instanceof PendekarBattleActionError) {
      const status = error.code === "BATTLE_EXPIRED" ? 410 : error.code === "BATTLE_ACTION_REPLAY_CONFLICT" ? 409 : 409;
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status });
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to resolve Pendekar battle action" } },
      { status: 500 },
    );
  }
}
