"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { MISI_GURU } from "@/lib/guru/misi-guru";
import type { MisiGuruStatus } from "@/lib/guru/misi-guru-status";
import { MissionItem } from "@/components/guru/misi/MissionItem";
import { MissionProgress } from "@/components/guru/misi/MissionProgress";
import { LevelCard } from "@/components/guru/misi/LevelCard";
import { RewardCard } from "@/components/guru/misi/RewardCard";

function Skeleton() {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 sm:p-6 text-white shadow-xl shadow-emerald-600/20 border border-emerald-500/30 animate-pulse">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-white/20" />
        <div className="space-y-2">
          <div className="h-5 bg-white/20 rounded w-48" />
          <div className="h-3.5 bg-white/15 rounded w-64" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="h-20 rounded-2xl bg-white/10" />
        <div className="h-20 rounded-2xl bg-white/10" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-white/10" />
        ))}
      </div>
    </div>
  );
}

export function GuruMissionCard() {
  const [status, setStatus] = useState<MisiGuruStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let aktif = true;
    fetch("/api/guru/misi")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res) => {
        if (aktif && res?.data) setStatus(res.data);
      })
      .catch(() => {
        if (aktif) setError(true);
      });
    return () => {
      aktif = false;
    };
  }, []);

  if (error) return null;
  if (!status) return <Skeleton />;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 sm:p-6 text-white shadow-xl shadow-emerald-600/20 border border-emerald-500/30">
      <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-white/5" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg">
            <Sparkles size={24} className="text-amber-300" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              Misi Guru Cerdas
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-amber-400/20 text-amber-200 rounded-full font-semibold uppercase tracking-wide">
                Mingguan
              </span>
            </h2>
            <p className="text-emerald-100/90 text-xs sm:text-sm">
              Selesaikan misi minggu ini dan kumpulkan XP
            </p>
          </div>
        </div>

        <LevelCard
          level={status.level}
          xpLevel={status.xpLevel}
          xpPerLevel={status.xpPerLevel}
          streak={status.streak}
        />

        <div className="mt-4">
          <MissionProgress
            selesai={status.totalSelesai}
            total={status.totalMisi}
            xp={status.xp}
            xpMax={status.xpMax}
          />
        </div>

        <div className="mt-4 space-y-2.5">
          {MISI_GURU.map((m) => {
            const misi = status.misi.find((x) => x.id === m.id);
            return (
              <MissionItem
                key={m.id}
                label={m.label}
                desc={m.desc}
                xp={m.xp}
                done={misi?.selesai ?? false}
                href={m.href}
                icon={m.icon}
                iconBg={m.iconBg}
              />
            );
          })}
        </div>

        {status.semuaSelesai && (
          <div className="mt-4">
            <RewardCard xp={status.xp} />
          </div>
        )}
      </div>
    </div>
  );
}
