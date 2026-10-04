import "server-only";
import { db } from "@/lib/db";
import {
  NOTICE_VERSION,
  TERMS_VERSION,
  PRIVACY_VERSION,
  CHILD_NOTICE_VERSION,
  GUARDIAN_NOTICE_VERSION,
  CONSENT_BUNDLE_VERSION,
  ageBandFor,
  serviceAllowed,
  trustedAgeAssurance,
} from "./policy";
import type { Prisma } from "@prisma/client";

export const childRiskApproved = () => process.env.CHILD_LOW_RISK_APPROVAL === "verified" && !!process.env.CHILD_RISK_EVIDENCE_REF;
export async function privacyFor(userId: string) { return db.privacyAccount.findUnique({ where: { userId } }); }
export async function canUseService(userId: string) { return serviceAllowed(await privacyFor(userId), childRiskApproved()); }

export async function recordConsent(
  tx: Prisma.TransactionClient,
  subjectId: string,
  actorId: string,
  purpose: string,
  action: string,
  method: string,
  evidenceRef?: string
) {
  return tx.consentEvent.create({
    data: {
      subjectId,
      actorId,
      purpose,
      action,
      method,
      evidenceRef,
      noticeVersion: PRIVACY_VERSION,
      termsVersion: TERMS_VERSION,
      childNoticeVersion: CHILD_NOTICE_VERSION,
      guardianNoticeVersion: GUARDIAN_NOTICE_VERSION,
      consentBundleVersion: CONSENT_BUNDLE_VERSION,
    },
  });
}


export function trustedAdultPublicProfileWhere(): Prisma.PrivacyAccountWhereInput {
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 18);
  return {
    birthDate: { lte: cutoff },
    ageAssuranceLevel: { in: ["GUARDIAN_VERIFIED", "SCHOOL_VERIFIED", "AUTH_PROVIDER_VERIFIED", "REVIEWED"] },
    publicProfile: true,
    noticeVersion: NOTICE_VERSION,
  };
}

export async function socialInteractionAllowed(userId: string) {
  const p = await privacyFor(userId);
  return !!p?.birthDate
    && ageBandFor(p.birthDate) === "ADULT"
    && trustedAgeAssurance(p.ageAssuranceLevel)
    && serviceAllowed(p, childRiskApproved());
}

export async function publicIdentityAllowed(userId: string, kind: "publicProfile" | "publicWorks") {
  const p = await privacyFor(userId);
  return !!p?.birthDate && ageBandFor(p.birthDate) === "ADULT" && trustedAgeAssurance(p.ageAssuranceLevel) && p[kind] && serviceAllowed(p, childRiskApproved());
}

export async function canInteractWithWork(actor: { id: string; role: string; isFounder: boolean }, ownerId: string) {
  if (actor.id === ownerId || actor.isFounder || actor.role === "ADMIN") return true;
  if (await socialInteractionAllowed(actor.id)) return true;
  if (actor.role === "GURU") {
    return (await db.group.count({ where: { teacherId: actor.id, isActive: true, members: { some: { userId: ownerId } } } })) > 0;
  }
  return false;
}

export async function canReadWork(ownerId: string, viewer: { id: string; role: string; isFounder: boolean } | null) {
  if (viewer?.id === ownerId || viewer?.isFounder || viewer?.role === "ADMIN") return true;
  if (await publicIdentityAllowed(ownerId, "publicWorks")) return true;
  if (!viewer) return false;
  const groups = await db.group.findMany({ where: { teacherId: viewer.id, isActive: true, members: { some: { userId: ownerId } } }, select: { id: true }, take: 1 });
  return groups.length > 0;
}

export async function aiAllowed(userId: string) {
  const p = await privacyFor(userId);
  if (!p?.birthDate || !p.aiAssistance || !serviceAllowed(p, childRiskApproved())) return false;
  const band = ageBandFor(p.birthDate);
  const ageOk = band === "ADULT" ? trustedAgeAssurance(p.ageAssuranceLevel) : p.ageAssuranceLevel === "GUARDIAN_VERIFIED";
  return ageOk && !!process.env.AI_TRANSFER_REVIEW_REF && !!process.env.AI_APPROVED_PROVIDERS;
}

const adultCutoff = (() => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()));
})();

export const publicWorksWhere: Prisma.StudentKaryaWhereInput = {
  user: {
    privacy: {
      is: {
        birthDate: { lte: adultCutoff },
        ageAssuranceLevel: { in: ["GUARDIAN_VERIFIED", "SCHOOL_VERIFIED", "AUTH_PROVIDER_VERIFIED", "REVIEWED"] },
        publicWorks: true,
        noticeVersion: NOTICE_VERSION,
      },
    },
  },
};

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
