/**
 * P7D — TeacherPayoutProfile service (spec §5/§6).
 *
 * Destinasi payout adalah data finansial sensitif:
 * - Hanya guru pemilik yang melihat/mengelola (masked di response umum)
 * - Admin hanya via authorized admin routes
 * - teacherId SELALU dari sesi — tidak pernah dari klien
 * - Perubahan destinasi DI-AUDIT (AdminPaymentAuditLog)
 * - Tidak menyimpan credentials/provider secrets (env-only)
 */

import { db } from "@/lib/db";
import { auditCommission } from "../audit";
import { validateDestinationFormat } from "./mock-provider";
import type {
  MaskedPayoutProfile,
  PayoutDestination,
  PayoutProfileInput,
  ProfileSaveResult,
} from "./types";

/** Mask nomor rekening: tampilkan maksimal 4 digit terakhir. */
export function maskAccount(account: string): string {
  const digits = account.replace(/[-\s]/g, "");
  if (digits.length <= 4) return `•••• ${digits}`;
  return `•••• ${digits.slice(-4)}`;
}

/** Ambil profil payout guru (RAW — internal only, jangan kirim ke klien). */
export async function getPayoutProfileRaw(teacherId: string): Promise<PayoutDestination | null> {
  const profile = await db.teacherPayoutProfile.findUnique({
    where: { teacherId },
    select: {
      recipientName: true,
      destinationType: true,
      bankName: true,
      accountNumber: true,
    },
  });
  if (!profile) return null;
  return {
    recipientName: profile.recipientName,
    destinationType: profile.destinationType,
    bankName: profile.bankName,
    accountNumber: profile.accountNumber,
  };
}

/** Profil payout versi masked untuk response guru. */
export async function getMaskedPayoutProfile(teacherId: string): Promise<MaskedPayoutProfile | null> {
  const profile = await db.teacherPayoutProfile.findUnique({
    where: { teacherId },
    select: {
      recipientName: true,
      destinationType: true,
      bankName: true,
      accountNumber: true,
      verificationStatus: true,
      verifiedAt: true,
      updatedAt: true,
    },
  });
  if (!profile) return null;
  return {
    recipientName: profile.recipientName,
    destinationType: profile.destinationType,
    bankName: profile.bankName,
    maskedAccount: maskAccount(profile.accountNumber),
    verificationStatus: profile.verificationStatus,
    verifiedAt: profile.verifiedAt,
    updatedAt: profile.updatedAt,
  };
}

/**
 * Simpan/update profil payout guru. Validasi format server-side (spec §7).
 * Perubahan DI-AUDIT. Guru yang sedang punya withdrawal berjalan tetap aman:
 * payout memakai snapshot destinasi dari withdrawal, bukan profil live (§23).
 */
export async function savePayoutProfile(
  teacherId: string,
  input: PayoutProfileInput,
): Promise<ProfileSaveResult> {
  const dest: PayoutDestination = {
    recipientName: String(input.recipientName ?? "").trim(),
    destinationType: input.destinationType,
    bankName: String(input.bankName ?? "").trim(),
    accountNumber: String(input.accountNumber ?? "").trim().replace(/[-\s]/g, ""),
  };

  const validation = validateDestinationFormat(dest);
  if (!validation.ok) {
    switch (validation.code) {
      case "INVALID_ACCOUNT":
        return { ok: false, error: "INVALID_ACCOUNT" };
      case "INVALID_NAME":
        return { ok: false, error: "INVALID_NAME" };
      default:
        return { ok: false, error: "INVALID_BANK" };
    }
  }

  const previous = await db.teacherPayoutProfile.findUnique({
    where: { teacherId },
    select: {
      id: true,
      bankName: true,
      accountNumber: true,
      destinationType: true,
      recipientName: true,
    },
  });

  const profile = await db.teacherPayoutProfile.upsert({
    where: { teacherId },
    create: {
      teacherId,
      recipientName: dest.recipientName,
      destinationType: dest.destinationType,
      bankName: dest.bankName,
      accountNumber: dest.accountNumber,
      verificationStatus: "UNVERIFIED",
    },
    update: {
      recipientName: dest.recipientName,
      destinationType: dest.destinationType,
      bankName: dest.bankName,
      accountNumber: dest.accountNumber,
      verificationStatus: "UNVERIFIED",
      verifiedAt: null,
    },
    select: { id: true },
  });

  // Audit perubahan destinasi — rekening penuh TIDAK masuk audit (masked).
  await auditCommission({
    actorUserId: teacherId,
    action: previous ? "PAYOUT_PROFILE_UPDATED" : "PAYOUT_PROFILE_CREATED",
    targetUserId: teacherId,
    previousValue: previous
      ? { bankName: previous.bankName, destinationType: previous.destinationType, account: maskAccount(previous.accountNumber) }
      : null,
    newValue: {
      bankName: dest.bankName,
      destinationType: dest.destinationType,
      account: maskAccount(dest.accountNumber),
    },
    reason: "Guru memperbarui destinasi payout",
    metadata: { profileId: profile.id },
  });

  return { ok: true, profileId: profile.id, maskedAccount: maskAccount(dest.accountNumber) };
}
