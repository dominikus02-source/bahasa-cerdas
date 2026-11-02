import { NextResponse } from "next/server";
import { resolvePlan } from "@/lib/premium-economy/plans";
import { hasUmumPremium, umumPremiumRequired } from "@/lib/umum/premium";
import type { IdentitySource } from "@/lib/account/identity";

/**
 * AKU SASTRAWAN access policy (single source of truth for pages + API routes).
 *
 * WRITE (create/edit projects & chapters, curriculum progress, Pendamping Menulis AI):
 *   - UMUM        → Premium Umum (paid or Umum trial) via hasUmumPremium().
 *   - GURU/MURID  → canonical plan from resolvePlan(): PRO (guru premium),
 *                   MURID_PREMIUM (murid premium). FOUNDER/ADMIN always.
 *
 * READ (list/open/export the user's OWN drafts): any signed-in owner.
 *   Founder decision: drafts are never held hostage — after premium ends they
 *   stay readable and exportable; only writing is locked until renewal.
 */
export type AkuSastrawanUser = IdentitySource & { id: string; role?: string | null };

/** Plans (from resolvePlan) that unlock writing for non-UMUM roles. */
export const AKU_SASTRAWAN_WRITE_PLANS: ReadonlySet<string> = new Set(["FOUNDER", "PRO", "MURID_PREMIUM"]);

/** Pure decision helper (unit-tested in scripts/test-aku-sastrawan-access.ts). */
export function akuSastrawanWriteAllowed(input: { role?: string | null; plan: string; umumPremium: boolean }): boolean {
  if (input.role?.toUpperCase() === "UMUM") return input.umumPremium;
  return AKU_SASTRAWAN_WRITE_PLANS.has(input.plan);
}

export async function canWriteAkuSastrawan(user: AkuSastrawanUser): Promise<boolean> {
  // UMUM is decided by hasUmumPremium alone (it also returns true for staff).
  if (user.role?.toUpperCase() === "UMUM") return akuSastrawanWriteAllowed({ role: user.role, plan: "", umumPremium: hasUmumPremium(user) });
  const { plan } = await resolvePlan(user.id);
  return akuSastrawanWriteAllowed({ role: user.role, plan, umumPremium: false });
}

/** Back-compat name used by pages/cards. Means "may write". */
export const hasAkuSastrawanAccess = canWriteAkuSastrawan;

export function akuSastrawanUpgradeUrl(role?: string | null): string {
  switch (role?.toUpperCase()) {
    case "UMUM": return "/umum/premium";
    case "GURU": return "/guru/berlangganan";
    default: return "/murid/premium";
  }
}

export const AKU_SASTRAWAN_DEFAULT_LOCK_MESSAGE =
  "Masa Premium-mu sudah berakhir atau belum aktif. Karyamu tetap aman: kamu masih bisa membuka, membaca, dan mengunduhnya. Aktifkan Premium untuk membuat, mengubah, melanjutkan tulisan, menghapus karya, dan memakai Pendamping Menulis AI.";

export function akuSastrawanPremiumRequired(role?: string | null, message = AKU_SASTRAWAN_DEFAULT_LOCK_MESSAGE) {
  // UMUM gets the standard Premium Umum 403 (same shape as every other Umum feature).
  if (role?.toUpperCase() === "UMUM") return umumPremiumRequired(message);
  return NextResponse.json(
    { ok: false, error: message, message, code: "AKU_SASTRAWAN_PREMIUM_REQUIRED", upgradeUrl: akuSastrawanUpgradeUrl(role) },
    { status: 403 }
  );
}

/**
 * Hapus = tindakan permanen. Selain digerbang premium (tidak bisa saat
 * kedaluwarsa), server mewajibkan konfirmasi eksplisit di body:
 * { "konfirmasi": "HAPUS" } (dari dialog konfirmasi di UI).
 */
export const AKU_SASTRAWAN_DELETE_CONFIRMATION = "HAPUS";

export function akuSastrawanDeleteConfirmed(body: unknown): boolean {
  return typeof body === "object" && body !== null && (body as { konfirmasi?: unknown }).konfirmasi === AKU_SASTRAWAN_DELETE_CONFIRMATION;
}

export function akuSastrawanDeleteConfirmationRequired(target: "karya" | "bab") {
  const message = `Penghapusan ${target} memerlukan konfirmasi. Ketik ${AKU_SASTRAWAN_DELETE_CONFIRMATION} pada dialog konfirmasi untuk melanjutkan.`;
  return NextResponse.json({ ok: false, error: message, message, code: "AKU_SASTRAWAN_KONFIRMASI_HAPUS" }, { status: 400 });
}
