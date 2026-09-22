"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { BarChart3, TrendingUp, Target, Flame, Star, BookOpen } from "lucide-react";
import type { LearnerSkillState } from "@/lib/learner-state/types";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

const SKILL_LABELS: Record<string, string> = {
  READING: "Membaca",
  WRITING: "Menulis",
  LISTENING: "Mendengarkan",
  SPEAKING: "Berbicara",
  GRAMMAR: "Tata Bahasa",
  VOCABULARY: "Kosakata",
  LITERATURE: "Sastra",
};

const SKILL_ICONS: Record<string, typeof BookOpen> = {
  READING: BookOpen,
  WRITING: BookOpen,
  LISTENING: BookOpen,
  SPEAKING: BookOpen,
  GRAMMAR: BookOpen,
  VOCABULARY: BookOpen,
  LITERATURE: BookOpen,
};

const TREND_LABELS: Record<string, string> = {
  IMPROVING: "Meningkat",
  STABLE: "Stabil",
  DECLINING: "Perlu perhatian",
  INSUFFICIENT_DATA: "Belum cukup data",
};

const MASTERY_LABELS: Record<string, string> = {
  NO_DATA: "Belum ada data",
  NOT_ENOUGH_EVIDENCE: "Perlu lebih banyak latihan",
  DEVELOPING: "Sedang berkembang",
  PROFICIENT: "Menguasai",
};

export default function ProgresPage() {
  const [skills, setSkills] = useState<LearnerSkillState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout("/api/player/learner-state");
      if (!res.ok) throw new Error("Gagal memuat data");
      const data = await res.json();
      setSkills(data.skills || []);
    } catch {
      setError("Gagal memuat data kemampuan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSkills();
  }, [fetchSkills]);

  // Filter skills with evidence
  const skillsWithEvidence = skills.filter((s) => s.attemptCount >= 3 && s.accuracy !== null);
  const hasEvidence = skillsWithEvidence.length > 0;

  // Calculate stats from real data
  const totalAttempts = skills.reduce((sum, s) => sum + s.attemptCount, 0);
  const totalCorrect = skills.reduce((sum, s) => sum + s.correctCount, 0);
  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  // Find strongest and weakest
  const strongestSkill = hasEvidence
    ? skillsWithEvidence.sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))[0]
    : null;
  const weakestSkill = hasEvidence
    ? skillsWithEvidence.sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))[0]
    : null;

  // Count skills by trend
  const improvingCount = skills.filter((s) => s.trend === "IMPROVING").length;
  const decliningCount = skills.filter((s) => s.trend === "DECLINING").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Progresku</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Pantau perjalanan belajarmu</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-10 w-10 rounded-lg bg-slate-200" />
              <div className="mt-2 h-4 w-20 rounded bg-slate-200" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Progresku</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Pantau perjalanan belajarmu</p>
        </div>
        <Card className="p-6 text-center">
          <p className="text-sm text-gray-500">{error}</p>
          <p className="mt-2 text-xs text-gray-400">Coba beberapa saat lagi.</p>
          <button onClick={() => void fetchSkills()} className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">Coba lagi</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Progresku</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Pantau perjalanan belajarmu</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">{totalAttempts}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Soal Dijawab</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">{overallAccuracy}%</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Akurasi</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">{skillsWithEvidence.length}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Skill Terukur</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">{improvingCount}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Meningkat</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Skill Overview */}
      {hasEvidence ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Skill Progress */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-violet-500" />
              <h2 className="font-semibold">Kemampuan</h2>
            </div>
            <div className="space-y-4">
              {skillsWithEvidence.slice(0, 5).map((skill) => (
                <div key={skill.skill}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{SKILL_LABELS[skill.skill] || skill.skill}</span>
                    <span className="text-sm text-gray-500">{Math.round((skill.accuracy ?? 0) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${(skill.accuracy ?? 0) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-400">{TREND_LABELS[skill.trend]}</span>
                    <span className="text-[10px] text-gray-400">{skill.attemptCount} soal</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Insights */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star size={18} className="text-amber-500" />
              <h2 className="font-semibold">Insight</h2>
            </div>
            <div className="space-y-4">
              {/* Strongest Skill */}
              {strongestSkill && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                    💪 Kekuatan
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">{SKILL_LABELS[strongestSkill.skill]}</span> adalah
                    kemampuan terkuatmu ({Math.round((strongestSkill.accuracy ?? 0) * 100)}%)
                  </p>
                </div>
              )}

              {/* Weakest Skill */}
              {weakestSkill && weakestSkill.skill !== strongestSkill?.skill && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                    🎯 Fokus Latihan
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">{SKILL_LABELS[weakestSkill.skill]}</span> masih bisa
                    berkembang ({Math.round((weakestSkill.accuracy ?? 0) * 100)}%)
                  </p>
                </div>
              )}

              {/* Trend Summary */}
              {improvingCount > 0 && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">📈 Perkembangan</p>
                  <p className="text-sm">
                    {improvingCount} skill menunjukkan perkembangan positif
                  </p>
                </div>
              )}

              {/* Declining Warning */}
              {decliningCount > 0 && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">⚠️ Perlu Perhatian</p>
                  <p className="text-sm">
                    {decliningCount} skill perlu perhatian lebih
                  </p>
                </div>
              )}

              {/* Overall Status */}
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">📊 Status Umum</p>
                <p className="text-sm">
                  {overallAccuracy >= 70
                    ? "Terus bertumbuh! Kemampuanmu sudah cukup baik."
                    : overallAccuracy >= 50
                      ? "Mulai menguat. Terus berlatih!"
                      : "Terus berlatih. Kami sedang mengenali pola belajarmu."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        /* No Evidence State */
        <Card className="p-6 text-center">
          <BarChart3 size={32} className="mx-auto text-gray-300 dark:text-gray-600" />
          <h3 className="mt-3 font-semibold text-gray-700 dark:text-gray-300">Mulai Belajar</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Mulai beberapa latihan dulu. Setelah kami mengenal pola belajarmu, perkembanganmu akan terlihat di
            sini.
          </p>
          <a
            href="/arena/jalur-cerdas"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-colors"
          >
            Mulai Latihan
            <span className="text-xs">→</span>
          </a>
        </Card>
      )}
    </div>
  );
}
