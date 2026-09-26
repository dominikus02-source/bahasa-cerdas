"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Crown, Loader2 } from "lucide-react";
import type { TeacherLeaderboardEntry, TeacherLeaderboardPeriod } from "@/lib/gamification/teacher-xp";

interface Data {
  entries: TeacherLeaderboardEntry[];
  myRank: number | null;
  period: TeacherLeaderboardPeriod;
}

const PERIOD_TABS: { value: TeacherLeaderboardPeriod; label: string }[] = [
  { value: "ALL_TIME", label: "Semua Waktu" },
  { value: "WEEKLY", label: "Minggu Ini" },
  { value: "SEASON", label: "Season" },
];

export default function GuruGameLeaderboardPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<TeacherLeaderboardPeriod>("ALL_TIME");

  const load = useCallback(async (p: TeacherLeaderboardPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/guru/leaderboard?period=${p}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat peringkat guru");
      const d = await res.json();
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [load, period]);

  return (
    <div className="min-h-screen bg-[#f5f8fc] dark:bg-[#061426]">
      <div className="bc-guru-hero text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-[100px]" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">
          <Link href="/guru/game" className="inline-flex items-center gap-1.5 text-blue-100 text-sm hover:text-white transition-colors mb-4">
            <ArrowLeft size={16} /> Kembali ke Gim
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold">Peringkat Guru</h1>
              <p className="text-blue-100 text-sm">Papan peringkat guru — dihitung dari XP Guru (bukan XP murid)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 mb-6 w-fit">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setPeriod(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                period === tab.value
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat peringkat...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        ) : data && data.entries.length > 0 ? (
          <>
            {data.myRank != null && data.myRank > 20 && (
              <div className="mb-6 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                <p className="text-sm text-emerald-800 font-medium">Peringkat Anda saat ini</p>
                <span className="text-2xl font-extrabold text-emerald-700">#{data.myRank}</span>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs">Guru</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">Xp Guru</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entries.map((e, i) => {
                      const podium = i === 0;
                      return (
                        <tr key={e.userId} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${podium ? "bg-amber-50/50" : ""}`}>
                          <td className="px-4 py-3">
                            {i === 0 ? (
                              <Crown className="w-4 h-4 text-amber-500" />
                            ) : (
                              <span className="font-bold text-slate-500 text-xs">{i + 1}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                                {e.fullName?.charAt(0) || "G"}
                              </div>
                              <span className="font-medium text-slate-700 text-xs">{e.fullName || "Guru"}</span>
                              {e.streak > 0 && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-orange-50 text-orange-500 rounded-full font-semibold">🔥 {e.streak}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-emerald-600">{e.xp.toLocaleString("id-ID")} XP</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Belum ada peringkat guru</p>
            <p className="text-xs text-slate-400 mt-1">Kumpulkan XP Guru lewat gim, mengirim tugas, membuat pengumuman, atau menerbitkan artikel & puisi.</p>
            <Link href="/guru/game" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors">
              Buka Gim Guru
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}