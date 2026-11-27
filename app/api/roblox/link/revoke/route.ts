import { NextRequest, NextResponse } from "next/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { fromRobloxService, robloxError } from "@/lib/roblox/http";
import { revokeRobloxLink } from "@/lib/roblox/service";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return robloxError(401, "UNAUTHORIZED", "Masuk dulu untuk menautkan Roblox.");
  const limited = await rateLimitRoute(req, {
    maxRequests: 10,
    windowSeconds: 600,
    identifier: "roblox-link-revoke",
    subject: user.id,
  });
  if (limited) return limited;
  try {
    const status = await revokeRobloxLink(user.id);
    return NextResponse.json({ status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fromRobloxService(error);
  }
}
