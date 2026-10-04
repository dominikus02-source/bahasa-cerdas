import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getIdentityUser, createClient } from "@/lib/supabase/server";
import { ageBandFor, NOTICE_VERSION, TERMS_VERSION, CHILD_NOTICE_VERSION, GUARDIAN_NOTICE_VERSION, CONSENT_BUNDLE_VERSION } from "@/lib/compliance/policy";
import { privacyFor, recordConsent } from "@/lib/compliance/service";
import { sameOrigin, jsonBody, privacyFailure } from "@/lib/compliance/http";
import { rateLimitRoute } from "@/lib/rate-limit";
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const schema = z.discriminatedUnion("action", [
 z.object({ action: z.literal("request"), guardianEmail: z.string().email().max(254) }),
 z.object({ action: z.literal("agree"), token: z.string().regex(/^[a-f0-9]{64}$/), attestation: z.literal(true), aiAssistance: z.boolean().default(false) }),
 z.object({ action: z.literal("withdraw"), childId: z.string().max(100) })
]);
export async function POST(req: Request) {
 try {
  sameOrigin(req);
  const rl = await rateLimitRoute(req, { maxRequests: 10, windowSeconds: 3600, identifier: "guardian-consent" });
  if (rl) return rl;
  const u = await getIdentityUser();
  if (!u) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
  const b = schema.parse(await jsonBody(req));
  const p = await privacyFor(u.id);
  if (b.action === "request") {
   if (!p?.birthDate || ageBandFor(p.birthDate) === "ADULT" || b.guardianEmail.toLowerCase() === u.email.toLowerCase()) return NextResponse.json({ error: "Gunakan email orang tua/wali yang berbeda." }, { status: 400 });
   const token = randomBytes(32).toString("hex");
   const request = await db.$transaction(async tx => {
    await tx.guardianRequest.updateMany({ where: { childId: u.id, status: { in: ["PENDING", "AWAITING_REVIEW"] } }, data: { status: "SUPERSEDED" } });
    await tx.privacyAccount.update({ where: { userId: u.id }, data: { guardianStatus: "PENDING", publicProfile: false, publicWorks: false, analytics: false, aiAssistance: false } });
    return tx.guardianRequest.create({ data: { childId: u.id, guardianEmail: b.guardianEmail.toLowerCase(), tokenHash: hash(token), expiresAt: new Date(Date.now()+7*86400000), noticeVersion: NOTICE_VERSION, termsVersion: TERMS_VERSION, childNoticeVersion: CHILD_NOTICE_VERSION, guardianNoticeVersion: GUARDIAN_NOTICE_VERSION, consentBundleVersion: CONSENT_BUNDLE_VERSION } });
   }, { isolationLevel: "Serializable" });
   // Child may deliver the invitation; the link alone cannot grant consent.
   return NextResponse.json({ invitation: `${new URL(req.url).origin}/persetujuan-wali?token=${token}`, requestId: request.id });
  }
  if (b.action === "agree") {
   const auth = await createClient();
   const { data } = await auth.auth.getUser();
   if (!data.user?.email_confirmed_at || data.user.id !== u.supabaseId || !p?.birthDate || ageBandFor(p.birthDate) !== "ADULT" || p.noticeVersion !== NOTICE_VERSION) return NextResponse.json({ error: "Wali harus masuk dengan email terverifikasi dan melengkapi data usia dewasa." }, { status: 403 });
   await db.$transaction(async tx => {
    const r = await tx.guardianRequest.findUnique({ where: { tokenHash: hash(b.token) } });
    if (!r || r.status !== "PENDING" || r.expiresAt < new Date() || r.guardianEmail !== u.email.toLowerCase() || r.childId === u.id || r.noticeVersion !== NOTICE_VERSION || r.termsVersion !== TERMS_VERSION || r.childNoticeVersion !== CHILD_NOTICE_VERSION || r.guardianNoticeVersion !== GUARDIAN_NOTICE_VERSION || r.consentBundleVersion !== CONSENT_BUNDLE_VERSION) throw new Error("ORIGIN");
    const changed = await tx.guardianRequest.updateMany({ where: { id: r.id, status: "PENDING" }, data: { guardianId: u.id, status: "AWAITING_REVIEW", agreedAt: new Date() } });
    if (changed.count !== 1) throw new Error("ORIGIN");
    await tx.privacyAccount.update({ where: { userId: r.childId }, data: { guardianStatus: "AWAITING_REVIEW", aiAssistance: b.aiAssistance } });
    await recordConsent(tx, r.childId, u.id, "child_service", "GRANTED_PENDING_VERIFICATION", "VERIFIED_EMAIL_AND_GUARDIAN_ATTESTATION", r.id);
    await recordConsent(tx, r.childId, u.id, "aiAssistance", b.aiAssistance ? "GRANTED" : "WITHDRAWN", "GUARDIAN", r.id);
   }, { isolationLevel: "Serializable" });
   return NextResponse.json({ ok: true, message: "Persetujuan tercatat. Pengelola akan memverifikasi hubungan wali sebelum akses diaktifkan." });
  }
  await db.$transaction(async tx => {
   const r = await tx.guardianRequest.findFirst({ where: { childId: b.childId, guardianId: u.id, status: { in: ["VERIFIED", "AWAITING_REVIEW"] } } });
   if (!r && b.childId !== u.id) throw new Error("ORIGIN");
   await tx.guardianRequest.updateMany({ where: { childId: b.childId, status: { in: ["VERIFIED", "AWAITING_REVIEW", "PENDING"] } }, data: { status: "WITHDRAWN" } });
   await tx.privacyAccount.update({ where: { userId: b.childId }, data: { guardianStatus: "WITHDRAWN", publicProfile: false, publicWorks: false, analytics: false, aiAssistance: false } });
   const classes=await tx.group.findMany({where:{members:{some:{userId:b.childId}}},select:{id:true}});
   await tx.classroomPrivacyApproval.deleteMany({where:{classId:{in:classes.map(c=>c.id)}}});
   await recordConsent(tx, b.childId, u.id, "child_service", "WITHDRAWN", "AUTHENTICATED_WITHDRAWAL");
  }, { isolationLevel: "Serializable" });
  return NextResponse.json({ ok: true });
 } catch(e) { return privacyFailure(e); }
}
export async function GET(req: Request) {
 try {
  const u = await getIdentityUser(); if (!u) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
  const token = new URL(req.url).searchParams.get("token");
  if (token) {
    const auth=await createClient();const {data}=await auth.auth.getUser();const p=await privacyFor(u.id);
    if(!data.user?.email_confirmed_at||data.user.id!==u.supabaseId||!p?.birthDate||ageBandFor(p.birthDate)!=="ADULT"||p.noticeVersion!==NOTICE_VERSION)return NextResponse.json({error:"Wali perlu memverifikasi email dan melengkapi usia dewasa."},{status:403});
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("ORIGIN");
    const r = await db.guardianRequest.findUnique({ where: { tokenHash: hash(token) } });
    if (!r || r.guardianEmail !== u.email.toLowerCase() || r.expiresAt < new Date() || r.status !== "PENDING") throw new Error("ORIGIN");
    const child = await db.user.findUniqueOrThrow({ where: { id: r.childId }, select: { fullName: true, nickname: true, privacy: { select: { birthDate: true } } } });
    const derivedBand = child.privacy?.birthDate ? ageBandFor(child.privacy.birthDate) : "UNKNOWN";
    return NextResponse.json({ childName: child.nickname || child.fullName, ageBand: derivedBand }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const requests = await db.guardianRequest.findMany({ where: { OR: [{ childId: u.id }, { guardianId: u.id }] }, select: { id: true, childId: true, status: true, createdAt: true, expiresAt: true }, orderBy: { createdAt: "desc" }, take: 30 });
  return NextResponse.json({ requests }, { headers: { "Cache-Control": "private, no-store" } });
 } catch(e) { return privacyFailure(e); }
}
