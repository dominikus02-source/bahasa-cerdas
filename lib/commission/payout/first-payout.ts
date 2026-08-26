/**
 * P8E §8 — First Payout Safety.
 *
 * Payout PERTAMA seorang guru mendapat perlindungan ekstra. Bila salah satu
 * kondisi gagal: BLOCK (tidak pernah downgrade diam-diam ke payout normal).
 *
 * Kondisi:
 * - profil payout VERIFIED
 * - tidak ada risk case aktif
 * - destinasi tidak baru saja diubah (cooldown)
 * - tidak ada withdrawal/payout sebelumnya (definisi "pertama")
 */

import { db } from "@/lib/db";
import { getTeacherRiskState } from "@/lib/guru/risk/signals";
import { isDestinationCooldownActive } from "@/lib/guru/risk/rules";

export interface FirstPayoutGateInput {
  teacherId: string;
  profileVerificationStatus?: string | null;
  profileUpdatedAt?: Date | null;
  riskState?: string | null;
  cooldownActive?: boolean;
  previousPayoutCount?: number | null;
}

export type FirstPayoutGateResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Evaluasi gate payout pertama (PURE terhadap input; caller boleh
 * meng-override hasil precomputed untuk menghindari query dobel).
 */
export function evaluateFirstPayoutGate(input: FirstPayoutGateInput): FirstPayoutGateResult {
  if (input.previousPayoutCount !== null && input.previousPayoutCount !== undefined && input.previousPayoutCount > 0) {
    // Bukan payout pertama — perlindungan ekstra tidak berlaku.
    return { allowed: true };
  }

  if (input.profileVerificationStatus !== "VERIFIED") {
    return {
      allowed: false,
      reason: "Pencairan pertama memerlukan rekening yang sudah diverifikasi. Tim kami akan memverifikasinya.",
    };
  }
  if (input.riskState && input.riskState !== "NORMAL") {
    return { allowed: false, reason: "Akun sedang dalam pemeriksaan keamanan. Pencairan pertama ditahan sementara." };
  }
  if (input.cooldownActive) {
    return { allowed: false, reason: "Rekening baru saja diubah. Tunggu masa verifikasi singkat sebelum pencairan pertama." };
  }
  return { allowed: true };
}

/** Resolve input gate dari DB (bounded) lalu evaluasi. */
export async function evaluateFirstPayoutGateForTeacher(
  teacherId: string,
): Promise<FirstPayoutGateResult> {
  const [profile, riskState, previousPayoutCount] = await Promise.all([
    db.teacherPayoutProfile.findUnique({
      where: { teacherId },
      select: { verificationStatus: true, updatedAt: true },
    }),
    getTeacherRiskState(teacherId),
    db.teacherPayout.count({ where: { teacherId }, take: 1 }),
  ]);

  return evaluateFirstPayoutGate({
    teacherId,
    profileVerificationStatus: profile?.verificationStatus ?? null,
    profileUpdatedAt: profile?.updatedAt ?? null,
    riskState,
    cooldownActive: profile
      ? isDestinationCooldownActive({ profileUpdatedAt: profile.updatedAt })
      : false,
    previousPayoutCount,
  });
}
