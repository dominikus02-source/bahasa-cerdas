import Link from "next/link";
import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight, BookOpenText, ChevronRight, Feather, Gamepad2, Hourglass, Inbox, Route,
  ShoppingBag, Sparkles, Star, Store, Target, Users, Video, Zap,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireUmumPage } from "@/lib/auth/umum-page";
import { isUmumGameId } from "@/lib/auth/roles";
import { GAME_REGISTRY } from "@/lib/arena/game-registry";
import { UMUM_PRODUCTS, type UmumProductKey } from "@/lib/umum/products";
import { UmumShell } from "@/components/umum/UmumShell";
import { UmumTrialOffer } from "@/components/umum/UmumTrialOffer";
import { umumTrialView } from "@/lib/umum/trial";
import { buttonClass } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dasbor Umum — BahasaCerdas",
  robots: { index: false, follow: false },
};

const PRODUCT_ICON: Record<UmumProductKey, LucideIcon> = {
  NARA: Sparkles,
  JUMPA: Video,
  MAIN_BERSAMA: Users,
  JALUR_CERDAS: Route,
  BIGT: Target,
  AKSARA: BookOpenText,
  TOKO_KARYA: Store,
  AKU_SASTRAWAN: Feather,
};

/**
 * Sentuhan warna merek BahasaCerdas pada kartu produk: chip ikon bergiliran
 * teal → biru → violet (tiga warna gradien merek). Semua dari token tema
 * (app/theme/tokens.css), kontras ikon ≥ 3:1 di mode terang & gelap.
 */
const BRAND_CHIP = [
  "bg-bc-accent-soft text-bc-accent-strong",
  "bg-bc-info-soft text-bc-info",
  "bg-bc-violet-soft text-bc-violet",
] as const;

const XP_SOURCE_LABEL: Record<string, string> = {
  GAME: "Bermain gim",
  KATASTRA: "Berkarya",
  MENARA: "Menara Cerdas",
  TANTANG: "Tantangan",
  JALUR_CERDAS: "Jalur Cerdas",
  KOMPETENSI: "Uji kompetensi",
  PENUGASAN: "Penugasan",
  KOTAK_HARIAN: "Kotak harian",
};

type Aktivitas = {
  id: string;
  kind: "xp" | "beli";
  title: string;
  detail: string;
  at: Date;
  href?: string;
};

const fmtWaktu = new Intl.DateTimeFormat("id-ID", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
});
const fmtRupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

async function loadAktivitas(userId: string): Promise<Aktivitas[]> {
  // Data NYATA saja: XP yang tercatat + pembelian karya yang lunas.
  const [xp, beli] = await Promise.all([
    db.xpLedger
      .findMany({ where: { userId, amount: { gt: 0 } }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, amount: true, source: true, createdAt: true } })
      .catch(() => []),
    db.pembelian
      .findMany({ where: { buyerId: userId, status: "PAID" }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, amount: true, createdAt: true, karyaId: true, karya: { select: { title: true } } } })
      .catch(() => []),
  ]);
  const items: Aktivitas[] = [
    ...xp.map((x) => ({
      id: `xp-${x.id}`,
      kind: "xp" as const,
      title: `+${x.amount} XP`,
      detail: XP_SOURCE_LABEL[x.source] ?? "Aktivitas belajar",
      at: x.createdAt,
    })),
    ...beli.map((p) => ({
      id: `beli-${p.id}`,
      kind: "beli" as const,
      title: p.karya?.title || "Karya",
      detail: `Dibeli · ${fmtRupiah.format(p.amount)}`,
      at: p.createdAt,
      href: `/marketplace/${p.karyaId}`,
    })),
  ];
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 6);
}

export default async function UmumDashboardPage() {
  const user = await requireUmumPage("/umum");
  // Kategori Umum tidak lagi ditampilkan (cukup "Umum"); kolom DB tetap ada.
  const aktivitas = await loadAktivitas(user.id);
  const name = user.nickname || user.fullName;
  const games = GAME_REGISTRY.filter((g) => isUmumGameId(g.id) && !g.unpublished && !g.premiumOnly);

  return (
    <UmumShell user={user}>
      <div className="mx-auto w-full max-w-6xl space-y-10">
        {/* Sapaan */}
        <section aria-labelledby="sapaan" className="rounded-bc-hero border border-bc-line bg-bc-surface p-5 shadow-bc-1 sm:p-7">
          <p className="text-bc-eyebrow uppercase text-bc-violet">Ruang belajar untuk semua</p>
          <h1 id="sapaan" className="mt-2 text-bc-h1 text-bc-text">
            Halo, <span className="break-words">{name}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-bc-body text-bc-text-2">
            Belajar, bermain, membaca, dan berkarya dalam bahasa Indonesia — semuanya dari satu tempat.
          </p>
          <dl className="mt-5 flex flex-wrap gap-2 text-sm">
            <div className="flex items-center gap-1.5 rounded-full border border-bc-line bg-bc-surface-2 px-3 py-1.5">
              <Zap size={14} aria-hidden className="text-bc-warning" />
              <dt className="text-bc-text-3">XP</dt>
              <dd className="font-semibold tabular-nums text-bc-text">{user.xp.toLocaleString("id-ID")}</dd>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-bc-line bg-bc-surface-2 px-3 py-1.5">
              <Star size={14} aria-hidden className="text-bc-violet" />
              <dt className="text-bc-text-3">Level</dt>
              <dd className="font-semibold tabular-nums text-bc-text">{user.level}</dd>
            </div>
          </dl>
        </section>

        {/* Premium Umum: tawaran lunak uji coba (tidak otomatis) */}
        <UmumTrialOffer view={umumTrialView(user)} />

        {/* Produk */}
        <section id="produk" aria-labelledby="judul-produk" className="scroll-mt-24">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 id="judul-produk" className="text-bc-h2 text-bc-text">Semua Produk</h2>
              <p className="text-bc-small text-bc-text-3">Pilih ruang yang ingin kamu buka.</p>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
            {UMUM_PRODUCTS.map((p, i) => {
              const Icon = PRODUCT_ICON[p.key];
              const dev = p.status === "dev";
              const body = (
                <>
                  {!dev && (
                    <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-bc-brand opacity-60 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" />
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-bc-icon ${dev ? "bg-bc-surface-2 text-bc-text-3" : BRAND_CHIP[i % BRAND_CHIP.length]}`}>
                      <Icon size={22} aria-hidden />
                    </span>
                    {p.external ? (
                      <ArrowUpRight size={18} aria-hidden className="text-bc-text-3 transition-colors group-hover:text-bc-text" />
                    ) : (
                      <ChevronRight size={18} aria-hidden className="text-bc-text-3 transition-colors group-hover:text-bc-text" />
                    )}
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-bc-text-3">{p.label}</p>
                  <h3 className="mt-0.5 text-base font-extrabold tracking-tight text-bc-text">{p.name}</h3>
                  <p className="mt-1.5 text-bc-small text-bc-text-2">{p.description}</p>
                  {dev && (
                    <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-bc-warning-soft px-2.5 py-1 text-xs font-semibold text-bc-warning-strong">
                      <Hourglass size={12} aria-hidden /> Sedang dalam pengembangan
                    </span>
                  )}
                  {p.external && <span className="sr-only">(membuka situs eksternal di tab baru)</span>}
                </>
              );
              const cls = `group relative flex h-full flex-col overflow-hidden rounded-bc-card border border-bc-line bg-bc-surface p-4 shadow-bc-1 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 ${dev ? "hover:border-bc-line-strong" : "hover:border-bc-info"} hover:shadow-bc-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bc-focus motion-reduce:transition-none motion-reduce:hover:translate-y-0`;
              return (
                <li key={p.key} className="min-w-0">
                  {p.external ? (
                    <a href={p.href} target="_blank" rel="noopener noreferrer" data-product={p.key} className={cls}>{body}</a>
                  ) : (
                    <Link href={p.href} data-product={p.key} className={cls}>{body}</Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Gim */}
        <section id="gim" aria-labelledby="judul-gim" className="scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="judul-gim" className="text-bc-h2 text-bc-text">Jelajahi Gim</h2>
              <p className="text-bc-small text-bc-text-3">Main gim kata dan kumpulkan XP.</p>
            </div>
            <Link href="/arena/game" className={buttonClass({ variant: "soft", size: "sm" })}>
              Semua gim <ChevronRight size={16} aria-hidden />
            </Link>
          </div>
          {games.length === 0 ? (
            <p className="rounded-bc-card border border-dashed border-bc-line p-6 text-center text-bc-small text-bc-text-3">Belum ada gim yang tersedia.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
              {games.map((g) => {
                const Icon = g.icon ?? Gamepad2;
                return (
                  <li key={g.id} className="min-w-0">
                    <Link
                      href={g.href}
                      data-game={g.id}
                      className="group flex h-full items-start gap-3 rounded-bc-card border border-bc-line bg-bc-surface p-4 shadow-bc-1 transition-colors hover:border-bc-line-strong hover:bg-bc-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bc-focus"
                    >
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-bc-icon bg-gradient-to-br text-white ${g.gradient}`}>
                        <Icon size={22} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-bc-text">{g.title}</span>
                        <span className="mt-0.5 line-clamp-2 block text-bc-small text-bc-text-2">{g.description}</span>
                        <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-bc-text-3">
                          <span>{g.xp}</span>
                          <span>{g.time}</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Aktivitas */}
        <section aria-labelledby="judul-aktivitas">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 id="judul-aktivitas" className="text-bc-h2 text-bc-text">Aktivitas Terbaru</h2>
            <Link href="/umum/koleksi" className={buttonClass({ variant: "soft", size: "sm" })}>
              Koleksi Saya <ChevronRight size={16} aria-hidden />
            </Link>
          </div>
          {aktivitas.length === 0 ? (
            <div data-testid="aktivitas-kosong" className="flex flex-col items-center rounded-bc-card border border-dashed border-bc-line bg-bc-surface p-8 text-center">
              <Inbox size={28} aria-hidden className="text-bc-text-3" />
              <p className="mt-3 font-semibold text-bc-text">Belum ada aktivitas</p>
              <p className="mt-1 max-w-sm text-bc-small text-bc-text-3">Mainkan gim atau beli karya pertamamu — aktivitasmu akan muncul di sini.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link href="#gim" className={buttonClass({ variant: "primary", size: "sm" })}>Main gim</Link>
                <Link href="/marketplace" className={buttonClass({ variant: "secondary", size: "sm" })}>Toko Karya</Link>
              </div>
            </div>
          ) : (
            <ol data-testid="aktivitas-list" className="divide-y divide-bc-line overflow-hidden rounded-bc-card border border-bc-line bg-bc-surface">
              {aktivitas.map((a) => {
                const Icon = a.kind === "xp" ? Zap : ShoppingBag;
                const inner = (
                  <>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${a.kind === "xp" ? "bg-bc-warning-soft text-bc-warning-strong" : "bg-bc-success-soft text-bc-success"}`}>
                      <Icon size={16} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-bc-text">{a.title}</span>
                      <span className="block truncate text-xs text-bc-text-3">{a.detail}</span>
                    </span>
                    <time dateTime={a.at.toISOString()} className="shrink-0 text-xs tabular-nums text-bc-text-3">{fmtWaktu.format(a.at)}</time>
                  </>
                );
                return (
                  <li key={a.id}>
                    {a.href ? (
                      <Link href={a.href} className="flex items-center gap-3 px-4 py-3 hover:bg-bc-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bc-focus">{inner}</Link>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </UmumShell>
  );
}
