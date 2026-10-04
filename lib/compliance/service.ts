import "server-only";
import { db } from "@/lib/db";
import { NOTICE_VERSION, TERMS_VERSION, ageBandFor, serviceAllowed } from "./policy";
import type { Prisma } from "@prisma/client";
export const childRiskApproved = () => process.env.CHILD_LOW_RISK_APPROVAL === "verified" && !!process.env.CHILD_RISK_EVIDENCE_REF;
export async function privacyFor(userId: string) { return db.privacyAccount.findUnique({ where: { userId } }); }
export async function canUseService(userId: string) { return serviceAllowed(await privacyFor(userId), childRiskApproved()); }
export async function recordConsent(tx: Prisma.TransactionClient, subjectId: string, actorId: string, purpose: string, action: string, method: string, evidenceRef?: string) {
  return tx.consentEvent.create({ data: { subjectId, actorId, purpose, action, method, evidenceRef, noticeVersion: NOTICE_VERSION, termsVersion: TERMS_VERSION } });
}
export async function publicIdentityAllowed(userId: string, kind: "publicProfile" | "publicWorks") {
  const p = await privacyFor(userId);
  return !!p?.birthDate && ageBandFor(p.birthDate) === "ADULT" && p[kind] && serviceAllowed(p, childRiskApproved());
}
export async function canReadWork(ownerId: string, viewer: { id: string; role: string; isFounder: boolean } | null) {
  if (viewer?.id === ownerId || viewer?.isFounder || viewer?.role === "ADMIN") return true;
  if (await publicIdentityAllowed(ownerId, "publicWorks")) return true;
  if (!viewer) return false;
  const groups = await db.group.findMany({ where: { teacherId: viewer.id, isActive: true, members: { some: { userId: ownerId } } }, select: { id: true }, take: 1 });
  return groups.length > 0;
}
export async function aiAllowed(userId: string) { const p = await privacyFor(userId); return !!process.env.AI_TRANSFER_REVIEW_REF && !!process.env.AI_APPROVED_PROVIDERS && !!p?.aiAssistance && serviceAllowed(p, childRiskApproved()); }
export const publicWorksWhere: Prisma.StudentKaryaWhereInput = { user: { privacy: { is: { ageBand: "ADULT", publicWorks: true, noticeVersion: NOTICE_VERSION } } } };
export function visibleWorksWhere(viewer: { id: string; role: string; isFounder: boolean } | null): Prisma.StudentKaryaWhereInput {
 if (viewer?.isFounder || viewer?.role === "ADMIN") return {};
 if (!viewer) return publicWorksWhere;
 return { OR: [ publicWorksWhere, { userId: viewer.id }, { user: { groupMemberships: { some: { group: { teacherId: viewer.id, isActive: true } } } } } ] };
}

export async function canReadPrivateSubject(ownerId: string, viewer: { id: string; role: string; isFounder: boolean } | null) {
 if (!viewer) return false;
 if (viewer.id === ownerId || viewer.isFounder || viewer.role === "ADMIN") return true;
 return (await db.group.count({where:{teacherId:viewer.id,isActive:true,members:{some:{userId:ownerId}}}})) > 0;
}
