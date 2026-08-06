"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, Loader2 } from "lucide-react";
import { BadgeIcon } from "@/components/gamification/BadgeIcon";
import { RARITY_META } from "@/lib/gamification/client-types";

interface BadgeView {
  id: string;
  code: string;
  name: string;
  icon: string;
  description: string;
  rarity: string;
  unlocked: boolean;
  awardedAt: string | null;
}

/** Halaman Lencana Guru — menampilkan BADGE GURU (guru-*), bukan badge murid. */
export default function GuruGameAchievementPage() {
  const [badges, setBadges] = useState<BadgeView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/player/badges", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat lencana");
      const data = await res.json();
      const guruBadges = (data.badges as BadgeView[]).filter((b) => b.code.startsWith("guru-"));
      setBadges(guruBadges);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unlocked = badges?.filter((b) => b.unlocked).length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50">
      <div className="bg-gradient-to-br from-emerald-600 via-green-700 to-teal-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-[100px]" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">
          <Link href="/guru/game" className="inline-flex items-center gap-1.5 text-emerald-200 text-sm hover:text-white transition-colors mb-4">
            <ArrowLeft size={16} /> Kembali ke Gim
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold">Lencana Guru</h1>
              <p className="text-emerald-200 text-sm">Badge guru dari aktivitas mengajar & bermain — bukan badge murid</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {!badges && !error ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat lencana...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        ) : badges && badges.length > 0 ? (
          <>
            <div className="mb-6 bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between">
              <p className="text-sm text-slate-600 font-medium">Lencana guru terbuka</p>
              <span className="text-2xl font-extrabold text-emerald-700">{unlocked}/{badges.length}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {badges.map((b) => {
                const meta = RARITY_META[b.rarity] ?? { label: "Guru", color: "#10B981" };
                return (
                  <div key={b.id} className={`bg-white rounded-2xl border p-4 text-center transition-all ${b.unlocked ? "border-emerald-100 shadow-sm" : "border-slate-100 opacity-80"}`}>
                    <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center bg-slate-50 ${b.unlocked ? "" : "grayscale"}`}>
                      <BadgeIcon icon={b.icon} size={48} alt={b.name} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-800">{b.name}</p>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{b.description}</p>
                    {b.unlocked ? (
                      <span className="mt-2 inline-block text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: meta.color }}>
                        TERBUKA
                      </span>
                    ) : (
                      <span className="mt-2 inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                        TERKUNCI
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Belum ada lencana guru</p>
            <p className="text-xs text-slate-400 mt-1">Aktivitas mengajar dan bermain di Gim Guru akan membuka lencana.</p>
            <Link href="/guru/game" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors">
              Buka Gim Guru
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}