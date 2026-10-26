import Link from "next/link";
import type { Metadata } from "next";
import { Download, Library, Receipt, Store } from "lucide-react";
import { db } from "@/lib/db";
import { requireUmumPage } from "@/lib/auth/umum-page";
import { UmumShell } from "@/components/umum/UmumShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Koleksi Saya — BahasaCerdas", robots: { index: false, follow: false } };

const fmtTanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
const fmtRupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

/** Koleksi = karya yang sudah LUNAS dibeli (Pembelian PAID), satu baris per karya. */
export default async function UmumKoleksiPage() {
  const user = await requireUmumPage("/umum/koleksi");
  const rows = await db.pembelian
    .findMany({
      where: { buyerId: user.id, status: "PAID" },
      orderBy: { createdAt: "desc" },
      select: { id: true, karyaId: true, amount: true, createdAt: true, karya: { select: { title: true, type: true, fileUrl: true } } },
      take: 200,
    })
    .catch(() => []);
  const seen = new Set<string>();
  const koleksi = rows.filter((r) => (seen.has(r.karyaId) ? false : (seen.add(r.karyaId), true)));

  return (
    <UmumShell user={user}>
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-bc-h1 text-bc-text">Koleksi Saya</h1>
            <p className="mt-1 text-bc-small text-bc-text-3">Karya yang sudah kamu beli di Toko Karya.</p>
          </div>
          <Link href="/orders" className="inline-flex items-center gap-1.5 rounded-bc-ctl border border-bc-line bg-bc-surface px-3 py-2 text-sm font-semibold text-bc-text hover:bg-bc-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bc-focus">
            <Receipt size={16} aria-hidden /> Riwayat pesanan
          </Link>
        </div>

        {koleksi.length === 0 ? (
          <div data-testid="koleksi-kosong" className="flex flex-col items-center rounded-bc-card border border-dashed border-bc-line bg-bc-surface p-10 text-center">
            <Library size={28} aria-hidden className="text-bc-text-3" />
            <p className="mt-3 font-semibold text-bc-text">Koleksimu masih kosong</p>
            <p className="mt-1 max-w-sm text-bc-small text-bc-text-3">Karya yang kamu beli akan tersimpan di sini.</p>
            <Link href="/marketplace" className="mt-4 inline-flex items-center gap-1.5 rounded-bc-ctl bg-bc-violet px-4 py-2 text-sm font-semibold text-bc-on-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bc-focus">
              <Store size={16} aria-hidden /> Jelajahi Toko Karya
            </Link>
          </div>
        ) : (
          <ul data-testid="koleksi-list" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {koleksi.map((k) => (
              <li key={k.id} className="flex min-w-0 flex-col rounded-bc-card border border-bc-line bg-bc-surface p-4 shadow-bc-1">
                <Link href={`/marketplace/${k.karyaId}`} className="rounded-bc-sm font-bold text-bc-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-bc-focus">
                  {k.karya?.title || "Karya"}
                </Link>
                <p className="mt-1 text-xs text-bc-text-3">
                  {fmtTanggal.format(k.createdAt)} · {fmtRupiah.format(k.amount)}
                </p>
                {k.karya?.fileUrl && (
                  <a href={k.karya.fileUrl} download className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-bc-ctl border border-bc-line px-3 py-1.5 text-sm font-semibold text-bc-text hover:bg-bc-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bc-focus">
                    <Download size={15} aria-hidden /> Unduh
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </UmumShell>
  );
}
