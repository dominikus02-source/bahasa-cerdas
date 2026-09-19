import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRpgPlayAccess } from "@/lib/game/rpg/server-access";
import { parseStartBattleInput } from "@/lib/game/rpg/server-contracts";
import {
  PendekarBattleStartError,
  PendekarInvariantError,
  PendekarStateService,
} from "@/lib/game/rpg/server-state";

export const dynamic = "force-dynamic";

/**
 * Start one controlled-slice battle. The request can only name a static
 * encounter and provide a replay key; all combat state is derived on server.
 */
export async function POST(request: NextRequest) {
  const access = await requireRpgPlayAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Battle start body must be valid JSON" } },
      { status: 400 },
    );
  }
  const parsed = parseStartBattleInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const result = await new PendekarStateService(db).startAuthoritativeBattle(access.userId, parsed.value);
    return NextResponse.json({ result }, { status: result.category === "STARTED" ? 201 : 200 });
  } catch (error) {
    if (error instanceof PendekarBattleStartError) {
      const status = error.code === "ACTIVE_BATTLE_EXISTS" ? 409 : 422;
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status });
    }
    if (error instanceof PendekarInvariantError) {
      return NextResponse.json(
        { error: { code: "INVALID_PLAYER_STATE", message: "Pendekar state cannot start a battle" } },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to start Pendekar battle" } },
      { status: 500 },
    );
  }
}
