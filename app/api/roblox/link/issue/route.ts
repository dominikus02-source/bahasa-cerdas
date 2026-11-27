import { NextRequest, NextResponse } from "next/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { fromRobloxService, robloxError } from "@/lib/roblox/http";
import { asRecord } from "@/lib/roblox/json";
import { issueRobloxLinkCode } from "@/lib/roblox/service";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return robloxError(401, "UNAUTHORIZED", "Masuk dulu untuk menautkan Roblox.");
  const limited = await rateLimitRoute(req, {
    maxRequests: 10,
    windowSeconds: 600,
    identifier: "roblox-link-issue",
    subject: user.id,
  });
  if (limited) return limited;

  let parsed: unknown = {};
  try {
    parsed = await req.json();
  } catch {
    parsed = {};
  }
  const body = asRecord(parsed) ?? {};
  try {
    const status = await issueRobloxLinkCode(user.id, {
      confirmAge: body.confirmAge === true,
      regenerate: body.regenerate === true,
    });
    return NextResponse.json({ status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fromRobloxService(error);
  }
}
