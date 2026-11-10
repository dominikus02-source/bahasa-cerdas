import { NextRequest, NextResponse } from "next/server";
import { appendAuthCookieExpiry } from "@/lib/auth/expire-auth-cookies";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Cookie expiry below still prevents /login from resuming a leftover JWT.
  }
  const response = NextResponse.json({ message: "Logged out" }, { status: 200 });
  response.headers.set("Cache-Control", "private, no-store");
  appendAuthCookieExpiry(
    response.headers,
    req.cookies.getAll().map((cookie) => cookie.name),
    req.headers.get("host") ?? req.nextUrl.host,
  );
  return response;
}
