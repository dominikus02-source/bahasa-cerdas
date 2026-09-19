"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Crown, Flame, Play, Sparkles, Zap } from "lucide-react";
import { GAME_CARD_ARTWORK, type GameDefinition } from "@/lib/arena/game-registry";

/**
 * Kartu gim Arena — satu komponen untuk SEMUA gim di grid "Pilih Permainan"
 * (/arena/game). Struktur visual wajib:
 *
 *   Ilustrasi (artwork / fallback gradient+ikon)
 *   → badge/status overlay (jika data gim memilikinya)
 *   → Judul
 *   → Deskripsi singkat
 *   → ⚡ XP · ◷ durasi (data existing, presentasi saja)
 *   → CTA "MAIN SEKARANG"
 *
 * HANYA perubahan tampilan. Semua perilaku (link, onClick recordPlay, state
 * SOON/locked) dipertahankan 100% dari implementasi sebelumnya: kartu LIVE
 * adalah <Link> penuh (seluruh kartu dapat diklik, sama seperti sebelumnya),
 * kartu SOON adalah <div> tanpa CTA yang menipu.
 */

export type GameView = GameDefinition & { status: "LIVE" | "SOON" };

export interface GameCardProps {
  game: GameView;
  index?: number;
  /** Handler klik yang sudah ada (recordPlay) — dipanggil saat kartu diklik. */
  onPlay?: (id: string) => void;
}

export default function GameCard({ game, index = 0, onPlay }: GameCardProps) {
  const artwork = GAME_CARD_ARTWORK[game.id];
  const [imgBroken, setImgBroken] = useState(false);
  const showArt = Boolean(artwork) && !imgBroken;

  const badge = game.status === "LIVE" ? game.badge ?? null : null;

  // ── IMAGE AREA (dipakai LIVE & SOON) ──
  const imageArea = (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-[#12101F]">
      {showArt ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artwork}
          alt={`${game.title} — ilustrasi gim`}
          width={1448}
          height={1086}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          onError={() => setImgBroken(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${game.gradient} shadow-md ${
              game.status === "SOON" ? "opacity-60" : ""
            }`}
          >
            <game.icon size={24} className="text-white" />
          </div>
        </div>
      )}

      {/* Badge/status overlay — hanya badge existing dari data (Baru/Terpopuler) */}
      {badge && (
        <span
          className={`absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md ring-1 ring-black/10 ${
            badge.type === "hot"
              ? "bg-gradient-to-r from-red-500 to-red-600"
              : "bg-gradient-to-r from-emerald-500 to-green-600"
          }`}
          style={badge.type === "new" ? { animation: "gh-badge-pulse 2s ease-in-out infinite" } : undefined}
        >
          {badge.type === "hot" ? <Flame size={10} /> : <Sparkles size={10} />}
          {badge.text}
        </span>
      )}

      {game.status === "SOON" && (
        <span className="absolute right-2.5 top-2.5 inline-flex items-center rounded-full bg-slate-200/90 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-600 dark:bg-slate-800/90 dark:text-slate-400">
          Segera Hadir
        </span>
      )}
    </div>
  );

  // ── CONTENT AREA ──
  const content = (
    <>
      <div className="flex items-center gap-1.5">
        <h3
          className={`min-w-0 flex-1 text-[15px] font-extrabold leading-tight ${
            game.status === "SOON"
              ? "text-slate-700 dark:text-slate-300"
              : "text-slate-900 dark:text-white"
          }`}
        >
          {game.title}
        </h3>
        {/* P2.8 — lencana Premium untuk game premiumOnly (mis. Pendekar Suryakerta) */}
        {game.premiumOnly && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-950 shadow-sm">
            <Crown size={10} /> Premium
          </span>
        )}
      </div>
      <p
        className={`mt-0.5 line-clamp-2 text-[12px] leading-snug ${
          game.status === "SOON"
            ? "text-slate-500 dark:text-slate-500"
            : "text-slate-500 dark:text-[#7C7A9E]"
        }`}
      >
        {game.description}
      </p>

      {/* Meta: XP + durasi/pemain — data existing, presentasi saja */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:bg-amber-400/15 dark:text-amber-400">
          <Zap size={10} /> {game.xp}
        </span>
        <span
          className={`inline-flex min-w-0 items-center gap-1 truncate text-[10px] font-semibold ${
            game.status === "SOON"
              ? "text-slate-400 dark:text-slate-500"
              : "text-slate-500 dark:text-[#7C7A9E]"
          }`}
        >
          <Clock size={11} className="shrink-0" />
          <span className="truncate">
            {game.players} · {game.time}
          </span>
        </span>
      </div>
    </>
  );

  if (game.status === "SOON") {
    return (
      <div
        className="game-card-anim relative flex select-none flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 opacity-70 dark:border-[rgba(124,58,237,0.15)] dark:bg-[#12101F]"
        style={{ transitionDelay: `${Math.min(index, 6) * 20}ms` }}
      >
        {imageArea}
        <div className="flex flex-1 flex-col gap-1.5 p-4">{content}</div>
      </div>
    );
  }

  return (
    <Link
      href={game.href}
      onClick={() => onPlay?.(game.id)}
      className="game-card-anim group relative flex flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-[0.97] dark:border-[rgba(124,58,237,0.2)] dark:bg-[#16122A]"
      style={{ transitionDelay: `${Math.min(index, 6) * 20}ms` }}
      aria-label={`${game.title} — main sekarang`}
    >
      {imageArea}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {content}
        {/* CTA — span di dalam <Link>: seluruh kartu tetap dapat diklik (behavior lama) */}
        <span className="mt-2.5 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-2xl bg-violet-600 px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-wide text-white shadow-sm transition-all group-hover:bg-violet-700 group-hover:gap-2 active:scale-[0.97]">
          <Play size={13} fill="currentColor" /> MAIN SEKARANG
        </span>
      </div>
    </Link>
  );
}