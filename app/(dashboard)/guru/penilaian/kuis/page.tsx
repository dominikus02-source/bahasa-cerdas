"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

interface QuizSubmission {
  id: string;
  userId: string;
  status: string;
  score: number | null;
  submittedAt: string | null;
  user: { id: string; fullName: string; avatar?: string };
  answers: QuizAnswer[];
  assignment: { quiz: { title: string } };
}

interface QuizAnswer {
  id: string;
  quizQuestionId: string;
  answerText: string | null;
  answerIndex: number | null;
  isCorrect: boolean | null;
  pointsEarned: number;
  teacherComment: string | null;
  manuallyGraded: boolean;
  quizQuestion: { customText: string | null; customOptions: any; customAnswer: string | null; points: number };
}

export default function KuisGradingPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [groupId, setGroupId] = useState("");
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedSub, setSelectedSub] = useState<QuizSubmission | null>(null);
  const [grades, setGrades] = useState<Record<string, { isCorrect: boolean; points: number; comment: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const response = await fetchWithTimeout("/api/group");
      if (!response.ok) throw new Error("Unable to load groups");
      const data = await response.json();
      setGroups(data.groups || []);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const loadSubmissions = useCallback(async (gid: string) => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetchWithTimeout(`/api/guru/nilai/kuis-grade?groupId=${gid}`);
      if (!res.ok) throw new Error("Unable to load quiz submissions");
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (groupId) void loadSubmissions(groupId);
  }, [groupId, loadSubmissions]);

  const openGrading = (sub: QuizSubmission) => {
    setSelectedSub(sub);
    const g: Record<string, { isCorrect: boolean; points: number; comment: string }> = {};
    for (const a of sub.answers) {
      g[a.id] = {
        isCorrect: a.isCorrect ?? false,
        points: a.pointsEarned,
        comment: a.teacherComment || "",
      };
    }
    setGrades(g);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedSub) return;
    setSaving(true);
    const answers = Object.entries(grades).map(([quizAnswerId, g]) => ({
      quizAnswerId,
      isCorrect: g.isCorrect,
      pointsEarned: g.points,
      teacherComment: g.comment || null,
    }));

    const res = await fetch("/api/guru/nilai/kuis-grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: selectedSub.id, answers }),
    });

    if (res.ok) {
      setSaved(true);
      setSubmissions(prev => prev.filter(s => s.id !== selectedSub.id));
      setSelectedSub(null);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const pendingSubmissions = submissions.filter(s => s.status === "SUBMITTED");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/guru/penilaian" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} className="text-gray-500" />
        </Link>
        <div>
          <h1 className="font-bold text-lg text-gray-900">Penilaian Kuis Manual</h1>
          <p className="text-sm text-gray-500">Periksa jawaban essay dan beri nilai</p>
        </div>
      </div>

      <select value={groupId} onChange={e => setGroupId(e.target.value)}
        className="w-full max-w-md px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-emerald-200">
        <option value="">Pilih Kelas</option>
        {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.grade})</option>)}
      </select>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-7 h-7 border-[3px] border-emerald-500 border-t-transparent rounded-full" />
        </div>
      )}

      {loadError && !loading && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-gray-500">Data penilaian kuis belum bisa dimuat.</p>
          <button onClick={() => groupId ? void loadSubmissions(groupId) : void loadGroups()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Coba lagi</button>
        </div>
      )}

      {!loading && !loadError && groupId && !selectedSub && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <p className="font-semibold text-gray-700">Menunggu Penilaian: {pendingSubmissions.length} submission</p>
            </div>
            {pendingSubmissions.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400">Semua kuis sudah dinilai</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {pendingSubmissions.map(sub => (
                  <button key={sub.id} onClick={() => openGrading(sub)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-emerald-50/30 transition-colors text-left">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {sub.user.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{sub.user.fullName}</p>
                      <p className="text-xs text-gray-400 truncate">{sub.assignment?.quiz?.title || "Kuis"} — {sub.answers.length} jawaban</p>
                    </div>
                    <ChevronRightIcon />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Grading Panel */}
      {selectedSub && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {selectedSub.user.fullName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{selectedSub.user.fullName}</p>
                  <p className="text-xs text-gray-400">{selectedSub.assignment?.quiz?.title}</p>
                </div>
              </div>
              <button onClick={() => setSelectedSub(null)}
                className="text-xs text-gray-400 hover:text-gray-600">Kembali</button>
            </div>

            {selectedSub.answers.map((a, i) => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">Soal {i + 1}</span>
                  <span className="text-[10px] text-gray-400">{a.quizQuestion.points} poin</span>
                </div>
                <p className="text-sm font-medium text-gray-800 mb-3">
                  {a.quizQuestion.customText || `Soal #${a.quizQuestionId}`}
                </p>

                {a.answerText ? (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Jawaban Siswa:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.answerText}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-400">Pilihan: {a.answerIndex !== null ? a.quizQuestion.customOptions?.[a.answerIndex] : "—"}</p>
                    {a.quizQuestion.customAnswer && (
                      <p className="text-xs text-emerald-600 mt-1">Kunci: {a.quizQuestion.customAnswer}</p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={grades[a.id]?.isCorrect || false}
                      onChange={e => setGrades(prev => ({ ...prev, [a.id]: { ...prev[a.id], isCorrect: e.target.checked } }))}
                      className="rounded text-emerald-600 focus:ring-emerald-500" />
                    Benar
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Nilai:</span>
                    <input type="number" value={grades[a.id]?.points || 0}
                      onChange={e => setGrades(prev => ({ ...prev, [a.id]: { ...prev[a.id], points: parseInt(e.target.value) || 0 } }))}
                      min={0} max={a.quizQuestion.points}
                      className="w-14 text-center px-2 py-1 border border-gray-200 rounded-lg" />
                    <span className="text-gray-400">/{a.quizQuestion.points}</span>
                  </div>
                </div>
                <textarea value={grades[a.id]?.comment || ""}
                  onChange={e => setGrades(prev => ({ ...prev, [a.id]: { ...prev[a.id], comment: e.target.value } }))}
                  placeholder="Komentar guru (opsional)"
                  rows={1}
                  className="w-full mt-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none" />
              </div>
            ))}
          </div>

          <div className="lg:sticky lg:top-5">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 text-sm mb-4">Ringkasan</h3>
              {selectedSub.answers.map((a, i) => {
                const g = grades[a.id];
                return (
                  <div key={a.id} className="flex items-center justify-between text-xs py-1.5">
                    <span className="text-gray-500">Soal {i + 1}</span>
                    <span className={`font-semibold ${g?.isCorrect ? "text-emerald-600" : "text-red-500"}`}>
                      {g?.points || 0}/{a.quizQuestion.points}
                    </span>
                  </div>
                );
              })}
              <div className="border-t border-gray-100 mt-3 pt-3 flex items-center justify-between">
                <span className="font-semibold text-gray-700 text-sm">Total</span>
                <span className="font-bold text-emerald-600">
                  {Object.values(grades).reduce((sum, g) => sum + (g.points || 0), 0)}/{selectedSub.answers.reduce((sum, a) => sum + a.quizQuestion.points, 0)}
                </span>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full mt-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  : saved ? <Check size={16} /> : <Check size={16} />}
                {saved ? "Tersimpan!" : "Simpan Penilaian"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .chevron-icon { width: 18px; height: 18px; color: #9ca3af; flex-shrink: 0; }
      `}</style>
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="chevron-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
