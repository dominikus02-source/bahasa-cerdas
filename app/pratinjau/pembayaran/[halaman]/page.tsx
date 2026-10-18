import { notFound } from "next/navigation";
import BerlanggananPage from "@/app/(dashboard)/guru/berlangganan/page";
import MuridPremiumPage from "@/app/(dashboard)/murid/premium/page";
import CheckoutPage from "@/app/checkout/page";
import OrdersPage from "@/app/orders/page";
import PaymentFinishView from "@/components/billing/PaymentFinishView";
import type { PanelView } from "@/components/billing/PaymentStatusPanel";

export const dynamic = "force-dynamic";

/**
 * Pratinjau halaman transaksi dengan data contoh, untuk tangkapan layar
 * lokal. Hanya aktif bila BC_UI_PREVIEW=1 (tidak pernah di produksi).
 */
export default async function Preview({ params, searchParams }: { params: Promise<{ halaman: string }>; searchParams: Promise<Record<string, string>> }) {
  if (process.env.BC_UI_PREVIEW !== "1") notFound();
  const { halaman } = await params;
  const sp = await searchParams;
  const wrap = (n: React.ReactNode) => <div style={{ minHeight: "100vh", background: "var(--clr-bg)", padding: "24px 16px" }}>{n}</div>;
  switch (halaman) {
    case "guru-berlangganan": return wrap(<BerlanggananPage />);
    case "murid-premium": return wrap(<MuridPremiumPage />);
    case "checkout": return <CheckoutPage />;
    case "pesanan": return <OrdersPage />;
    case "bayar-selesai": {
      const orderId = sp.order_id || "PM-E68Z5G-cmqxh3uo";
      const owner = { amount: 1000, hargaAsli: 49000, kuponKode: "BCGURUCERDAS1000", premiumUntil: new Date(Date.now() + 30 * 864e5).toISOString(), isPremium: true };
      const base: PanelView = { orderId, status: "SUCCESS", kind: "GURU_PRO", planLabel: "Guru Pro Bulanan", owner };
      const fx: Record<string, [PanelView, boolean]> = {
        sukses: [base, true],
        menunggu: [{ ...base, status: "PENDING", owner: { ...owner, isPremium: false, premiumUntil: null } }, true],
        keluar: [{ ...base, owner: null }, false],
        diganti: [{ ...base, status: "REPLACED" }, true],
        gagal: [{ ...base, status: "EXPIRED" }, true],
      };
      const [view, loggedIn] = fx[sp.fx || "sukses"] || fx.sukses;
      return <PaymentFinishView view={view} loggedIn={loggedIn} />;
    }
    default: notFound();
  }
}
