import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getIsProduction, getSnapScriptUrl, getMidtransApiUrl } from "@/lib/midtrans";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hasServerKey = !!process.env.MIDTRANS_SERVER_KEY;
    const hasClientKey = !!process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

    const serverIsProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const clientIsProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";

    const effectiveProduction = getIsProduction();
    const modeMatches = serverIsProduction === clientIsProduction;

    const snapUrl = getSnapScriptUrl();
    const apiBaseUrl = getMidtransApiUrl();

    // Key prefix heuristic — production keys often have different prefixes
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
    const serverKeyPrefix = serverKey.substring(0, 20) + "...";
    const clientKeyPrefix = clientKey.substring(0, 20) + "...";

    const warnings: string[] = [];
    if (!hasServerKey) warnings.push("MIDTRANS_SERVER_KEY tidak disetel");
    if (!hasClientKey) warnings.push("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY tidak disetel");
    if (!modeMatches) warnings.push("Server dan client punya mode produksi berbeda");
    if (effectiveProduction && serverKey.includes("SB-Mid")) warnings.push("Server key terlihat seperti sandbox key tetapi mode production");
    if (!effectiveProduction && !serverKey.includes("SB-Mid")) warnings.push("Server key mungkin production key tetapi mode sandbox");

    return NextResponse.json({
      server: {
        hasServerKey,
        isProduction: serverIsProduction,
        keyPrefix: serverKeyPrefix,
      },
      client: {
        hasPublicClientKey: hasClientKey,
        isProduction: clientIsProduction,
        keyPrefix: clientKeyPrefix,
      },
      effective: {
        isProduction: effectiveProduction,
        snapUrl,
        apiBaseUrl,
        mode: effectiveProduction ? "production" : "sandbox",
      },
      consistency: {
        modeMatches,
        allKeysPresent: hasServerKey && hasClientKey,
        warnings,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
