import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getMidtransConfig, validateMidtransConfig } from "@/lib/payments/midtrans-server";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = getMidtransConfig();

    const serverIsProduction = (process.env.MIDTRANS_IS_PRODUCTION || "").trim() === "true";
    const clientIsProduction = (process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || "").trim() === "true";
    const modeFlagsMatch = serverIsProduction === clientIsProduction;

    let configValid = true;
    let configError: string | null = null;
    try {
      validateMidtransConfig();
    } catch (e: any) {
      configValid = false;
      configError = e.message || "Validation failed";
    }

    const warnings: string[] = [];
    if (!config.serverKey) warnings.push("MIDTRANS_SERVER_KEY tidak disetel");
    if (!config.clientKey) warnings.push("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY tidak disetel");
    if (!modeFlagsMatch) warnings.push("MIDTRANS_IS_PRODUCTION dan NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION berbeda");
    if (config.isProduction && config.serverKey.startsWith("SB-")) {
      warnings.push("Server Key adalah sandbox key tetapi mode production — invoice akan gagal (401)");
    }
    if (!config.isProduction && config.serverKey && !config.serverKey.startsWith("SB-")) {
      warnings.push("Server Key bukan sandbox key tetapi mode sandbox — mungkin 401");
    }

    return NextResponse.json({
      ok: configValid,
      mode: config.isProduction ? "production" : "sandbox",
      server: {
        hasServerKey: !!config.serverKey,
        keyLength: config.serverKey.length,
        isProduction: serverIsProduction,
        apiBaseUrl: config.apiBaseUrl,
      },
      client: {
        hasClientKey: !!config.clientKey,
        keyLength: config.clientKey.length,
        isProduction: clientIsProduction,
        snapScriptUrl: config.snapScriptUrl,
      },
      consistency: {
        modeFlagsMatch,
        allKeysPresent: !!config.serverKey && !!config.clientKey,
        configValid,
        configError,
        warnings,
      },
      diagnosis: {
        invoiceShowsTest: !config.isProduction || !!config.serverKey.startsWith("SB-"),
        likelyMidtrans401: !config.isProduction !== !config.serverKey.startsWith("SB-"),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
