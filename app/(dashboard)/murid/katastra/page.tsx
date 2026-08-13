"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Flame, Zap, Trophy, Swords, Puzzle, Star, Shield, ChevronRight, Play, Users, TrendingUp, Sparkles, Medal, Gem, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getLevelProgress } from "@/lib/gamification/levels";
import { rankFromLevel, RANK_META } from "@/lib/gamification/ranks";
import { RankChip } from "@/components/gamification/RankChip";

// Liga 4 tingkat dihapus — memakai 9 rank resmi (RANK_META).

const MODES = [
  {
    id: "dash",
    title: "Lari Kata",
    desc: "Jawab secepat mungkin! 60 detik, 20 soal, kumpulkan Poin Pengalaman sebanyak-banyaknya.",
    icon: Zap,
    color: "from-violet-500 to-purple-600",
    href: "/murid/katastra/dash",
    players: "Solo",
    time: "~3 menit",
  },
  {
    id: "duel",
    title: "Duel Kata",
    desc: "Hadang temanmu dalam adu cepat menjawab soal Bahasa Indonesia real-time!",
    icon: Swords,
    color: "from-orange-500 to-red-600",
    href: "#",
    players: "2 Pemain",
    time: "~5 menit",
    comingSoon: true,
  },
  {
    id: "puzzle",
    title: "Teka-teki Makna",
    desc: "Tebak hubungan 16 kata dalam 4 grup. Teka-teki harian yang bikin penasaran!",
    icon: Puzzle,
    color: "from-emerald-500 to-teal-600",
    href: "#",
    players: "Solo",
    time: "~5 menit",
    comingSoon: true,
  },
];

const DAILY_REWARDS = [
  { day: 1, reward: "50 PP" },
  { day: 2, reward: "75 PP" },
  { day: 3, reward: "100 PP", bonus: "Kotak Misteri" },
  { day: 4, reward: "150 PP" },
  { day: 5, reward: "200 PP", bonus: "Bingkai Langka" },
  { day: 6, reward: "250 PP" },
  { day: 7, reward: "500 PP", bonus: "Gelar Legendaris" },
];

export default function KataStraPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/katastra/daily")
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const streak = data?.streak || 0;
  const xp = data?.xp || 0;
  // Level, rank, dan kurva XP dari sumber resmi. Halaman ini dulu memakai
  // kurva ketiga sendiri (level*level*100) yang tidak cocok dengan mana pun.
  const progress = getLevelProgress(xp);
  const level = progress.level;
  const rank = rankFromLevel(level);
  const meta = RANK_META[rank];
  const xpNext = progress.needed;
  const xpProgress = progress.pct * 100;
  const playedToday = data?.playedToday || false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-violet-950 to-slate-900 text-white">
      {/* Header */}
      <div className="relative overflow-hidden px-4 pt-6 pb-8 bg-gradient-to-br from-violet-600 via-violet-700 to-purple-900">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-400/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px]" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-extrabold flex items-center gap-2">
                <Sparkles className="text-yellow-300" size={24} />
                KataStra
              </h1>
              <p className="text-violet-200 text-xs mt-0.5">Taklukkan Kata, Kuasai Bahasa!</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/murid/game" className="text-xs text-violet-200 underline hover:text-white">
                Semua Gim
              </Link>
            </div>
          </div>

          {/* Level & XP Card */}
          <div className="bg-white bg-white/10 dark:bg-slate-900/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-lg font-bold shadow-lg">
                  {level}
                </div>
                <div>
                  <p className="font-bold text-sm">Tingkat {level}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <RankChip rank={rank} size={12} showTitle={false} compact />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Flame size={18} className={streak > 0 ? "text-orange-400" : "text-white/30"} />
                <span className={`font-bold text-lg ${streak > 0 ? "text-orange-400" : "text-white/50"}`}>{streak}</span>
              </div>
            </div>
            <div className="h-2.5 bg-white bg-white/10 dark:bg-slate-900/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-400 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-violet-200 mt-1">
              <span>{xp.toLocaleString()} PP</span>
              <span>{xpNext.toLocaleString()} PP</span>
            </div>
          </div>

          {/* Daily Streak */}
          <div className="bg-white bg-white/10 dark:bg-slate-900/10 backdrop-blur-md border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-violet-200 flex items-center gap-1">
                <Flame size={14} className="text-orange-400" /> Rentetan Harian
              </p>
              {playedToday ? (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full font-medium"><Check className="w-3 h-3" /> Selesai</span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full font-medium animate-pulse">Main sekarang!</span>
              )}
            </div>
            <div className="flex justify-between gap-1">
              {DAILY_REWARDS.map((r, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < streak ? "bg-yellow-400 text-yellow-900 shadow-md" : i === streak && !playedToday
                      ? "bg-violet-400 text-white ring-2 ring-violet-300 animate-pulse" : "bg-white bg-white/10 dark:bg-slate-900/10 text-white/30"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="text-center">
                    <p className={`text-[8px] leading-tight font-medium ${i <= streak ? "text-violet-200" : "text-white/30"}`}>
                      {r.reward}
                    </p>
                    {r.bonus && (
                      <p className={`text-[7px] leading-tight ${i <= streak ? "text-yellow-300" : "text-white/20"}`}>
                        +{r.bonus}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Game Modes */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Play size={18} className="text-violet-400" /> Pilih Mode
          </h2>
          <Link href="/api/katastra/leaderboard" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
            <Trophy size={14} /> Papan Skor
          </Link>
        </div>

        {MODES.map((mode) => (
          <Link
            key={mode.id}
            href={mode.comingSoon ? "#" : mode.href}
 className={`block bg-white bg-white/5 dark:bg-slate-900/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:bg-white bg-white/10 transition-all ${
              mode.comingSoon ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-lg shrink-0`}>
                <mode.icon size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm">{mode.title}</h3>
                  {mode.comingSoon && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-violet-500/30 text-violet-300 rounded-full font-medium">SEGERA</span>
                  )}
                </div>
                <p className="text-xs text-violet-200/70 mt-1 line-clamp-2">{mode.desc}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-violet-300/50 flex items-center gap-1">
                    <Users size={10} /> {mode.players}
                  </span>
                  <span className="text-[10px] text-violet-300/50">{mode.time}</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-violet-400/50 mt-1" />
            </div>
          </Link>
        ))}

        {/* Stats Quick View */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-white bg-white/5 dark:bg-slate-900/5 border border-white/10 rounded-xl p-3">
            <TrendingUp size={16} className="text-violet-400 mb-1" />
            <p className="text-xs text-violet-200/60">Poin Pengalaman Hari Ini</p>
            <p className="text-lg font-bold">{loading ? "..." : xp}</p>
          </div>
          <div className="bg-white bg-white/5 dark:bg-slate-900/5 border border-white/10 rounded-xl p-3">
            <Trophy size={16} className="text-yellow-400 mb-1" />
            <p className="text-xs text-violet-200/60">Peringkat</p>
            <p className="text-lg font-bold">{meta.label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
