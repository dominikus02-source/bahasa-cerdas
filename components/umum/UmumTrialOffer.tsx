import Link from "next/link";
import { Crown, Gift } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import type { UmumTrialView } from "@/lib/umum/trial";

function sisaHari(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

/**
 * Tawaran lunak Premium Umum di beranda /umum. Hanya menautkan ke
 * /umum/premium — uji coba TIDAK pernah diaktifkan dari sini (ditawarkan,
 * bukan diberikan otomatis). Tidak tampil bila flag mati / sudah dipakai.
 */
export function UmumTrialOffer({ view }: { view: UmumTrialView }) {
  if (view.active || view.paid) {
    const until = view.paid ? view.paidUntil : view.endsAt;
    return (
      <Link
        href="/umum/premium"
        data-testid="umum-premium-chip"
        className="flex w-fit items-center gap-2 rounded-full border border-bc-line bg-bc-surface px-3 py-1.5 text-bc-small font-semibold text-bc-text shadow-bc-1 hover:border-bc-line-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bc-focus"
      >
        <Crown size={14} aria-hidden className="text-bc-violet" />
        {view.paid ? "Premium Umum aktif" : "Uji coba Premium Umum"}
        {until && <span className="font-normal text-bc-text-3">· sisa {sisaHari(until)} hari</span>}
      </Link>
    );
  }
  if (!view.eligible) return null;
  return (
    <section
      aria-labelledby="tawaran-premium"
      data-testid="umum-trial-offer"
      className="flex flex-col gap-4 rounded-bc-card border border-bc-line bg-bc-surface p-4 shadow-bc-1 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-bc-icon bg-bc-violet-soft text-bc-violet">
          <Gift size={22} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="tawaran-premium" className="text-base font-extrabold tracking-tight text-bc-text">Coba Premium Umum gratis 1 bulan</h2>
          <p className="mt-1 text-bc-small text-bc-text-2">
            Tanpa kartu dan tanpa tagihan otomatis. Berhenti kapan saja — setelah 30 hari kembali ke Gratis.
          </p>
        </div>
      </div>
      <Link href="/umum/premium#uji-coba" className={buttonClass({ variant: "secondary", size: "sm", className: "shrink-0" })}>
        Lihat penawaran
      </Link>
    </section>
  );
}
