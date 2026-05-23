import { NextResponse } from "next/server";

export async function GET() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

  return NextResponse.json({
    midtrans: {
      isProduction: clientKey?.startsWith("Mid-client-") ?? false,
      clientKeyPrefix: clientKey ? clientKey.substring(0, 12) + "..." : "NOT SET",
      serverKeySet: !!serverKey,
      serverKeyPrefix: serverKey ? serverKey.substring(0, 12) + "..." : "NOT SET",
      snapUrl: clientKey?.startsWith("Mid-client-")
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    },
  });
}
