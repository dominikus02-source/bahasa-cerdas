import { NextRequest, NextResponse } from "next/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { authorizeRobloxServer, fromRobloxService, robloxError } from "@/lib/roblox/http";
import { awardRobloxBadges } from "@/lib/roblox/service";

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
    identifier: "roblox-badges",
    subject: `roblox:${robloxUserId}`,
  });
  if (limited) return limited;
  try {
    const result = await awardRobloxBadges(robloxUserId, auth.body.codes);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fromRobloxService(error);
  }
}
