import { db } from "@/lib/db";
import { requiresStudentVerification } from "@/lib/auth/student-provisioning";

export const STUDENT_CONSENT_REQUIRED = {
  code: "STUDENT_CONSENT_REQUIRED",
  error: "Persetujuan orang tua atau wali yang berlaku diperlukan untuk menggunakan akun murid ini.",
} as const;

export async function hasStudentConsentAccess(role: string, authId: string): Promise<boolean> {
  if (!requiresStudentVerification(role)) return true;
  const consent = await db.studentGuardianConsent.findUnique({
    where: { studentAuthId: authId },
    select: { status: true, verifiedUntil: true },
  });
  // Existing unlinked accounts are handled by the staged enrollment process.
  return !consent || (consent.status === "GRANTED" && consent.verifiedUntil.getTime() > Date.now());
}
