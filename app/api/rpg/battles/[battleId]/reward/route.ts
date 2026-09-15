import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRpgFounderPreviewApiAccess } from "@/lib/game/rpg/server-access";
import { parseCreateBattleRewardReceiptInput } from "@/lib/game/rpg/server-contracts";
import {
  PendekarBattleRewardError,
  PendekarOwnershipError,
  PendekarStateService,
} from "@/lib/game/rpg/server-state";

export const dynamic = "force-dynamic";

type BattleRouteContext = { params: Promise<{ battleId: string }> };

/** Create or replay a pending, server-derived victory entitlement only. */
export async function POST(request: NextRequest, context: BattleRouteContext) {
  const access = await requireRpgFounderPreviewApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { battleId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Battle reward body must be valid JSON" } },
      { status: 400 },
    );
  }
  const parsed = parseCreateBattleRewardReceiptInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const result = await new PendekarStateService(db).createAuthoritativeBattleRewardReceipt(access.userId, battleId, parsed.value);
    return NextResponse.json({ result }, { status: result.category === "CREATED" ? 201 : 200 });
  } catch (error) {
    if (error instanceof PendekarOwnershipError) {
      return NextResponse.json({ error: { code: "BATTLE_REWARD_NOT_ELIGIBLE", message: "Battle is unavailable" } }, { status: 404 });
    }
    if (error instanceof PendekarBattleRewardError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 409 });
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to create Pendekar battle reward receipt" } },
      { status: 500 },
    );
  }
}
