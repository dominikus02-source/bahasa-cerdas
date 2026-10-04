import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getIdentityUser } from "@/lib/supabase/server";
import { sameOrigin, jsonBody, privacyFailure } from "@/lib/compliance/http";
import { recordConsent } from "@/lib/compliance/service";
import { NOTICE_VERSION, TERMS_VERSION, CHILD_NOTICE_VERSION, GUARDIAN_NOTICE_VERSION, CONSENT_BUNDLE_VERSION, ageBandFor } from "@/lib/compliance/policy";
const schema = z.discriminatedUnion("action", [
 z.object({ action: z.literal("guardian"), id: z.string(), approve: z.boolean(), evidenceRef: z.string().trim().min(10).max(300) }),
 z.object({ action: z.literal("age"), userId: z.string(), approve: z.boolean(), evidenceRef: z.string().trim().min(10).max(300) }),
 z.object({ action: z.literal("classroom"), classId: z.string().min(1).max(128), evidenceRef: z.string().trim().min(10).max(300), approve: z.boolean(), expiresAt: z.string().datetime() }),
 z.object({ action: z.literal("moderate"), id: z.string(), decision: z.enum(["REMOVE", "DISMISS", "ESCALATE"]), reason: z.string().trim().min(10).max(1000) })
]);
async function admin() { const u = await getIdentityUser(); return u && (u.role === "ADMIN" || u.isFounder) ? u : null; }
export async function GET() {
 try {
  const u = await admin(); if (!u) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const [reports, guardians, ageReviews, deletions, audits] = await Promise.all([
   Promise.all([
    db.safetyReport.findMany({where:{status:{in:["OPEN","ESCALATED"]},category:"CHILD_SAFETY"},orderBy:{createdAt:"asc"},take:100}),
    db.safetyReport.findMany({where:{status:{in:["OPEN","ESCALATED"]},category:{not:"CHILD_SAFETY"}},orderBy:{createdAt:"asc"},take:100})
   ]).then(([urgent,other])=>[...urgent,...other]),
   db.guardianRequest.findMany({ where: { status: "AWAITING_REVIEW" }, select: { id: true, childId: true, guardianId: true, agreedAt: true }, take: 100 }),
   db.privacyAccount.findMany({ where: { ageAssuranceLevel: "SELF_DECLARED", birthDate: { not: null } }, select: { userId: true, birthDate: true, ageAssuranceLevel: true, updatedAt: true }, orderBy: { updatedAt: "asc" }, take: 100 }),
   db.deletionJob.findMany({ where: { status: { not: "COMPLETED" } }, select: { userId: true, status: true, attempts: true, lastErrorCode: true }, take: 100 }),
   db.complianceAudit.findMany({ orderBy: { createdAt: "desc" }, take: 50 })
  ]);
  return NextResponse.json({ reports, guardians, ageReviews: ageReviews.map(a => ({ userId: a.userId, ageBand: a.birthDate ? ageBandFor(a.birthDate) : "UNKNOWN", updatedAt: a.updatedAt })), deletions, audits }, { headers: { "Cache-Control": "private, no-store" } });
 } catch(e) { return privacyFailure(e); }
}
export async function POST(req: Request) {
 try {
  sameOrigin(req); const u = await admin(); if (!u) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const b = schema.parse(await jsonBody(req));
  await db.$transaction(async tx => {
   if (b.action === "guardian") {
    const r = await tx.guardianRequest.findUniqueOrThrow({ where: { id: b.id } });
    const gp = r.guardianId ? await tx.privacyAccount.findUnique({ where: { userId: r.guardianId } }) : null;
    if (r.status !== "AWAITING_REVIEW" || r.expiresAt < new Date() || r.noticeVersion !== NOTICE_VERSION || r.termsVersion !== TERMS_VERSION || r.childNoticeVersion !== CHILD_NOTICE_VERSION || r.guardianNoticeVersion !== GUARDIAN_NOTICE_VERSION || r.consentBundleVersion !== CONSENT_BUNDLE_VERSION || !gp?.birthDate || ageBandFor(gp.birthDate) !== "ADULT" || u.id === r.childId || u.id === r.guardianId) throw new Error("ORIGIN");
    await tx.guardianRequest.update({ where: { id: r.id }, data: { status: b.approve ? "VERIFIED" : "REJECTED", reviewedBy: u.id, reviewedAt: new Date(), verificationRef: b.evidenceRef } });
    await tx.privacyAccount.update({ where: { userId: r.childId }, data: { guardianStatus: b.approve ? "VERIFIED" : "REJECTED", guardianConsentVersion: b.approve ? NOTICE_VERSION : null, consentBundleVersion: b.approve ? CONSENT_BUNDLE_VERSION : null, ageMethod: b.approve ? "GUARDIAN_ATTESTED_REVIEWED" : "SELF_DECLARED", ageAssuranceLevel: b.approve ? "GUARDIAN_VERIFIED" : "SELF_DECLARED", ageVerifiedAt: b.approve ? new Date() : null, ageChangeLocked: true, ...(!b.approve ? { aiAssistance: false } : {}) } });
    if (b.approve && r.guardianId) await tx.privacyAccount.update({ where: { userId: r.guardianId }, data: { ageAssuranceLevel: "REVIEWED", ageVerifiedAt: new Date(), ageChangeLocked: true } });
    await recordConsent(tx, r.childId, u.id, "child_service", b.approve ? "VERIFIED" : "REJECTED", "MANUAL_GUARDIAN_AUTHORITY_REVIEW", b.evidenceRef);
    await tx.complianceAudit.create({ data: { subjectId: r.childId, actorId: u.id, action: b.approve ? "GUARDIAN_VERIFIED" : "GUARDIAN_REJECTED", reference: r.id } });
   } else if (b.action === "age") {
    const p = await tx.privacyAccount.findUniqueOrThrow({ where: { userId: b.userId } });
    if (!p.birthDate || p.ageAssuranceLevel !== "SELF_DECLARED" || u.id === b.userId) throw new Error("ORIGIN");
    const band = ageBandFor(p.birthDate);
    await tx.privacyAccount.update({ where: { userId: b.userId }, data: { ageAssuranceLevel: b.approve ? "REVIEWED" : "NONE", ageVerifiedAt: b.approve ? new Date() : null, ageChangeLocked: true } });
    await tx.complianceAudit.create({ data: { subjectId: b.userId, actorId: u.id, action: b.approve ? `AGE_ASSURANCE_VERIFIED_${band}` : `AGE_ASSURANCE_REJECTED_${band}`, reference: b.evidenceRef } });
   } else if (b.action === "classroom") {
    const group = await tx.group.findUniqueOrThrow({where:{id:b.classId}});
    const expiry=new Date(b.expiresAt);
    if (u.id===group.teacherId || expiry<=new Date() || expiry.getTime()>Date.now()+366*86400000) throw new Error("ORIGIN");
    if(b.approve) await tx.classroomPrivacyApproval.upsert({where:{classId:group.id},create:{classId:group.id,teacherId:group.teacherId,evidenceRef:b.evidenceRef,noticeVersion:NOTICE_VERSION,expiresAt:expiry,reviewedBy:u.id},update:{teacherId:group.teacherId,evidenceRef:b.evidenceRef,noticeVersion:NOTICE_VERSION,expiresAt:expiry,reviewedBy:u.id}});
    else await tx.classroomPrivacyApproval.deleteMany({where:{classId:group.id}});
    await tx.complianceAudit.create({data:{actorId:u.id,action:b.approve?"CLASSROOM_CONSENT_REVIEWED":"CLASSROOM_CONSENT_REVOKED",reference:b.evidenceRef}});
   } else {
    const r = await tx.safetyReport.findUniqueOrThrow({ where: { id: b.id } });
    if (!["OPEN", "ESCALATED"].includes(r.status)) throw new Error("ORIGIN");
    if (b.decision === "REMOVE") {
     // Remove the harmful payload, preserve a minimal evidence reference.
     if (r.targetType === "KARYA") await tx.studentKarya.delete({ where: { id: r.targetId } });
     else if (r.targetType === "COMMENT") await tx.studentKaryaComment.delete({ where: { id: r.targetId } });
     else if (r.targetType === "COMMUNITY_POST") await tx.communityPost.delete({ where: { id: r.targetId } });
     else if (r.targetType === "CHAT") await tx.chatMessage.delete({ where: { id: r.targetId } });
     else throw new Error("ORIGIN");
    }
    await tx.safetyReport.update({ where: { id: r.id }, data: { status: b.decision === "ESCALATE" ? "ESCALATED" : "RESOLVED", decision: b.reason, reviewedBy: u.id, reviewedAt: new Date() } });
    await tx.complianceAudit.create({ data: { actorId: u.id, action: `MODERATION_${b.decision}`, reference: r.id } });
    if (r.reporterId) await tx.notifikasi.create({ data: { userId: r.reporterId, title: "Laporan ditinjau", body: `Laporan ${r.id}: ${b.reason}`, type: "SAFETY_REPORT" } });
   }
  }, { isolationLevel: "Serializable" });
  return NextResponse.json({ ok: true });
 } catch(e) { return privacyFailure(e); }
}
