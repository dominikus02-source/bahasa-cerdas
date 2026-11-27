import { robloxAgeGate, type RobloxAgeGate } from "@/lib/roblox/config";

/**
 * Konfirmasi lama tetap sah bila batas yang dikonfirmasi tidak lebih rendah
 * dari batas yang sedang berlaku. Menaikkan batas meminta konfirmasi baru.
 */
export function ageGateSatisfied(
  confirmedMinAge: number | null | undefined,
  gate: RobloxAgeGate = robloxAgeGate(),
): boolean {
  if (!gate.enabled || gate.minAge <= 0) return true;
  return typeof confirmedMinAge === "number" && confirmedMinAge >= gate.minAge;
}
