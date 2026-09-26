"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Coins, Flame, Loader2, ShoppingBag, Sparkles, Zap } from "lucide-react";
import { RankChip } from "@/components/gamification/RankChip";
import UserAvatar from "@/components/arena/UserAvatar";
import { VerifiedBadge } from "@/components/arena/UserName";
import { nameColorStyle, getBadgeStyle } from "@/lib/cosmetics";
import { useHomeData } from "./home-data";
import type { MyDayResponse } from "./home-data";

/**
 * HERO PRIBADI (PERSONAL LEARNING HOME) — pengganti header profil lama.
 *
 * Satu hero card yang menggabungkan:
 *   identitas murid (avatar, nama, sekolah, greeting) +
 *   konteks belajar (headline state-driven) +
 *   aksi utama (Mulai Tes / Lanjutkan Belajar / Lanjutkan) +
 *   statistik ringkas (streak · koin · XP)
 *
 * Artwork: banners/banner herocard Arena.png (visual anchor).
 * Identity TIDAK pernah dibakar ke PNG — tetap HTML/React dinamis per murid.
 *
 * STATE CTA (dari My Day server, sama dengan ContinueLearningCard):
 *   DIAGNOSTIC (belum selesai)          → "Mulai Tes"        → mulai sesi Tes Awal
 *   DIAGNOSTIC BASELINE_IN_PROGRESS     → "Lanjutkan Tes"    → lanjut sesi
 *   DIAGNOSTIC comingSoon                → "Mulai Belajar"    → Jalur Cerdas
 *   ADAPTIVE (diagnostic selesai)       → "Lanjutkan Belajar"→ mulai latihan personal
 *   GENERAL_LEARNING / fallback         → "Lanjutkan"        → Jalur Cerdas
 */

const HERO_ART = "/banners/banner herocard Arena.png";

interface HeroActionLink {
  kind: "link";
  href: string;
}
interface HeroActionStart {
  kind: "start-diagnostic" | "start-adaptive";
}
type HeroAction = HeroActionLink | HeroActionStart;

interface HeroContent {
  eyebrow: string;
  headline: string;
  supporting: string;
  ctaLabel: string;
  action: HeroAction;
}

function resolveHeroContent(myDay: MyDayResponse | null): HeroContent {
  // FALLBACK / STATE C — tidak ada data personal → ajakan umum yang jujur.
  if (!myDay) {
    return {
      eyebrow: "PERJALANAN BELAJARMU",
      headline: "Lanjutkan langkahmu.",
      supporting: "Sedikit demi sedikit, kemampuanmu terus berkembang.",
      ctaLabel: "Lanjutkan",
      action: { kind: "link", href: "/arena/jalur-cerdas" },
    };
  }

  const isDiagnostic = myDay.mode === "PREVIEW" && myDay.actionType === "DIAGNOSTIC";
  const isAdaptive = myDay.mode === "PREVIEW" && myDay.actionType === "ADAPTIVE_PRACTICE";
  const state = myDay.assessmentState;

  // STATE A — Tes Awal belum dimulai (atau soal AI belum siap produksi).
  if (isDiagnostic) {
    if (myDay.comingSoon) {
      return {
        eyebrow: "TES AWAL",
        headline: "Kenali kemampuanmu.",
        supporting: "Tes awal masih disiapkan. Sambil menunggu, mulai belajar di Jalur Cerdas.",
        ctaLabel: "Mulai Belajar",
        action: { kind: "link", href: "/arena/jalur-cerdas" },
      };
    }
    if (state === "BASELINE_IN_PROGRESS") {
      return {
        eyebrow: "TES AWAL",
        headline: "Lanjutkan tes awalmu.",
        supporting: myDay.reasonText,
        ctaLabel: "Lanjutkan Tes",
        action: { kind: "start-diagnostic" },
      };
    }
    if (state === "BASELINE_COMPLETE_LOW") {
      return {
        eyebrow: "AKSI HARI INI",
        headline: "Siap lanjut belajar?",
        supporting: "BC sudah mulai mengenali kemampuanmu — lanjutkan berlatih agar profilmu makin akurat.",
        ctaLabel: "Lanjutkan Belajar",
        action: { kind: "link", href: "/arena/jalur-cerdas" },
      };
    }
    return {
      eyebrow: "TES AWAL",
      headline: "Kenali kemampuanmu.",
      supporting: "Ikuti tes singkat untuk mengetahui kemampuanmu dan mendapatkan jalur belajar yang sesuai.",
      ctaLabel: "Mulai Tes",
      action: { kind: "start-diagnostic" },
    };
  }

  // STATE B — Diagnostic selesai → latihan personal (atau lanjut di Jalur Cerdas).
  if (isAdaptive) {
    if (myDay.comingSoon) {
      return {
        eyebrow: "AKSI HARI INI",
        headline: "Siap lanjut belajar?",
        supporting: myDay.reasonText,
        ctaLabel: "Lanjutkan Belajar",
        action: { kind: "link", href: "/arena/jalur-cerdas" },
      };
    }
    return {
      eyebrow: "AKSI HARI INI",
      headline: "Siap lanjut belajar?",
      supporting: "Lanjutkan langkahmu dan terus kembangkan kemampuan Bahasa Indonesiamu.",
      ctaLabel: "Lanjutkan Belajar",
      action: { kind: "start-adaptive" },
    };
  }

  // STATE C — GENERAL_LEARNING / fallback.
  return {
    eyebrow: "PERJALANAN BELAJARMU",
    headline: "Lanjutkan langkahmu.",
    supporting: "Sedikit demi sedikit, kemampuanmu terus berkembang.",
    ctaLabel: "Lanjutkan",
    action: { kind: "link", href: "/arena/jalur-cerdas" },
  };
}

export function StudentHomeHero() {
  const router = useRouter();
  const { profile: data, me, profileFailed, myDay, myDayLoading, refresh } = useHomeData();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  if (profileFailed) {
    return (
      <div className="px-1 py-5 text-center">
        <p className="text-sm text-[var(--px-text-dim)]">Gagal memuat profilmu.</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-2 text-xs font-bold text-[var(--px-gold)] hover:underline"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 py-4 md:px-6 md:py-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="px-skeleton rounded-full" style={{ width: 56, height: 56 }} />
          <div className="flex-1 space-y-2.5">
            <div className="px-skeleton rounded-lg" style={{ width: "45%", height: 18 }} />
            <div className="px-skeleton rounded-lg" style={{ width: "35%", height: 12 }} />
            <div className="px-skeleton rounded-lg" style={{ width: "55%", height: 10 }} />
          </div>
        </div>
        <div className="px-skeleton rounded-lg" style={{ width: "100%", height: 12 }} />
        <div className="px-skeleton rounded-lg" style={{ width: "45%", height: 36 }} />
      </div>
    );
  }

  const profile = data.profile;

  const name = me?.displayName || me?.fullName || "Murid";
  const sub = me?.school || me?.city || "BahasaCerdas";
  const badge = getBadgeStyle(me?.equippedBadge);

  const hero = resolveHeroContent(myDayLoading ? null : myDay);
  const actionLoading = myDayLoading;
  const ctaBusy = starting;

  async function startDiagnosticSession() {
    setStarting(true);
    setStartError(null);
    try {
      const response = await fetch("/api/player/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", size: myDay?.sessionSize || undefined }),
      });
      const res = await response.json();
      if (!response.ok || res.mode !== "DIAGNOSTIC" || typeof res.sessionId !== "string") {
        throw new Error(res.error || "Tes awal belum tersedia");
      }
      router.push(`/arena/diagnostic/${res.sessionId}`);
    } catch {
      setStartError("Tes awal belum bisa dimulai. Coba lagi sebentar.");
    } finally {
      setStarting(false);
    }
  }

  async function startAdaptiveSession() {
    setStarting(true);
    setStartError(null);
    try {
      const response = await fetch("/api/player/adaptive-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const res = await response.json();
      if (!response.ok || !res.sessionId) {
        throw new Error(res.error || "Latihan belum tersedia");
      }
      router.push(`/arena/adaptive-practice/${res.sessionId}`);
    } catch {
      setStartError("Latihan belum bisa dimulai. Coba lagi sebentar.");
    } finally {
      setStarting(false);
    }
  }

  const ctaBtnClass =
    "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffd24a] to-[#f5a623] px-6 py-3 text-sm font-extrabold text-[#1b1205] shadow-[0_8px_20px_-6px_rgba(245,166,35,0.5)] transition-all duration-150 hover:from-[#ffe08a] hover:to-[#f5a623] hover:shadow-[0_10px_24px_-6px_rgba(245,166,35,0.6)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none";

  return (
    <section
      aria-label="Beranda pribadi — sapaan dan aksi belajarmu"
      className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#111a32] shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 dark:ring-white/10"
    >
      {/* ── Artwork: banner herocard Arena.png ──────────────────────────────── */}
      {/* Mobile: pita artwork di atas, konten di bawah (karakter tetap utuh). */}
      <div className="relative h-44 w-full sm:h-48 md:hidden" aria-hidden="true">
        <Image
          src={HERO_ART}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "70% center" }}
        />
      </div>
      {/* Desktop: panel artwork penuh di sisi kanan — menyatu dengan panel teks putih. */}
      <div
        className="absolute inset-y-0 right-0 hidden w-[42%] md:block"
        aria-hidden="true"
      >
        <Image
          src={HERO_ART}
          alt=""
          fill
          priority
          sizes="42vw"
          className="object-cover"
          style={{ objectPosition: "88% center" }}
        />
      </div>

      {/* ── Konten hero (di atas artwork, area putih aman) ── */}
      <div className="relative flex flex-col gap-5 px-5 py-5 sm:px-6 md:min-h-[360px] md:justify-between md:gap-4 md:py-7 md:pl-8 lg:px-10 motion-safe:animate-fade-in motion-reduce:animate-none">
        {/* Identity — bagian dari hero, bukan blok terpisah */}
        <div className="flex items-start gap-3 pr-4 sm:gap-4">
          <div className="relative shrink-0">
            <UserAvatar
              size={52}
              avatar={profile.avatar || me?.avatar || undefined}
              frame={me?.equippedFrame}
              initials={name.charAt(0).toUpperCase()}
              className="ring-2 ring-white shadow-md"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate"
                style={nameColorStyle(me?.equippedNameColor, false)}
              >
                {name}
              </p>
              <VerifiedBadge isFounder={me?.isFounder} isPremium={me?.isPremium} size={20} />
              {badge && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[11px] font-bold bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                  <badge.Icon size={12} />
                  {badge.label}
                </span>
              )}
              <RankChip rank={profile.rank as never} size={18} showTitle={false} compact />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300/75 truncate mt-0.5">{sub}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Halo! Siap belajar hari ini?</p>
          </div>
          <Link
            href="/murid/profile"
            className="hidden sm:inline-flex items-center gap-1 shrink-0 text-xs font-semibold text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200 transition-colors"
            aria-label="Lihat profil lengkap"
          >
            <Sparkles size={12} />
            Lihat Profil →
          </Link>
        </div>

        {/* Learning context + primary CTA */}
        <div className="max-w-[560px]">
          {actionLoading ? (
            <div className="space-y-3">
              <div className="px-skeleton rounded-lg" style={{ width: 90, height: 12 }} />
              <div className="px-skeleton rounded-lg" style={{ width: "70%", height: 28 }} />
              <div className="px-skeleton rounded-lg" style={{ width: "85%", height: 12 }} />
              <div className="px-skeleton rounded-full" style={{ width: 150, height: 40 }} />
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300 mb-2">
                {hero.eyebrow}
              </p>
              <h1 className="text-[26px] sm:text-3xl md:text-[32px] leading-tight font-semibold tracking-tight text-slate-900">
                {hero.headline}
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/80 leading-relaxed max-w-md">
                {hero.supporting}
              </p>

              <div className="mt-4 flex items-center gap-3 flex-wrap">
                {hero.action.kind === "link" ? (
                  <Link href={hero.action.href} className={ctaBtnClass} aria-label={hero.ctaLabel}>
                    {hero.ctaLabel}
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={hero.action.kind === "start-diagnostic" ? startDiagnosticSession : startAdaptiveSession}
                    disabled={ctaBusy}
                    className={ctaBtnClass}
                    aria-label={hero.ctaLabel}
                  >
                    {ctaBusy ? <Loader2 size={16} className="animate-spin" /> : null}
                    {ctaBusy ? "Menyiapkan..." : hero.ctaLabel}
                    {!ctaBusy && <ArrowRight size={16} />}
                  </button>
                )}
              </div>
              {startError && <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-300">{startError}</p>}

              {/* Mobile: Lihat Profil sebagai aksi sekunder kecil */}
              <Link
                href="/murid/profile"
                className="sm:hidden inline-flex items-center gap-1 mt-3 text-xs font-semibold text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200 transition-colors"
                aria-label="Lihat profil lengkap"
              >
                <Sparkles size={12} />
                Lihat Profil →
              </Link>
            </>
          )}
        </div>

        {/* Stats — compact pill row, bukan dashboard */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/[0.06] px-3 py-1.5 shadow-sm backdrop-blur-sm"
            title="Rentetan harian"
          >
            <Flame size={14} className="text-amber-500" />
            <span className="text-sm font-bold text-slate-900">{profile.streak}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">hari</span>
          </span>
          <Link
            href="/murid/toko-koin"
            className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/[0.06] px-3 py-1.5 shadow-sm backdrop-blur-sm transition-colors hover:border-amber-300"
            title="Toko Koin"
          >
            <Coins size={14} className="text-amber-500" />
            <span className="text-sm font-bold text-slate-900">{profile.coin.toLocaleString("id-ID")}</span>
            <ShoppingBag size={12} className="text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/[0.06] px-3 py-1.5 shadow-sm backdrop-blur-sm"
            title="Total XP"
          >
            <Zap size={14} className="text-violet-500" />
            <span className="text-sm font-bold text-slate-900">{profile.weeklyXp.toLocaleString("id-ID")}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">XP</span>
          </span>
        </div>
      </div>
    </section>
  );
}