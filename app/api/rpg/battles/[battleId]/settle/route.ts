import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRpgPlayAccess } from "@/lib/game/rpg/server-access";
import { parseSettleBattleRewardInput } from "@/lib/game/rpg/server-contracts";
import {
  PendekarBattleRewardError,
  PendekarBattleSettlementError,
  PendekarOwnershipError,
  PendekarStateService,
} from "@/lib/game/rpg/server-state";

export const dynamic = "force-dynamic";

type BattleRouteContext = { params: Promise<{ battleId: string }> };

/** Settle one owned, already-authoritative battle reward; browser values never enter the economy. */
export async function POST(request: NextRequest, context: BattleRouteContext) {
  const access = await requireRpgPlayAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { battleId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Battle settlement body must be valid JSON" } },
      { status: 400 },
    );
  }
  const parsed = parseSettleBattleRewardInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const result = await new PendekarStateService(db).settleAuthoritativeBattleReward(access.userId, battleId, parsed.value);
    return NextResponse.json({ result }, { status: result.category === "SETTLED" ? 201 : 200 });
  } catch (error) {
    if (error instanceof PendekarOwnershipError) {
      return NextResponse.json({ error: { code: "BATTLE_SETTLEMENT_NOT_READY", message: "Battle is unavailable" } }, { status: 404 });
    }
    if (error instanceof PendekarBattleRewardError || error instanceof PendekarBattleSettlementError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 409 });
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to settle Pendekar battle reward" } },
      { status: 500 },
    );
  }
}
