export const NOTICE_VERSION = "2026-10-04.1";
export const PRIVACY_VERSION = "2.0";
export const TERMS_VERSION = "2.0";
export const CHILD_NOTICE_VERSION = "1.0";
export const GUARDIAN_NOTICE_VERSION = "1.0";
export const CONSENT_BUNDLE_VERSION = "CHILD-2026-10-A";

export type PolicyChangeImpact = "INFORM_ONLY" | "RECONSENT_REQUIRED";
export const CURRENT_POLICY_CHANGE_IMPACT: PolicyChangeImpact = "RECONSENT_REQUIRED";

export type AgeBand = "UNKNOWN" | "UNDER_3" | "3_5" | "6_9" | "10_12" | "13_15" | "16_17" | "ADULT";
export type AgeAssuranceLevel = "NONE" | "SELF_DECLARED" | "GUARDIAN_VERIFIED" | "SCHOOL_VERIFIED" | "AUTH_PROVIDER_VERIFIED" | "REVIEWED";

export function ageBandFor(birth: Date, now = new Date()): AgeBand {
  if (!Number.isFinite(birth.getTime()) || birth > now) throw new Error("Tanggal lahir tidak valid");
  const calendarNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  let age = calendarNow.getUTCFullYear() - birth.getUTCFullYear();
  if (calendarNow.getUTCMonth() < birth.getUTCMonth() || (calendarNow.getUTCMonth() === birth.getUTCMonth() && calendarNow.getUTCDate() < birth.getUTCDate())) age--;
  if (age > 120) throw new Error("Tanggal lahir tidak valid");
  return age < 3 ? "UNDER_3" : age < 6 ? "3_5" : age < 10 ? "6_9" : age < 13 ? "10_12" : age < 16 ? "13_15" : age < 18 ? "16_17" : "ADULT";
}

export function trustedAgeAssurance(level?: string | null) {
  return ["GUARDIAN_VERIFIED", "SCHOOL_VERIFIED", "AUTH_PROVIDER_VERIFIED", "REVIEWED"].includes(level || "");
}

export function serviceAllowed(p: {
  birthDate: Date | null;
  guardianStatus: string;
  guardianConsentVersion?: string | null;
  consentBundleVersion?: string | null;
  ageMethod?: string | null;
  ageAssuranceLevel?: string | null;
  noticeVersion: string | null;
} | null, childRiskApproved: boolean, now = new Date()) {
  if (!p?.birthDate || p.noticeVersion !== NOTICE_VERSION) return false;
  const band = ageBandFor(p.birthDate, now);
  // Core learning remains available to a self-declared adult while proportional age assurance is reviewed.\n  // Public/social, AI and transaction features apply a stronger trusted-assurance gate separately.\n  if (band === "ADULT") return !!p.ageAssuranceLevel && p.ageAssuranceLevel !== "NONE";
  return !["UNDER_3", "3_5"].includes(band)
    && childRiskApproved
    && p.guardianStatus === "VERIFIED"
    && p.guardianConsentVersion === NOTICE_VERSION
    && p.consentBundleVersion === CONSENT_BUNDLE_VERSION
    && p.ageMethod === "GUARDIAN_ATTESTED_REVIEWED"
    && p.ageAssuranceLevel === "GUARDIAN_VERIFIED";
}

export function safeSettings(isChild: boolean, input: { publicProfile: boolean; publicWorks: boolean; analytics: boolean; aiAssistance: boolean }) {
  return isChild
    ? { publicProfile: false, publicWorks: false, analytics: false, aiAssistance: input.aiAssistance }
    : { publicProfile: input.publicProfile, publicWorks: input.publicWorks, analytics: input.analytics, aiAssistance: input.aiAssistance };
}

/** Child consent for learning does not authorize public social discovery or independent spending. */
export function sensitivePurposeRestricted(band:AgeBand, assuranceLevel:string|null|undefined, path:string){
 const sensitive = path.startsWith("/api/komunitas") || ["/api/billing/checkout","/api/payment/create-invoice","/api/marketplace/purchase","/api/guru/withdraw","/api/teacher/commissions/withdraw"].some(p=>path===p||path.startsWith(`${p}/`));
 if(!sensitive) return false;
 return band!=="ADULT" || !trustedAgeAssurance(assuranceLevel);
}
