import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRpgPlayAccess } from "@/lib/game/rpg/server-access";
import { parseQuestMutationInput } from "@/lib/game/rpg/server-contracts";
import {
  PendekarOwnershipError,
  PendekarQuestMutationError,
  PendekarStateService,
} from "@/lib/game/rpg/server-state";

export const dynamic = "force-dynamic";

/**
 * P2.6I.2: Server-authoritative quest state mutation.
 *
 * The client reports WHAT changed (kind + optional to/flagName + requestKey);
 * the server validates, persists, and returns the authoritative state.
 * The server never trusts client-supplied quest.main/kills/flowers values.
 */
export async function POST(request: NextRequest) {
  const access = await requireRpgPlayAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Quest mutation body must be valid JSON" } },
      { status: 400 },
    );
  }
  const parsed = parseQuestMutationInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const result = await new PendekarStateService(db).mutateQuestState(access.userId, parsed.value);
    return NextResponse.json({ result }, { status: result.category === "APPLIED" ? 200 : 200 });
  } catch (error) {
    if (error instanceof PendekarOwnershipError) {
      return NextResponse.json(
        { error: { code: "INVALID_PLAYER_STATE", message: "Player not found" } },
        { status: 404 },
      );
    }
    if (error instanceof PendekarQuestMutationError) {
      const status =
        error.code === "QUEST_MUTATION_REPLAY_CONFLICT" ? 409
        : error.code === "QUEST_MUTATION_INVALID_TRANSITION" ? 422
        : error.code === "QUEST_MUTATION_INVALID_FLAG" ? 422
        : 400;
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status });
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to mutate quest state" } },
      { status: 500 },
    );
  }
}
