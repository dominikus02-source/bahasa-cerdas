"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, ChevronRight, Crown, Loader2 } from "lucide-react";
import type { TeacherLeaderboardEntry, TeacherLeaderboardPeriod } from "@/lib/gamification/teacher-xp";

interface Data {
  entries: TeacherLeaderboardEntry[];
  myRank: number | null;
  myXp: number;
  participants: number;
  period: TeacherLeaderboardPeriod;
}

const MEDALS = ["bg-amber-400", "bg-slate-300", "bg-orange-300"];

function Skeleton() {
  return (
    <div className="rounded-3xl bg-white border border-amber-100 p-5 sm:p-6 shadow-lg shadow-amber-100/50 animate-pulse">
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

export function GuruLeaderboardCard() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let aktif = true;
    fetch("/api/guru/leaderboard?period=WEEKLY", { cache: "no-store" })
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
  }, []);

  if (error) return null;
  if (!data) return <Skeleton />;

  const top3 = data.entries.slice(0, 3);
  const gapTop3 =
    data.myRank != null && data.myRank > 3 && top3.length > 0
      ? Math.max(0, top3[top3.length - 1].xp - data.myXp)
      : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 sm:p-6 shadow-lg shadow-amber-100/50 ring-1 ring-amber-100">
      <div className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-amber-100/40" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200">
            <Trophy size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-amber-900 flex items-center gap-2">
              Kompetisi Guru
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold uppercase tracking-wide">
                Minggu Ini
              </span>
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm">Bersaing dengan guru lain lewat XP Guru</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-amber-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Posisi Anda</p>
            <p className="text-3xl font-extrabold text-gray-900">
              {data.myRank != null ? `#${data.myRank}` : "—"}
              <span className="text-sm font-medium text-gray-400 ml-1">
                {data.participants > 0 ? `dari ${data.participants} guru` : ""}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">XP Minggu Ini</p>
            <p className="text-2xl font-extrabold text-amber-600">{data.myXp.toLocaleString("id-ID")}</p>
            <p className="text-[10px] text-gray-400">XP Guru</p>
          </div>
        </div>

        {gapTop3 > 0 && (
          <p className="mt-3 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
            Butuh <span className="font-bold">{gapTop3.toLocaleString("id-ID")} XP</span> lagi untuk masuk 3 besar
          </p>
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
