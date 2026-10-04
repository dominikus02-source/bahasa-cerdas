import { NextResponse } from "next/server";
import { z } from "zod";
import { getIdentityUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { ageBandFor, NOTICE_VERSION, PRIVACY_VERSION, TERMS_VERSION, CHILD_NOTICE_VERSION, GUARDIAN_NOTICE_VERSION, CONSENT_BUNDLE_VERSION, safeSettings } from "@/lib/compliance/policy";
import { privacyFor, recordConsent, childRiskApproved } from "@/lib/compliance/service";
import { jsonBody, sameOrigin, privacyFailure } from "@/lib/compliance/http";
import cache from "@/lib/redis";
const schema = z.object({ birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), acceptedNotice: z.literal(true), publicProfile: z.boolean().default(false), publicWorks: z.boolean().default(false), analytics: z.boolean().default(false), aiAssistance: z.boolean().default(false) }).strict();
export async function GET() {
  try {
    const u = await getIdentityUser();
    if (!u) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
    const p = await privacyFor(u.id);
    const events = await db.consentEvent.findMany({ where: { subjectId: u.id }, orderBy: { createdAt: "desc" }, take: 30, select: { purpose: true, action: true, noticeVersion: true, createdAt: true } });
    const privacy = p ? { ...p, ageBand: p.birthDate ? ageBandFor(p.birthDate) : p.ageBand } : null;
    return NextResponse.json({ privacy, events, noticeVersion: NOTICE_VERSION, consentBundleVersion: CONSENT_BUNDLE_VERSION, childRiskApproved: childRiskApproved() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch(e) { return privacyFailure(e); }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await getIdentityUser();
    if (!u) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
    const input = schema.parse(await jsonBody(req));
    await db.$transaction(async tx => {
      const old = await tx.privacyAccount.findUnique({ where: { userId: u.id } });
      const birth = old?.birthDate || (input.birthDate ? new Date(`${input.birthDate}T00:00:00Z`) : null);
      if (!birth || (input.birthDate && birth.toISOString().slice(0,10) !== input.birthDate)) throw new Error("ORIGIN");
      const band = ageBandFor(birth);
      const settings = safeSettings(band !== "ADULT", { ...input, aiAssistance: band === "ADULT" ? input.aiAssistance : (old?.aiAssistance ?? false) });
      await tx.privacyAccount.upsert({ where: { userId: u.id }, create: { userId: u.id, birthDate: birth, ageBand: band, ageMethod: "SELF_DECLARED", ageAssuranceLevel: "SELF_DECLARED", ageChangeLocked: true, noticeVersion: NOTICE_VERSION, consentBundleVersion: band === "ADULT" ? null : old?.consentBundleVersion ?? null, privacyVersion: PRIVACY_VERSION, termsVersion: TERMS_VERSION, childNoticeVersion: CHILD_NOTICE_VERSION, guardianNoticeVersion: GUARDIAN_NOTICE_VERSION, ...settings }, update: { ageBand: band, noticeVersion: NOTICE_VERSION, privacyVersion: PRIVACY_VERSION, termsVersion: TERMS_VERSION, childNoticeVersion: CHILD_NOTICE_VERSION, guardianNoticeVersion: GUARDIAN_NOTICE_VERSION, ageChangeLocked: true, ...settings } });
      await recordConsent(tx, u.id, u.id, "service_notice", "ACKNOWLEDGED", "AUTHENTICATED_DECLARATION");
      for (const purpose of ["publicProfile", "publicWorks", "analytics", "aiAssistance"] as const) {
        if (!old || old[purpose] !== settings[purpose]) await recordConsent(tx, u.id, u.id, purpose, settings[purpose] ? "GRANTED" : "WITHDRAWN", "AUTHENTICATED_SETTINGS");
      }
    }, { isolationLevel: "Serializable" });
    await Promise.all([cache.delPattern("feed:*"), cache.delPattern("profile:public:*"), cache.delPattern("profile:public:v2:*"), cache.delPattern("karya:*")]);
    return NextResponse.json({ ok: true });
  } catch(e) { return privacyFailure(e); }
}
