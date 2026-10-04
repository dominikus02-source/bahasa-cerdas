export const NOTICE_VERSION = "2026-10-03.1";
export const TERMS_VERSION = "2026-10-03.1";
export type AgeBand = "UNKNOWN" | "UNDER_3" | "3_5" | "6_9" | "10_12" | "13_15" | "16_17" | "ADULT";
export function ageBandFor(birth: Date, now = new Date()): AgeBand {
  if (!Number.isFinite(birth.getTime()) || birth > now) throw new Error("Tanggal lahir tidak valid");
  const calendarNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  let age = calendarNow.getUTCFullYear() - birth.getUTCFullYear();
  if (calendarNow.getUTCMonth() < birth.getUTCMonth() || (calendarNow.getUTCMonth() === birth.getUTCMonth() && calendarNow.getUTCDate() < birth.getUTCDate())) age--;
  if (age > 120) throw new Error("Tanggal lahir tidak valid");
  return age < 3 ? "UNDER_3" : age < 6 ? "3_5" : age < 10 ? "6_9" : age < 13 ? "10_12" : age < 16 ? "13_15" : age < 18 ? "16_17" : "ADULT";
}
export function serviceAllowed(p: { ageBand: string; birthDate: Date | null; guardianStatus: string; guardianConsentVersion?: string | null; ageMethod?: string; noticeVersion: string | null } | null, childRiskApproved: boolean, now = new Date()) {
  if (!p?.birthDate || p.noticeVersion !== NOTICE_VERSION) return false;
  const band = ageBandFor(p.birthDate, now);
  return band === "ADULT" || (!["UNDER_3", "3_5"].includes(band) && childRiskApproved && p.guardianStatus === "VERIFIED" && p.guardianConsentVersion === NOTICE_VERSION && p.ageMethod === "GUARDIAN_ATTESTED_REVIEWED");
}
export function safeSettings(isChild: boolean, input: { publicProfile: boolean; publicWorks: boolean; analytics: boolean; aiAssistance: boolean }) {
  return isChild ? { publicProfile: false, publicWorks: false, analytics: false, aiAssistance: input.aiAssistance } : {publicProfile:input.publicProfile,publicWorks:input.publicWorks,analytics:input.analytics,aiAssistance:input.aiAssistance};
}

/** Child consent for learning does not authorize public social discovery or independent spending. */
export function childPurposeRestricted(band:AgeBand,path:string){
 return band!=="ADULT" && (path.startsWith("/api/komunitas") || ["/api/billing/checkout","/api/payment/create-invoice","/api/marketplace/purchase","/api/guru/withdraw","/api/teacher/commissions/withdraw"].some(p=>path===p||path.startsWith(`${p}/`)));
}
