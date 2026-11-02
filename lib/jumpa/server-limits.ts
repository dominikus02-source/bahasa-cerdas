/** Runtime server only: identical room limits for every account. */
import { JUMPA_TRIAL } from "./trial-policy";
export function parseParticipantLimit(raw: string | undefined): number {
  if (!raw?.trim()) return JUMPA_TRIAL.maxParticipants;
  if (!/^\d+$/.test(raw) || Number(raw) < 2 || Number(raw) > 500) {
    throw new Error("Batas peserta harus bilangan bulat 2–500.");
  }
  return Number(raw);
}
export function jumpaRoomLimits() {
  return { maxParticipants: parseParticipantLimit(process.env.JUMPA_MAX_PARTICIPANTS), maxDurationMin: JUMPA_TRIAL.maxDurationMin };
}
