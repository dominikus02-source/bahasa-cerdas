import { NextRequest, NextResponse } from "next/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { normalizeLinkCode } from "@/lib/roblox/codes";
import { authorizeRobloxServer, fromRobloxService, robloxError } from "@/lib/roblox/http";
import { verifyAndBind } from "@/lib/roblox/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await authorizeRobloxServer(req);
  if (!auth.ok) return auth.response;

  const robloxUserId = auth.body.robloxUserId;
  const code = typeof auth.body.code === "string" ? auth.body.code : "";
  if (typeof robloxUserId !== "string") {
    return robloxError(400, "INVALID_ROBLOX_USER", "userId Roblox tidak valid.");
  }

  const limitedUser = await rateLimitRoute(req, {
    maxRequests: 15,
    windowSeconds: 600,
    identifier: "roblox-link-verify-user",
    subject: `roblox:${robloxUserId}`,
  });
  if (limitedUser) return limitedUser;

  const normalized = normalizeLinkCode(code);
  if (normalized) {
    const limitedCode = await rateLimitRoute(req, {
      maxRequests: 8,
      windowSeconds: 600,
      identifier: "roblox-link-verify-code",
      subject: `code:${normalized}`,
    });
    if (limitedCode) return limitedCode;
  }

  try {
    const result = await verifyAndBind({
      code,
      robloxUserId,
      robloxUsername: auth.body.robloxUsername,
      robloxDisplayName: auth.body.robloxDisplayName,
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fromRobloxService(error);
  }
}
