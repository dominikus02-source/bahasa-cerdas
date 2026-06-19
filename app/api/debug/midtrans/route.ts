import { NextResponse } from "next/server";
import { requireFounder, forbiddenResponse } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireFounder();
  } catch {
    return forbiddenResponse();
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

  return NextResponse.json({
    midtrans: {
      serverKeySet: !!serverKey,
      clientKeySet: !!clientKey,
      snapUrl: "https://app.midtrans.com/snap/snap.js",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.bahasacerdas.com",
    },
  });
}
