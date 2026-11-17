export const STUDENT_VERIFICATION_REQUIRED = {
  code: "STUDENT_VERIFICATION_REQUIRED",
  error: "Verifikasi usia dan persetujuan orang tua atau wali diperlukan sebelum membuat akun murid.",
} as const;

export function requiresStudentVerification(role: string): boolean {
  return role === "MURID" && process.env.BC_REQUIRE_STUDENT_VERIFICATION === "1";
}

/**
 * Reads a fresh, server-managed Supabase app_metadata decision. Callers must
 * never substitute user_metadata, browser input, or a cached JWT claim.
 * This is an admission check. Verification and evidence issuance happen upstream.
 */
export function isStudentProvisioningAllowed(
  role: string,
  decision?: unknown,
  now = Date.now(),
): boolean {
  if (!requiresStudentVerification(role)) return true;
  if (!decision || typeof decision !== "object") return false;
  const evidence = decision as Record<string, unknown>;
  return evidence.version === 1 &&
    evidence.ageVerified === true &&
    evidence.guardianConsent === "granted" &&
    typeof evidence.validUntil === "number" &&
    Number.isSafeInteger(evidence.validUntil) &&
    evidence.validUntil > now;
}
