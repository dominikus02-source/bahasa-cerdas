import type { Metadata } from "next";
import { requireUmumPage } from "@/lib/auth/umum-page";
import { getUmumPlans } from "@/lib/billing/plans";
import { umumTrialView } from "@/lib/umum/trial";
import { UmumShell } from "@/components/umum/UmumShell";
import UmumPremiumClient from "@/components/umum/UmumPremiumClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Premium Umum — BahasaCerdas", robots: { index: false, follow: false } };

/**
 * /umum/premium — Premium Umum: uji coba gratis 1 bulan (ditawarkan, tidak
 * otomatis) dan paket sekali bayar Midtrans Snap. Tanpa perpanjangan
 * otomatis; tidak pernah ada tagihan otomatis.
 */
export default async function UmumPremiumPage() {
  const user = await requireUmumPage("/umum/premium");
  const view = umumTrialView(user);
  const plans = getUmumPlans().map((p) => ({ planId: p.planId, label: p.label, price: p.price, durationDays: p.durationDays }));
  return (
    <UmumShell user={user}>
      <UmumPremiumClient view={view} plans={plans} />
    </UmumShell>
  );
}
