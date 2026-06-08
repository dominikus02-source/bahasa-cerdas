import { NextResponse } from "next/server";
import { getIsProduction } from "@/lib/midtrans";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disabled in production" }, { status: 403 });
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  const envIsProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION;

  return NextResponse.json({
    midtrans: {
      isProduction: getIsProduction(),
      envIsProduction,
      clientKeyPrefix: clientKey ? clientKey.substring(0, 12) + "..." : "NOT SET",
      serverKeySet: !!serverKey,
      serverKeyPrefix: serverKey ? serverKey.substring(0, 12) + "..." : "NOT SET",
      snapUrl: getIsProduction()
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://bahasacerdas.com",
    },
  });
}
