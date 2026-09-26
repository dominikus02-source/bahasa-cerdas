"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { MISI_GURU } from "@/lib/guru/misi-guru";
import type { MisiGuruStatus } from "@/lib/guru/misi-guru-status";
import { nextActionMisiId } from "@/lib/guru/next-action";
import { MissionItem } from "@/components/guru/misi/MissionItem";
import { MissionProgress } from "@/components/guru/misi/MissionProgress";
import { LevelCard } from "@/components/guru/misi/LevelCard";
import { RewardCard } from "@/components/guru/misi/RewardCard";

function Skeleton() {
  return (
    <div className="rounded-3xl bg-white border border-blue-100 p-5 sm:p-6 shadow-lg shadow-blue-100/40 animate-pulse">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-blue-100" />
        <div className="space-y-2">
          <div className="h-5 bg-blue-100 rounded w-48" />
          <div className="h-3.5 bg-blue-50 rounded w-64" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="h-20 rounded-2xl bg-blue-50" />
        <div className="h-20 rounded-2xl bg-blue-50" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-blue-50" />
        ))}
      </div>
    </div>
  );
}

export function GuruMissionCard({
  compact = false,
  status: externalStatus = null,
  external = false,
}: {
  compact?: boolean;
  status?: MisiGuruStatus | null;
  external?: boolean;
}) {
  const [internalStatus, setInternalStatus] = useState<MisiGuruStatus | null>(null);
  const [error, setError] = useState(false);
  const status = external ? externalStatus : internalStatus;

  useEffect(() => {
    if (external) return; // status dari induk — tanpa fetch duplikat
    let aktif = true;
    fetch("/api/guru/misi")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res) => {
        if (aktif && res?.data) setInternalStatus(res.data);
      })
      .catch(() => {
        if (aktif) setError(true);
      });
    return () => {
      aktif = false;
    };
  }, [external]);

  if (error) return null;
  if (!status) return <Skeleton />;

  const nextMisiId = nextActionMisiId(status);
  const urutanMisi = [...MISI_GURU].sort((a, b) => {
    const sa = status.misi.find((x) => x.id === a.id)?.selesai ?? false;
    const sb = status.misi.find((x) => x.id === b.id)?.selesai ?? false;
    if (sa !== sb) return sa ? 1 : -1; // misi belum selesai tampil lebih dulu
    return 0;
  });

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 sm:p-6 shadow-lg shadow-blue-100/40 ring-1 ring-emerald-100">
      <div className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-blue-100/40" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-sky-100/30" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="bc-guru-icon w-12 h-12 rounded-2xl flex items-center justify-center">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Misi Guru Cerdas
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-blue-100 text-emerald-700 rounded-full font-semibold uppercase tracking-wide">
                Mingguan
              </span>
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm">
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

        <div className={`mt-4 ${compact ? "grid grid-cols-1 sm:grid-cols-2 gap-2.5" : "space-y-2.5"}`}>
          {urutanMisi.map((m) => {
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
                highlight={nextMisiId === m.id}
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
