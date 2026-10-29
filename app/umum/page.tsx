import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import type React from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Camera,
  ChevronRight,
  Crown,
  Feather,
  Gamepad2,
  Hourglass,
  Inbox,
  Route,
  SearchX,
  Sparkles,
  Store,
  Target,
} from "lucide-react";
import { requireUmumPage } from "@/lib/auth/umum-page";
import { isUmumGameId } from "@/lib/auth/roles";
import { GAME_REGISTRY } from "@/lib/arena/game-registry";
import { UMUM_PRODUCTS, type UmumProductKey } from "@/lib/umum/products";
import { loadAktivitas } from "@/lib/umum/aktivitas";
import { UmumShell } from "@/components/umum/UmumShell";
import { AktivitasList } from "@/components/umum/AktivitasList";
import { UmumTrialOffer } from "@/components/umum/UmumTrialOffer";
import { umumTrialView } from "@/lib/umum/trial";
import { buttonClass } from "@/components/ui/button";
import { NaraIcon, JumpaIcon, GimIcon, JalurCerdasIcon, BigtIcon, AksaraIcon, TokoKaryaIcon } from "@/components/shared/FeatureIcons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dasbor Umum — BahasaCerdas",
  robots: { index: false, follow: false },
};

/**
 * Ubin ikon "Ruang Jelajahmu": satu gradien per produk (tokens.css §4,
 * --bc-tile-*), ikon putih (kontras ≥ 3:1). Tanpa palet Tailwind mentah.
 */
const PRODUCT_TILE: Record<UmumProductKey, { icon: React.ComponentType<any>; tile: string; custom?: boolean }> =
  {
    NARA: { icon: NaraIcon, tile: "", custom: true },
    JUMPA: { icon: JumpaIcon, tile: "", custom: true },
    MAIN_BERSAMA: { icon: GimIcon, tile: "", custom: true },
    JALUR_CERDAS: { icon: JalurCerdasIcon, tile: "", custom: true },
    BIGT: { icon: BigtIcon, tile: "", custom: true },
    AKSARA: { icon: AksaraIcon, tile: "", custom: true },
    TOKO_KARYA: { icon: TokoKaryaIcon, tile: "", custom: true },
    AKU_SASTRAWAN: { icon: Feather, tile: "bg-[image:var(--bc-tile-aku)]" },
  };
/** Produk berlabel Premium di desain (AKU SASTRAWAN = produk premium). */
const PREMIUM: ReadonlySet<UmumProductKey> = new Set(["AKU_SASTRAWAN"]);

const NAVY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-bc-ctl bg-bc-navy font-bold text-bc-on-navy shadow-bc-2 transition-[opacity,transform] hover:opacity-90 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bc-on-navy motion-reduce:transition-none";
const QUOTE = "Bahasa Menghubungkan Gagasan, Manusia, dan Masa Depan";

/** Pencarian sederhana tanpa beda huruf besar/kecil & tanda baca. */
function norm(s: string): string {
  return s
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function cocok(q: string, ...fields: string[]): boolean {
  const words = norm(q).split(" ").filter(Boolean);
  const hay = norm(fields.join(" "));
  return words.every((w) => hay.includes(w));
}

export default async function UmumDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUmumPage("/umum");
  // Kategori Umum tidak lagi ditampilkan (cukup "Umum"); kolom DB tetap ada.
  const rawQ = (await searchParams).q;
  const q = (Array.isArray(rawQ) ? rawQ[0] : (rawQ ?? "")).trim().slice(0, 80);
  const aktivitas = await loadAktivitas(user.id, 4);
  const name = user.nickname || user.fullName;
  const firstName = name.trim().split(/\s+/)[0] || name;
  const allGames = GAME_REGISTRY.filter(
    (g) => isUmumGameId(g.id) && !g.unpublished && !g.premiumOnly,
  );
  const products = q
    ? UMUM_PRODUCTS.filter((p) => cocok(q, p.name, p.label, p.description))
    : UMUM_PRODUCTS;
  const games = q
    ? allGames.filter((g) => cocok(q, g.title, g.description))
    : allGames;
  const now = new Date();

  return (
    <UmumShell user={user} searchQuery={q}>
      <div className="w-full space-y-7">
        <div className="space-y-4 md:space-y-0">
          {/* Sapaan (mobile: di atas kartu hero, sesuai desain) */}
          <div className="md:hidden">
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-bc-text">
              Halo, <span className="break-words">{firstName}</span>!
            </h1>
            <p className="mt-1 text-sm text-bc-text-2">
              Selamat datang di BahasaCerdas
            </p>
          </div>

          {/* Hero */}
          <section
            aria-labelledby="sapaan"
            data-testid="umum-hero"
            className="relative isolate overflow-hidden rounded-bc-hero bg-bc-navy text-white shadow-bc-2"
          >
            <Image
              src="/images/umum/umum-hero.webp"
              alt=""
              fill
              priority
              sizes="(min-width: 1280px) 1000px, (min-width: 1024px) 75vw, 100vw"
              className="-z-10 object-cover object-[100%_45%] dark:brightness-[.82]"
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-[image:var(--bc-umum-scrim)]"
            />
            <div className="flex min-h-[168px] flex-col justify-between gap-4 p-5 sm:p-7 md:block md:min-h-[248px] md:p-9">
              <div className="hidden max-w-[33rem] md:block">
                <h1
                  id="sapaan"
                  className="text-[34px] font-extrabold leading-tight tracking-tight"
                >
                  Halo, <span className="break-words">{firstName}</span>!
                </h1>
                <p className="mt-1.5 text-lg font-bold">
                  Selamat datang di BahasaCerdas
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-white/90">
                  Jelajahi berbagai ruang belajar, berdiskusi, berkarya, dan
                  kembangkan potensi terbaikmu melalui bahasa Indonesia.
                </p>
              </div>
              <p className="max-w-[60%] font-display text-[19px] italic leading-snug [text-shadow:var(--bc-umum-quote-shadow)] md:hidden">
                {QUOTE}
              </p>
              <Link
                href="#produk"
                className={`${NAVY_BTN} h-11 w-fit px-5 text-sm md:mt-6`}
              >
                Mulai Jelajahi <ArrowRight size={18} aria-hidden />
              </Link>
            </div>
            <p
              aria-hidden
              className="absolute right-[22%] top-[14%] hidden w-[16.5rem] text-right font-display text-[28px] italic leading-snug [text-shadow:var(--bc-umum-quote-shadow)] xl:block"
            >
              {QUOTE}
            </p>
          </section>
        </div>

        {/* Premium Umum: tawaran lunak uji coba (tidak otomatis) */}
        <UmumTrialOffer view={umumTrialView(user)} />

        {/* Ruang Jelajahmu */}
        <section
          id="produk"
          aria-labelledby="judul-produk"
          className="scroll-mt-24"
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="judul-produk"
                className="text-xl font-extrabold tracking-tight text-bc-text"
              >
                {q ? "Hasil pencarian" : "Ruang Jelajahmu"}
              </h2>
              <p className="mt-0.5 text-sm text-bc-text-3">
                {q ? (
                  <>
                    Untuk “
                    <span className="font-semibold text-bc-text-2">{q}</span>” —{" "}
                    {products.length} produk, {games.length} gim.
                  </>
                ) : (
                  "Pilih produk yang sesuai dengan minat dan kebutuhanmu."
                )}
              </p>
            </div>
            {q ? (
              <Link
                href="/umum#produk"
                className={buttonClass({ variant: "secondary", size: "sm" })}
              >
                Hapus pencarian
              </Link>
            ) : (
              <span className="hidden rounded-full border border-bc-line bg-bc-surface px-3 py-1.5 text-xs font-semibold text-bc-text-2 sm:inline-block">
                Terbuka untuk semua
              </span>
            )}
          </div>
          {products.length === 0 ? (
            <div
              data-testid="cari-kosong"
              className="flex flex-col items-center rounded-bc-card border border-dashed border-bc-line bg-bc-surface p-8 text-center"
            >
              <SearchX size={28} aria-hidden className="text-bc-text-3" />
              <p className="mt-3 font-semibold text-bc-text">
                Tidak ada produk yang cocok
              </p>
              <p className="mt-1 text-bc-small text-bc-text-3">
                Coba kata kunci lain, misalnya “baca”, “gim”, atau “karya”.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-4 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {products.map((p) => {
                const { icon: Icon, tile, custom } = PRODUCT_TILE[p.key];
                const dev = p.status === "dev";
                const premium = PREMIUM.has(p.key);
                const Arrow = p.external ? ArrowUpRight : ArrowRight;
                const body = (
                  <>
                    <div className="flex w-full items-start justify-center sm:justify-between">
                      <span
                        className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-bc-icon text-white shadow-bc-1 sm:h-12 sm:w-12 ${tile}`}
                      >
                        {custom ? <Icon size={44} aria-hidden /> : <Icon size={22} aria-hidden />}
                        {dev && (
                          <span
                            aria-hidden
                            className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-bc-warning-soft text-bc-warning-strong ring-2 ring-bc-surface sm:hidden"
                          >
                            <Hourglass size={9} />
                          </span>
                        )}
                      </span>
                      {premium && (
                        <span className="hidden items-center gap-1 rounded-full bg-bc-warning-strong px-2 py-0.5 text-[11px] font-bold text-bc-on-brand sm:inline-flex">
                          <Crown size={11} aria-hidden /> Premium
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-[10.5px] font-extrabold uppercase leading-tight tracking-tight text-bc-text sm:mt-4 sm:text-[15px]">
                      {p.name}
                    </h3>
                    <p className="mt-1.5 hidden pr-1 text-[13px] leading-relaxed text-bc-text-2 sm:line-clamp-2">
                      {p.description}
                    </p>
                    {premium && (
                      <span className="mt-1.5 inline-flex items-center rounded-full bg-bc-warning-strong px-1.5 py-0.5 text-[9.5px] font-bold text-bc-on-brand sm:hidden">
                        Premium
                      </span>
                    )}
                    {dev && (
                      <span className="mt-3 hidden w-fit items-center gap-1 rounded-full bg-bc-warning-soft px-2.5 py-1 text-[11px] font-semibold text-bc-warning-strong sm:inline-flex">
                        <Hourglass size={12} aria-hidden /> Sedang dalam
                        pengembangan
                      </span>
                    )}
                    {dev && (
                      <span className="sr-only sm:hidden">
                        (Sedang dalam pengembangan)
                      </span>
                    )}
                    {p.external && (
                      <span className="sr-only">
                        (membuka situs eksternal di tab baru)
                      </span>
                    )}
                    <Arrow
                      size={18}
                      aria-hidden
                      className="absolute bottom-4 right-4 hidden text-bc-text-2 transition-transform group-hover:translate-x-0.5 group-hover:text-bc-aud motion-reduce:transition-none sm:block"
                    />
                  </>
                );
                const cls =
                  "group relative flex h-full flex-col items-center rounded-bc-tile border border-bc-line bg-bc-surface px-1.5 py-3 text-center shadow-bc-1 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-bc-line-strong hover:shadow-bc-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bc-focus motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:items-start sm:rounded-bc-card sm:p-5 sm:pb-10 sm:text-left";
                return (
                  <li key={p.key} className="min-w-0">
                    {p.external ? (
                      <a
                        href={p.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-product={p.key}
                        className={cls}
                      >
                        {body}
                      </a>
                    ) : (
                      <Link href={p.href} data-product={p.key} className={cls}>
                        {body}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Baris bawah: Aktivitas + Jelajahi Dunia Bahasa */}
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <section
            aria-labelledby="judul-aktivitas"
            className="rounded-bc-card border border-bc-line bg-bc-surface p-5 shadow-bc-1"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="judul-aktivitas"
                  className="text-base font-extrabold text-bc-text"
                >
                  Aktivitas Terbaru
                </h2>
                <p className="mt-0.5 text-xs text-bc-text-3">
                  Lanjutkan dari yang terakhir kamu lakukan.
                </p>
              </div>
              {aktivitas.length > 0 && (
                <Link
                  href="/umum/aktivitas"
                  className="inline-flex shrink-0 items-center gap-1 rounded-bc-sm text-xs font-semibold text-bc-aud hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bc-focus"
                >
                  Lihat semua <ArrowRight size={14} aria-hidden />
                </Link>
              )}
            </div>
            {aktivitas.length === 0 ? (
              <div
                data-testid="aktivitas-kosong"
                className="mt-4 flex flex-col items-center rounded-bc-tile border border-dashed border-bc-line p-6 text-center"
              >
                <Inbox size={26} aria-hidden className="text-bc-text-3" />
                <p className="mt-2 font-semibold text-bc-text">
                  Belum ada aktivitas
                </p>
                <p className="mt-1 max-w-sm text-bc-small text-bc-text-3">
                  Mainkan gim atau beli karya pertamamu — aktivitasmu akan
                  muncul di sini.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Link
                    href="#gim"
                    className={buttonClass({ variant: "primary", size: "sm" })}
                  >
                    Main gim
                  </Link>
                  <Link
                    href="/marketplace"
                    className={buttonClass({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    Toko Karya
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <AktivitasList items={aktivitas} now={now} />
              </div>
            )}
          </section>

          <section
            aria-labelledby="judul-dunia"
            className="flex flex-col rounded-bc-card border border-bc-line bg-bc-surface p-5 shadow-bc-1"
          >
            <h2
              id="judul-dunia"
              className="text-base font-extrabold text-bc-text"
            >
              Jelajahi Dunia Bahasa
            </h2>
            <p className="mt-0.5 text-xs text-bc-text-3">
              Temukan bacaan, karya, diskusi, dan konten menarik lainnya.
            </p>
            <div className="relative isolate mt-4 flex min-h-[168px] flex-1 flex-col justify-between overflow-hidden rounded-bc-tile bg-bc-navy p-5 text-white">
              <Image
                src="/images/umum/umum-jelajahi.webp"
                alt=""
                fill
                sizes="(min-width: 1024px) 480px, 100vw"
                className="-z-10 object-cover object-right dark:brightness-[.85]"
              />
              <p className="max-w-[16rem] text-[17px] font-bold leading-snug [text-shadow:var(--bc-umum-quote-shadow)]">
                Baca, Tulis, dan <br className="hidden sm:inline" />
                Jadi Bagian dari Komunitas <br className="hidden sm:inline" />
                Bahasa Indonesia
              </p>
              <Link
                href="/artikel"
                className={`${NAVY_BTN} mt-4 h-10 w-fit px-4 text-sm`}
              >
                Jelajahi Sekarang
              </Link>
            </div>
          </section>
        </div>

        {/* Gim (tujuan menu "Jelajahi") */}
        <section id="gim" aria-labelledby="judul-gim" className="scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="judul-gim"
                className="text-xl font-extrabold tracking-tight text-bc-text"
              >
                Jelajahi Gim
              </h2>
              <p className="mt-0.5 text-sm text-bc-text-3">
                Main gim kata dan kumpulkan XP.
              </p>
            </div>
            <Link
              href="/arena/game"
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              Semua gim <ChevronRight size={16} aria-hidden />
            </Link>
          </div>
          {games.length === 0 ? (
            <p className="rounded-bc-card border border-dashed border-bc-line p-6 text-center text-bc-small text-bc-text-3">
              {q
                ? "Tidak ada gim yang cocok dengan pencarianmu."
                : "Belum ada gim yang tersedia."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {games.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/arena/game/${g.id}`}
                    className="group flex h-full flex-col rounded-bc-card border border-bc-line bg-bc-surface p-4 shadow-bc-1 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-bc-2"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-bc-icon bg-bc-info-soft text-bc-info">
                      <Gamepad2 size={20} />
                    </div>
                    <h3 className="mt-3 font-semibold text-bc-text group-hover:text-bc-aud">
                      {g.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-bc-text-3">
                      {g.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </UmumShell>
  );
}
