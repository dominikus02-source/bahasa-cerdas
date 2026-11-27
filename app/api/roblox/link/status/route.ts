import { NextRequest, NextResponse } from "next/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { fromRobloxService, robloxError } from "@/lib/roblox/http";
import { getRobloxPageStatus } from "@/lib/roblox/service";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return robloxError(401, "UNAUTHORIZED", "Masuk dulu untuk menautkan Roblox.");
  const limited = await rateLimitRoute(req, {
    maxRequests: 60,
    windowSeconds: 60,
    identifier: "roblox-link-status",
    subject: user.id,
  });
  if (limited) return limited;
  try {
    return NextResponse.json(await getRobloxPageStatus(user.id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fromRobloxService(error);
  }
}
