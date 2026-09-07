"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight, Gamepad2, Medal, Play, Sparkles, Target, Trophy, Zap, Clock, Users,
} from "lucide-react";
import {
  GAME_REGISTRY, GAME_CATEGORIES, featuredGame,
  type GameCategory,
} from "@/lib/arena/game-registry";
import UserAvatar from "@/components/arena/UserAvatar";
import { RankChip } from "@/components/gamification/RankChip";
import BannerSlideshow, { type BannerSlide } from "@/components/public/BannerSlideshow";
import GameCard, { type GameView } from "@/components/arena/game-hub/GameCard";

/**
 * Game Hub Arena 2.0 — game launcher BahasaCerdas.
 * Prioritas: DISCOVER → PILIH → MAIN. Tanpa leaderboard/statistik/riwayat
 * di halaman ini — semuanya tetap ada di route masing-masing.
 *
 * Light/dark memakai Tailwind `dark:` variant (theme global .dark dari
 * next-themes) — tidak ada warna hardcode yang merusak salah satu mode.
 */

export interface GameHubUser {
  id: string;
  fullName: string;
  nickname: string | null;
  avatar: string | null;
  xp: number;
}

export interface GameHubClientProps {
  user: GameHubUser;
  level: number;
  rank: string;
  multiplayerEnabled: boolean;
}

export type { GameView };

const RECENT_KEY = "arena-gamehub-recent";

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d)) return d.filter((x) => typeof x === "string").slice(0, 8);
    }
  } catch { /* abaikan */ }
  return [];
}

function saveRecent(ids: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, 8))); } catch { /* abaikan */ }
}

function waktuLalu(ts: number): string {
  const detik = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (detik < 60) return "baru saja";
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} mnt lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return `${Math.floor(jam / 24)} hari lalu`;
}

const POPULAR_ORDER = ["kuis-tempur", "petualangan-kata", "teka-teki-silang", "lari-kata", "menara"];

export default function GameHubClient({ user, level, rank, multiplayerEnabled }: GameHubClientProps) {
  const [category, setCategory] = useState<"Semua" | GameCategory>("Semua");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [heroArtBroken, setHeroArtBroken] = useState(false);

  useEffect(() => {
    setRecentIds(loadRecent());
  }, []);

  const recordPlay = useCallback((id: string) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)];
      saveRecent(next);
      return next;
    });
  }, []);

  // Terapkan status offline: gim multiplayer tanpa mode solo → "Segera Hadir"
  // dan ditenggelamkan di bawah (urutan stabil dipertahankan).
  const games = useMemo<GameView[]>(() => {
    return GAME_REGISTRY.map((g): GameView => {
      if (!g.multiplayer || multiplayerEnabled) return { ...g, status: "LIVE" };
      if (g.soloSaatOffline) {
        return { ...g, status: "LIVE", players: g.soloSaatOffline.players, description: g.soloSaatOffline.desc };
      }
      return { ...g, status: "SOON" };
    }).sort((a, b) => Number(a.status === "SOON") - Number(b.status === "SOON"));
  }, [multiplayerEnabled]);

  const filtered = useMemo(
    () => (category === "Semua" ? games : games.filter((g) => g.categories.includes(category))),
    [category, games]
  );

  const newGames = useMemo(() => games.filter((g) => g.status === "LIVE" && g.badge?.type === "new"), [games]);
  const popular = useMemo(() => {
    const byId = new Map(games.filter((g) => g.status === "LIVE").map((g) => [g.id, g]));
    return POPULAR_ORDER.map((id) => byId.get(id)).filter((g): g is GameView => Boolean(g)).slice(0, 5);
  }, [games]);
  const recentGames = useMemo(() => {
    const byId = new Map(games.filter((g) => g.status === "LIVE").map((g) => [g.id, g]));
    return recentIds.map((id) => byId.get(id)).filter((g): g is GameView => Boolean(g)).slice(0, 3);
  }, [games, recentIds]);

  const hero = featuredGame();

  return (
    <div className="px-5 pb-10 sm:px-6 relative z-10">
      {/* Glow ambient — halus, theme-aware */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[280px] rounded-full opacity-40 dark:opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.28) 0%, transparent 70%)" }} />

      {/* ── HEADER ── */}
      <header className="relative flex items-center justify-between pt-2 pb-5">
        <div>
          <h1 className="font-game-display text-[30px] font-extrabold leading-none text-slate-900 dark:text-white">
            GIM
          </h1>
          <p className="text-[13px] font-medium text-slate-500 dark:text-[#7C7A9E] mt-1">
            Mainkan. Belajar. Naik Level.
          </p>
        </div>
        <Link
          href="/arena/player"
          className="group flex items-center gap-2.5 rounded-full border border-slate-200 dark:border-[rgba(124,58,237,0.25)] bg-white/70 dark:bg-[#16122A]/70 backdrop-blur px-3 py-1.5 shadow-sm transition-all hover:shadow-md active:scale-95"
          aria-label="Buka profil pemain"
        >
          <div className="hidden sm:flex sm:flex-col items-end leading-none gap-0.5">
            <span className="flex items-center gap-1 text-xs font-extrabold text-slate-800 dark:text-[#F1F0FF]">
              <Zap size={11} className="text-amber-500" />
              LV {level} · {user.xp.toLocaleString("id-ID")} XP
            </span>
            <RankChip rank={rank} size={13} showTitle={false} compact className="text-[11px]" />
          </div>
          <UserAvatar name={user.fullName} avatar={user.avatar} size={38} />
        </Link>
      </header>

      {/* ── HERO — GAME UNGGULAN ── */}
      <section
        className="relative overflow-hidden rounded-[28px] border border-white/20 text-white shadow-xl"
        style={{ background: "linear-gradient(120deg, #7C3AED 0%, #6D28D9 40%, #2563EB 100%)" }}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 w-72 h-72 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #ffffff, transparent 70%)" }} />
        <div className="relative grid md:grid-cols-2 gap-4 p-6 sm:p-8 items-center">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-950 shadow-sm">
              <Sparkles size={11} /> Game Baru
            </span>
            <h2 className="mt-3 font-game-display text-3xl sm:text-4xl font-extrabold leading-tight">
              {hero.title}
            </h2>
            <p className="mt-2 text-sm text-violet-100 max-w-sm leading-relaxed">{hero.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur px-2.5 py-1">
                <Zap size={11} className="text-amber-300" /> {hero.xp}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur px-2.5 py-1">
                <Clock size={11} /> {hero.time}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur px-2.5 py-1">
                <Users size={11} /> {hero.players}
              </span>
            </div>
            <Link
              href={hero.href}
              onClick={() => recordPlay(hero.id)}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-extrabold text-violet-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
            >
              <Play size={16} fill="currentColor" /> MAIN SEKARANG
            </Link>
          </div>
          <div className="relative min-h-[160px]">
            {!heroArtBroken && hero.artwork ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero.artwork}
                alt={`${hero.title} — banner gim`}
                className="w-full h-full max-h-[260px] object-cover rounded-[20px] border border-white/20 shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]"
                onError={() => setHeroArtBroken(true)}
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[160px] rounded-[20px] border border-white/20 bg-white/10 backdrop-blur">
                <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${hero.gradient} flex items-center justify-center shadow-2xl`}>
                  <hero.icon size={44} className="text-white" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── LANJUTKAN PERMAINAN ── */}
      {recentGames.length > 0 && (
        <section className="mt-7" aria-label="Lanjutkan permainan">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[1.5px] text-slate-500 dark:text-[#7C7A9E] mb-3">
            Lanjutkan Permainan
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {recentGames.map((g) => (
              <Link
                key={g.id}
                href={g.href}
                onClick={() => recordPlay(g.id)}
                className="group flex items-center gap-3 rounded-[20px] border border-slate-200 dark:border-[rgba(124,58,237,0.2)] bg-white dark:bg-[#16122A] p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${g.gradient} flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-105`}>
                  <g.icon size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{g.title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-[#7C7A9E] mt-0.5">Terakhir dimainkan</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-xl bg-violet-100 dark:bg-violet-500/20 px-3 py-2 text-xs font-extrabold text-violet-700 dark:text-violet-300 transition-all group-hover:gap-1.5">
                  Lanjutkan <ChevronRight size={13} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── BARU DI ARENA ── */}
      {newGames.length > 0 && (
        <section className="mt-7" aria-label="Baru di arena">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[1.5px] text-slate-500 dark:text-[#7C7A9E] mb-3">
            Baru di Arena
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {newGames.map((g) => (
              <Link
                key={g.id}
                href={g.href}
                onClick={() => recordPlay(g.id)}
                className="group relative overflow-hidden rounded-[22px] border border-slate-200 dark:border-[rgba(124,58,237,0.2)] bg-white dark:bg-[#16122A] p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl active:scale-[0.97]"
              >
                <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: g.accentColor }} />
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${g.gradient} flex items-center justify-center shadow-md transition-transform group-hover:scale-105`}>
                    <g.icon size={20} className="text-white" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300"
                    style={{ animation: "gh-badge-pulse 2s ease-in-out infinite" }}>
                    <Sparkles size={9} /> Baru
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white leading-tight">{g.title}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-[#7C7A9E] line-clamp-2">{g.description}</p>
                <p className="mt-2.5 inline-flex items-center gap-1 rounded-md bg-amber-100/80 dark:bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-400">
                  <Zap size={10} /> {g.xp}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── PALING SERU DIMAINKAN ── */}
      {popular.length > 0 && (
        <section className="mt-7" aria-label="Paling seru dimainkan">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[1.5px] text-slate-500 dark:text-[#7C7A9E] mb-3">
            Paling Seru Dimainkan
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {popular.map((g, i) => (
              <Link
                key={g.id}
                href={g.href}
                onClick={() => recordPlay(g.id)}
                className="group relative flex items-center gap-3 rounded-[20px] border border-slate-200 dark:border-[rgba(124,58,237,0.2)] bg-white dark:bg-[#16122A] p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
              >
                <span className={`flex items-center justify-center w-7 h-7 rounded-xl text-xs font-extrabold shrink-0 ${i === 0 ? "bg-amber-400 text-amber-950" : i === 1 ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100" : i === 2 ? "bg-orange-200 text-orange-800 dark:bg-orange-500/30 dark:text-orange-200" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                  {i + 1}
                </span>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${g.gradient} flex items-center justify-center shrink-0 shadow transition-transform group-hover:scale-105`}>
                  <g.icon size={18} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{g.title}</p>
                  <p className="text-[10px] text-slate-500 dark:text-[#7C7A9E]">{g.xp}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── PILIH PERMAINAN ── */}
      <section className="mt-7" aria-label="Pilih permainan">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[1.5px] text-slate-500 dark:text-[#7C7A9E]">
            Pilih Permainan
          </h2>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-[#7C7A9E]">
            {filtered.filter((g) => g.status === "LIVE").length} gim siap main
          </span>
        </div>

        {/* Category pills — horizontal scroll di mobile */}
        <div className="scrollbar-hide -mx-1 px-1 flex gap-2 overflow-x-auto pb-1 mb-4" role="tablist" aria-label="Kategori gim">
          {(["Semua", ...GAME_CATEGORIES] as const).map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition-all active:scale-95 ${
                  active
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/25"
                    : "bg-white dark:bg-[#16122A] text-slate-600 dark:text-[#A9A6C9] border border-slate-200 dark:border-[rgba(124,58,237,0.2)] hover:border-violet-300 dark:hover:border-violet-500/40"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Game grid — semua gim memakai satu komponen GameCard (artwork-based) */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((g, i) => (
            <GameCard
              key={g.id}
              game={g}
              index={i}
              onPlay={recordPlay}
            />
          ))}
        </div>
      </section>

      {/* ── PROMO — banner RANK BC (kiri) + slide gim Kuis Tempur ↔ Teka-Teki Silang (kanan) ── */}
      <section className="mt-7" aria-label="Promo rank dan gim">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* RANK BC — apa yang harus dicapai murid (naikkan peringkatmu → Profil) */}
          <Link
            href="/arena/player"
            aria-label="Profil pemain — naikkan peringkatmu!"
            className="group relative block overflow-hidden rounded-[20px] shadow-md shadow-red-500/15 transition-all hover:shadow-lg active:scale-[0.98]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/banners/rank-bc-banner.webp"
              alt="Rank BC — naikkan peringkatmu!"
              className="block w-full h-auto transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </Link>
          <BannerSlideshow
            slides={[
              {
                src: "/Rank%20BC/banner%20arena%20gim.png",
                alt: "Kuis Tempur — kini bisa main solo!",
                href: "/arena/game/kuis-tempur",
                shadow: "0 8px 28px rgba(43,75,255,0.25)",
                fallbackTitle: "Kuis Tempur",
                fallbackDesc: "Jawab benar untuk menyerang, solo vs bot tersedia.",
              },
              {
                src: "/banners/banners-TTS-gim.png",
                alt: "Teka-Teki Silang — isi kotak, asah kosakata!",
                href: "/arena/game/teka-teki-silang",
                shadow: "0 8px 28px rgba(56,189,248,0.25)",
                fallbackTitle: "Teka-Teki Silang",
                fallbackDesc: "12 level, soal baru tiap main — isi kotaknya dan kumpulkan XP!",
              },
            ] satisfies BannerSlide[]}
          />
        </div>
      </section>

      {/* ── QUICK ACCESS ── */}
      <section className="mt-7" aria-label="Navigasi cepat">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Leaderboard", desc: "Lihat ranking", href: "/arena/player/leaderboard", icon: Trophy, color: "text-amber-600 bg-amber-50 dark:bg-amber-400/10 dark:text-amber-400" },
            { label: "Profil", desc: "XP & peringkatmu", href: "/arena/player", icon: Gamepad2, color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-300" },
            { label: "Badge", desc: "Koleksi pencapaianmu", href: "/arena/player/badges", icon: Medal, color: "text-sky-600 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-300" },
            { label: "Misi", desc: "Tantangan harian", href: "/arena/misi", icon: Target, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300" },
          ].map((q) => (
            <Link
              key={q.label}
              href={q.href}
              className="group flex items-center gap-3 rounded-[20px] border border-slate-200 dark:border-[rgba(124,58,237,0.2)] bg-white dark:bg-[#16122A] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${q.color}`}>
                <q.icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900 dark:text-white">{q.label}</span>
                <span className="block text-[11px] text-slate-500 dark:text-[#7C7A9E]">{q.desc}</span>
              </span>
              <ChevronRight size={15} className="ml-auto shrink-0 text-slate-300 dark:text-[#56547a] transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
