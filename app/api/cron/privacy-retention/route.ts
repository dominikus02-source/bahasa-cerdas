import { NextRequest, NextResponse } from "next/server";
import { runPrivacyRetentionSweep } from "@/lib/compliance/retention";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Retention scheduler is not configured." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reviewRef = process.env.PRIVACY_RETENTION_REVIEW_REF;
  if (!reviewRef) {
    return NextResponse.json({ error: "Retention review evidence is not configured." }, { status: 503 });
  }

  try {
    const result = await runPrivacyRetentionSweep({ execute: true, reviewRef });
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: "Retention sweep failed." }, { status: 500 });
  }
}
