import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRpgPlayAccess } from "@/lib/game/rpg/server-access";
import { parseEquipmentMutationInput } from "@/lib/game/rpg/server-contracts";
import {
  PendekarOwnershipError,
  PendekarInvariantError,
  PendekarStateService,
} from "@/lib/game/rpg/server-state";

export const dynamic = "force-dynamic";

/**
 * P2.6I.5: Server-authoritative equipment state mutation.
 *
 * The client reports WHAT changed (kind + slot + optional equipmentKey/weaponPlus + requestKey);
 * the server validates against the EQUIPMENT catalog, persists, and returns the authoritative state.
 */
export async function POST(request: NextRequest) {
  const access = await requireRpgPlayAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Equipment mutation body must be valid JSON" } },
      { status: 400 },
    );
  }
  const parsed = parseEquipmentMutationInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const result = await new PendekarStateService(db).mutateEquipment(access.userId, parsed.value);
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    if (error instanceof PendekarOwnershipError) {
      return NextResponse.json(
        { error: { code: "INVALID_PLAYER_STATE", message: "Player not found" } },
        { status: 404 },
      );
    }
    if (error instanceof PendekarInvariantError) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: error.message } },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to mutate equipment state" } },
      { status: 500 },
    );
  }
}
