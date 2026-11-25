import { NextRequest, NextResponse } from "next/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { authorizeRobloxServer, fromRobloxService, robloxError } from "@/lib/roblox/http";
import { createRobloxQuestionSession } from "@/lib/roblox/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await authorizeRobloxServer(req);
  if (!auth.ok) return auth.response;
  const robloxUserId = auth.body.robloxUserId;
  if (typeof robloxUserId !== "string") {
    return robloxError(400, "INVALID_ROBLOX_USER", "userId Roblox tidak valid.");
  }
  const limited = await rateLimitRoute(req, {
    maxRequests: 20,
    windowSeconds: 60,
    identifier: "roblox-questions",
    subject: `roblox:${robloxUserId}`,
  });
  if (limited) return limited;
  try {
    const session = await createRobloxQuestionSession({
      robloxUserId,
      level: typeof auth.body.level === "number" ? auth.body.level : undefined,
      unitId: typeof auth.body.unitId === "string" ? auth.body.unitId : undefined,
      count: auth.body.count,
    });
    return NextResponse.json(session, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fromRobloxService(error);
  }
}
