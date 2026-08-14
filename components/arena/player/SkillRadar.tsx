"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";

interface Skill {
  skill: string;
  level: number;
  xp: number;
}

interface SkillsResponse {
  skills: Skill[];
}

const SKILL_LABELS: Record<string, string> = {
  READING: "Membaca",
  WRITING: "Menulis",
  LISTENING: "Mendengarkan",
  SPEAKING: "Berbicara",
  GRAMMAR: "Tata Bahasa",
  VOCABULARY: "Kosakata",
  LITERATURE: "Sastra",
};

/** Kartu peta kemampuan berbahasa — level per skill + highlight skill terlemah. */
export default function SkillRadar({
  className = "",
  limit = 7,
}: {
  className?: string;
  limit?: number;
}) {
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    (async () => {
      try {
        const res = await fetch("/api/player/skills");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SkillsResponse;
        if (active) setSkills(data.skills ?? []);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt]);

  if (failed) {
    return (
      <div className={`rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800/90 p-5 text-center ${className}`}>
        <BarChart3 size={28} className="mx-auto text-violet-300" />
        <p className="mt-2 text-sm font-bold text-gray-800 dark:text-slate-200">Belum bisa memuat kemampuanmu.</p>
        <button
          type="button"
          onClick={() => setAttempt((a) => a + 1)}
          className="mt-3 rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (loading || !skills) {
    return (
      <div className={`animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/70 p-4 ${className}`}>
        <div className="mb-4 h-4 w-40 rounded bg-slate-200" />
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="h-2 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const list = skills.slice(0, Math.max(1, limit));

  if (list.length === 0) {
    return (
      <div className={`rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800/90 p-5 text-center ${className}`}>
        <BarChart3 size={28} className="mx-auto text-violet-300" />
        <p className="mt-2 text-sm font-bold text-gray-800 dark:text-slate-200">Kemampuan Bahasamu</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-400">
          Belum ada data kemampuan. Mulai belajar di Jalur Cerdas untuk memetakan kekuatanmu!
        </p>
      </div>
    );
  }

  const weakest = list.reduce((min, s) => (s.level < min.level ? s : min), list[0]);

  return (
    <div className={`rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800/90 p-4 md:p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
          <BarChart3 size={16} />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Kemampuan Bahasamu</h3>
      </div>

      <div className="space-y-3">
        {list.map((s) => {
          const isWeakest = s.skill === weakest.skill;
          const label = SKILL_LABELS[s.skill.toUpperCase()] ?? capitalize(s.skill);
          const pct = Math.min(100, Math.max(0, Math.round(s.level)));
          return (
            <div key={s.skill}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className={`font-semibold ${isWeakest ? "text-amber-600" : "text-gray-700 dark:text-slate-300"}`}>{label}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {isWeakest && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      Perlu latihan
                    </span>
                  )}
                  <span className={isWeakest ? "font-bold text-amber-600 dark:text-amber-400" : "font-bold text-violet-600 dark:text-violet-400"}>{s.level}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800/80">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isWeakest
                      ? "bg-gradient-to-r from-amber-400 to-orange-500"
                      : "bg-gradient-to-r from-violet-500 to-purple-600"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
