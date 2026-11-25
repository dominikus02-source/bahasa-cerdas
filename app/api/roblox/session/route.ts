import { NextRequest, NextResponse } from "next/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { authorizeRobloxServer, fromRobloxService, robloxError } from "@/lib/roblox/http";
import { getRobloxSession } from "@/lib/roblox/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await authorizeRobloxServer(req);
  if (!auth.ok) return auth.response;
  const robloxUserId = auth.body.robloxUserId;
  if (typeof robloxUserId !== "string") {
    return robloxError(400, "INVALID_ROBLOX_USER", "userId Roblox tidak valid.");
  }
  const limited = await rateLimitRoute(req, {
    maxRequests: 60,
    windowSeconds: 60,
    identifier: "roblox-session",
    subject: `roblox:${robloxUserId}`,
  });
  if (limited) return limited;
  try {
    return NextResponse.json(await getRobloxSession(robloxUserId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fromRobloxService(error);
  }
}
