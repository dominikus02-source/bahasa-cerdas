"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, ChevronRight, Crown, Flame } from "lucide-react";
import type { TeacherLeaderboardEntry, TeacherLeaderboardPeriod } from "@/lib/gamification/teacher-xp";
import type { MisiGuruStatus } from "@/lib/guru/misi-guru-status";

interface Data {
  entries: TeacherLeaderboardEntry[];
  myRank: number | null;
  myXp: number;
  participants: number;
  period: TeacherLeaderboardPeriod;
}

const MEDALS = ["bg-amber-400", "bg-slate-300", "bg-orange-300"];

const PERIODS: { value: TeacherLeaderboardPeriod; label: string }[] = [
  { value: "WEEKLY", label: "Minggu Ini" },
  { value: "SEASON", label: "Season" },
  { value: "ALL_TIME", label: "Semua Waktu" },
];

const PERIOD_XP_LABEL: Record<TeacherLeaderboardPeriod, string> = {
  WEEKLY: "XP Minggu Ini",
  SEASON: "XP Season",
  ALL_TIME: "XP Semua Waktu",
};

function Skeleton() {
  return (
    <div className="rounded-3xl bg-white border border-amber-100 p-5 sm:p-6 shadow-lg  animate-pulse">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-amber-100" />
        <div className="space-y-2">
          <div className="h-5 bg-amber-100 rounded w-44" />
          <div className="h-3.5 bg-amber-50 rounded w-56" />
        </div>
      </div>
      <div className="h-24 rounded-2xl bg-amber-50 mb-4" />
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded-xl bg-amber-50" />
        ))}
      </div>
    </div>
  );
}

export function GuruLeaderboardCard({
  misiStatus = null,
}: {
  misiStatus?: MisiGuruStatus | null;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<TeacherLeaderboardPeriod>("WEEKLY");

  useEffect(() => {
    let aktif = true;
    setError(false);
    fetch(`/api/guru/leaderboard?period=${period}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res) => {
        if (aktif) setData(res);
      })
      .catch(() => {
        if (aktif) setError(true);
      });
    return () => {
      aktif = false;
    };
  }, [period]);

  if (error) return null;
  if (!data) return <Skeleton />;

  const top3 = data.entries.slice(0, 3);
  const periodeLabel =
    PERIODS.find((p) => p.value === data.period)?.label ?? "periode ini";

  // Gap ke peringkat tepat di atas saya (entries urut menurun, terpotong 20).
  const gapNext = (() => {
    if (data.myRank == null || data.entries.length === 0) return null;
    if (data.myRank === 1) return null;
    const idxDiAtas = data.myRank - 2;
    if (idxDiAtas >= 0 && idxDiAtas < data.entries.length) {
      return {
        xp: Math.max(0, data.entries[idxDiAtas].xp - data.myXp),
        rank: data.myRank - 1,
      };
    }
    // Saya di luar 20 besar → target masuk 20 besar (posisi terakhir entry).
    const batas = data.entries[data.entries.length - 1];
    return { xp: Math.max(0, batas.xp - data.myXp), rank: data.entries.length };
  })();

  const levelPersen =
    misiStatus && misiStatus.xpPerLevel > 0
      ? Math.round((misiStatus.xpLevel / misiStatus.xpPerLevel) * 100)
      : 0;

  return (
    <div className="bc-guru-card relative overflow-hidden rounded-3xl p-5 sm:p-6">
      <div className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-amber-100/40" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200">
            <Trophy size={24} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-amber-900 flex items-center gap-2">
              Kompetisi Guru
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm">Bersaing dengan guru lain lewat XP Guru</p>
          </div>
          <div
            className="flex items-center gap-1 bg-white/70 border border-amber-100 rounded-xl p-1 shrink-0"
            role="group"
            aria-label="Pilih periode peringkat"
          >
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                aria-pressed={period === p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                  period === p.value
                    ? "bg-amber-500 text-white shadow"
                    : "text-amber-700 hover:bg-amber-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-amber-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Posisi Anda</p>
            <p className="text-3xl font-extrabold text-gray-900">
              #{data.myRank != null ? data.myRank : "—"}
              <span className="text-sm font-medium text-gray-400 ml-1">
                {data.participants > 0 ? `dari ${data.participants} guru` : ""}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">
              {PERIOD_XP_LABEL[data.period]}
            </p>
            <p className="text-2xl font-extrabold text-amber-600">{data.myXp.toLocaleString("id-ID")}</p>
            <p className="text-[10px] text-gray-400">XP Guru</p>
          </div>
        </div>

        {gapNext && gapNext.xp > 0 ? (
          <p className="mt-3 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
            Butuh <span className="font-bold">{gapNext.xp.toLocaleString("id-ID")} XP</span> lagi untuk
            melewati peringkat #{gapNext.rank}
          </p>
        ) : data.myRank === 1 && data.participants > 0 ? (
          <p className="mt-3 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
            🏆 Anda memimpin {periodeLabel} — pertahankan!
          </p>
        ) : data.myXp === 0 ? (
          <p className="mt-3 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
            Ayo mulai! Kumpulkan XP Guru lewat misi, gim, atau berkarya untuk naik peringkat.
          </p>
        ) : null}

        {misiStatus && (
          <div className="mt-3 rounded-2xl bg-white border border-emerald-100 p-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <Flame size={14} className="text-orange-400" />
              <span className="text-xs font-bold text-orange-500">{misiStatus.streak}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                <span>Level Guru Cerdas</span>
                <span>Level {misiStatus.level}</span>
              </div>
              <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-500"
                  style={{ width: `${levelPersen}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {top3.map((e, i) => (
            <div key={e.userId} className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2">
              <span className={`w-7 h-7 rounded-full ${MEDALS[i] ?? "bg-amber-100"} flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0`}>
                {i === 0 ? <Crown size={13} /> : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{e.fullName || "Guru"}</p>
              </div>
              <span className="text-xs font-bold text-gray-500 shrink-0">{e.xp.toLocaleString("id-ID")} XP</span>
            </div>
          ))}
        </div>

        <Link
          href="/guru/game/leaderboard"
          className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-xl px-3 py-2.5 transition-colors"
        >
          Lihat Peringkat Lengkap <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}
