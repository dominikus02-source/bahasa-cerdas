import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Feather, Gem } from "lucide-react";

/** Foto menulis yang sama dengan pintasan Aksara (host sudah diizinkan di next.config.ts). */
const FOTO_MENULIS = "https://images.unsplash.com/photo-1743385779312-73ea241025d8?auto=format&fit=crop&w=1200&q=80";

/**
 * Kartu AKU SASTRAWAN di beranda guru. "Mulai menulis" → /aku-sastrawan (halaman
 * itu yang memeriksa Premium di server dan menampilkan ajakan aktivasi bila perlu).
 * "Karyaku" selalu tersedia: karya tetap bisa dibuka & diunduh setelah Premium berakhir.
 */
export function GuruAkuSastrawanCard() {
  return (
    <section aria-labelledby="guru-aku-sastrawan" data-testid="guru-aku-sastrawan" className="overflow-hidden rounded-bc-card border border-bc-border bg-bc-surface shadow-bc-1">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(240px,.55fr)]">
        <div className="bc-media bc-media--flush relative min-h-[128px] md:order-2 md:min-h-full">
          <Image src={FOTO_MENULIS} alt="" fill sizes="(max-width: 768px) 100vw, 420px" className="object-cover object-center" />
          <div className="bc-media-scrim bc-media-scrim--2" />
        </div>
        <div className="flex min-w-0 flex-col p-4 sm:p-5 md:order-1">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-bc-icon bg-bc-violet-soft text-bc-violet">
              <Feather className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-bc-violet">AKU SASTRAWAN</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-bc-violet-soft px-2 py-0.5 text-[10px] font-bold text-bc-violet">
                  <Gem className="h-3 w-3" /> Premium
                </span>
              </div>
              <h2 id="guru-aku-sastrawan" className="mt-1 text-base font-extrabold leading-snug text-bc-text sm:text-lg">
                Ruang menulis cerpen dan novel
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-bc-text-2">
                Kurikulum menulis, Studio Menulis dengan Peta Cerita, dan Pendamping Menulis AI — untuk karya Bapak/Ibu sendiri maupun contoh di kelas.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <Link href="/aku-sastrawan" className="inline-flex min-h-10 items-center gap-2 rounded-bc-ctl bg-foreground px-4 text-sm font-bold text-background shadow-bc-1 transition-opacity hover:opacity-90">
              Mulai menulis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/aku-sastrawan/studio" className="inline-flex min-h-10 items-center gap-2 rounded-bc-ctl border border-bc-border px-4 text-sm font-semibold text-bc-text transition-colors hover:border-bc-violet/40 hover:text-bc-violet">
              <BookOpen className="h-4 w-4" /> Karyaku
            </Link>
          </div>
          <p className="mt-2.5 text-[11px] leading-5 text-bc-text-3">Karya yang sudah ditulis selalu aman — bisa dibuka dan diunduh (PDF, Word, .txt) kapan saja.</p>
        </div>
      </div>
    </section>
  );
}
