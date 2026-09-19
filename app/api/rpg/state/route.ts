import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRpgPlayAccess } from "@/lib/game/rpg/server-access";
import { PendekarStateService } from "@/lib/game/rpg/server-state";

export const dynamic = "force-dynamic";

/** Authenticated founder-preview read of only the caller's safe RPG state. */
export async function GET() {
  const access = await requireRpgPlayAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const state = await new PendekarStateService(db).getStateProjection(access.userId);
    return NextResponse.json({ state });
  } catch {
    // Internal state details (including database schema and row identifiers)
    // are never returned to the browser.
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to load Pendekar state" } },
      { status: 500 },
    );
  }
}
