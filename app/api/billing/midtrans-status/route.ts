import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getIsProduction } from "@/lib/midtrans";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hasServerKey = !!process.env.MIDTRANS_SERVER_KEY;
    const hasClientKey = !!process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    const isProduction = getIsProduction();

    const snapUrl = isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";

    return NextResponse.json({
      hasServerKey,
      hasClientKey,
      isProduction,
      snapUrl,
      mode: isProduction ? "production" : "sandbox",
      ok: hasServerKey && hasClientKey,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
