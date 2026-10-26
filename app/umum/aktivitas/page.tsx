import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Inbox } from "lucide-react";
import { requireUmumPage } from "@/lib/auth/umum-page";
import { loadAktivitas } from "@/lib/umum/aktivitas";
import { UmumShell } from "@/components/umum/UmumShell";
import { AktivitasList } from "@/components/umum/AktivitasList";
import { buttonClass } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aktivitas — BahasaCerdas", robots: { index: false, follow: false } };

/** Riwayat aktivitas UMUM (data nyata: XpLedger + Pembelian lunas). */
export default async function UmumAktivitasPage() {
  const user = await requireUmumPage("/umum/aktivitas");
  const items = await loadAktivitas(user.id, 30);
  return (
    <UmumShell user={user}>
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/umum" className="mb-3 inline-flex items-center gap-1 text-bc-small font-semibold text-bc-aud hover:underline">
          <ArrowLeft size={16} aria-hidden /> Beranda
        </Link>
        <h1 className="text-bc-h1 text-bc-text">Aktivitas</h1>
        <p className="mb-6 mt-1 text-bc-small text-bc-text-3">Riwayat XP dan pembelian karyamu (30 terbaru).</p>
        <div className="rounded-bc-card border border-bc-line bg-bc-surface px-5 py-2 shadow-bc-1">
          {items.length === 0 ? (
            <div data-testid="aktivitas-kosong" className="flex flex-col items-center p-8 text-center">
              <Inbox size={26} aria-hidden className="text-bc-text-3" />
              <p className="mt-2 font-semibold text-bc-text">Belum ada aktivitas</p>
              <Link href="/umum#gim" className={`${buttonClass({ variant: "primary", size: "sm" })} mt-4`}>Main gim</Link>
            </div>
          ) : (
            <AktivitasList items={items} />
          )}
        </div>
      </div>
    </UmumShell>
  );
}
