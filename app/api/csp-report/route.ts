/**
 * POST /api/csp-report — receiver for Content-Security-Policy violation reports
 * (browsers POST here via the CSP `report-uri` directive). Logs the violation so
 * blocked resources surface in Sentry/logs instead of silently failing. Always
 * returns 204; never throws.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    // Browsers send { "csp-report": { "blocked-uri", "violated-directive", ... } }
    const report = body?.["csp-report"] ?? body;
    if (report) {
      const blocked = report["blocked-uri"] || report.blockedURL || "unknown";
      const directive = report["violated-directive"] || report.effectiveDirective || "unknown";
      const docUri = report["document-uri"] || report.documentURL || "unknown";
      console.warn(`[CSP] blocked ${blocked} (${directive}) on ${docUri}`);
    }
  } catch {
    /* never let reporting throw */
  }
  return new NextResponse(null, { status: 204 });
}
