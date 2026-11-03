/** Runtime server only: identical room limits for every account. */
import { limitsFor, type JumpaTier } from "./tiers";
import { JUMPA_TRIAL } from "./trial-policy";
export function parseParticipantLimit(raw: string | undefined): number {
  if (!raw?.trim()) return JUMPA_TRIAL.maxParticipants;
  if (!/^\d+$/.test(raw) || Number(raw) < 2 || Number(raw) > 500) {
    throw new Error("Batas peserta harus bilangan bulat 2–500.");
  }
  return Number(raw);
}
export function jumpaRoomLimits(tier: JumpaTier = "FREE") {
  const plan = limitsFor(tier, "GURU");
  return { maxParticipants: Math.min(plan.maxParticipants, parseParticipantLimit(process.env.JUMPA_MAX_PARTICIPANTS)), maxDurationMin: plan.maxDurationMin };
}
