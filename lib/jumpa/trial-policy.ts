/** Kebijakan uji coba bersama. Kapasitas adalah batas, bukan hasil load test. */
export const JUMPA_TRIAL = {
  version: 2,
  label: "Uji coba",
  maxParticipants: 30,
  maxDurationMin: 120,
  maxCameraHeight: 720,
  maxScreenHeight: 720,
} as const;

export function isOpenMeeting(metadata: unknown): boolean {
  return Boolean(metadata && typeof metadata === "object" && "policyVersion" in metadata && metadata.policyVersion === JUMPA_TRIAL.version);
}
