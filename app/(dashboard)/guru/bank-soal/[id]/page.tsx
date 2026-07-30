"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, TrendingUp, Users, Send,
  BookOpen, Check, X, BarChart3, Target,
  Trophy, ChevronDown, ChevronUp,
} from "lucide-react";

type QuestionStat = {
  questionId: string;
  orderIndex: number;
  text: string;
  options: string[];
  correctAnswer: string | null;
  explanation: string | null;
  total: number;
  correct: number;
  correctRate: number;
  wrongRate: number;
  optionCounts: Record<string, number>;
};

type ClassStat = {
  groupId: string;
  groupName: string;
  totalSiswa: number;
  avgScore: number;
  lulus: number;
  tingkatKelulusan: number;
  ranking: { userId: string; nama: string; avatar: string | null; score: number; waktu: string }[];
};

type QuizInfo = {
  id: string;
  title: string;
  description: string | null;
  topik: string | null;
  kelas: string | null;
  difficulty: string | null;
  totalSoal: number;
  totalAssignments: number;
  totalSubmitted: number;
  rataKelas: number;
  persenBenar: number;
};

export default function LatihanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [questionStats, setQuestionStats] = useState<QuestionStat[]>([]);
  const [tersulit, setTersulit] = useState<QuestionStat[]>([]);
  const [termudah, setTermudah] = useState<QuestionStat[]>([]);
  const [classStats, setClassStats] = useState<ClassStat[]>([]);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/guru/latihan/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.quiz) setQuiz(data.quiz);
        if (data.questionStats) setQuestionStats(data.questionStats);
        if (data.tersulit) setTersulit(data.tersulit);
        if (data.termudah) setTermudah(data.termudah);
        if (data.classStats) setClassStats(data.classStats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Latihan tidak ditemukan</p>
        <Button onClick={() => router.push("/guru/bank-soal")} className="mt-4">
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/guru/bank-soal")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-600 transition-colors"
      >
        <ArrowLeft size={16} /> Kembali ke Bank Soal
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            {quiz.topik && <span>{quiz.topik}</span>}
            {quiz.kelas && <><span>·</span><span>Kelas {quiz.kelas}</span></>}
            <span>·</span>
            <span>{quiz.totalSoal} soal</span>
          </div>
        </div>
        <Button onClick={() => router.push("/guru/bank-soal")} variant="outline">
          <Send size={16} className="mr-1.5" /> Kirim Ulang
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Send size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{quiz.totalAssignments}</p>
              <p className="text-xs text-gray-500">Kelas Dikirimi</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
              <Users size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{quiz.totalSubmitted}</p>
              <p className="text-xs text-gray-500">Murid Selesai</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              quiz.rataKelas >= 70 ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
            }`}>
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{quiz.rataKelas}%</p>
              <p className="text-xs text-gray-500">Rata-rata Kelas</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Target size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{quiz.persenBenar}%</p>
              <p className="text-xs text-gray-500">Persentase Benar</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Soal Tersulit & Termudah */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <span className="text-red-500">🔥</span> Soal Tersulit
          </h3>
          {tersulit.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {tersulit.map((q, i) => (
                <div key={q.questionId} className="p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-red-600">{i + 1}</span>
                    <span className="text-xs text-red-500">{q.correctRate}% benar</span>
                  </div>
                  <p className="text-sm text-gray-900 line-clamp-2">{q.text}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <span className="text-green-500">⭐</span> Soal Termudah
          </h3>
          {termudah.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {termudah.map((q, i) => (
                <div key={q.questionId} className="p-3 rounded-lg bg-green-50 border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-green-600">{i + 1}</span>
                    <span className="text-xs text-green-500">{q.correctRate}% benar</span>
                  </div>
                  <p className="text-sm text-gray-900 line-clamp-2">{q.text}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Per-Class Stats */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Trophy size={18} className="text-amber-500" /> Statistik per Kelas
        </h3>
        {classStats.length === 0 ? (
          <p className="text-sm text-gray-400">Latihan belum dikirim ke kelas mana pun</p>
        ) : (
          <div className="space-y-3">
            {classStats.map((cs) => {
              const isExpanded = expandedClass === cs.groupId;
              return (
                <div key={cs.groupId} className="rounded-xl border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setExpandedClass(isExpanded ? null : cs.groupId)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-xs">
                        {cs.groupName.charAt(0)}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm text-gray-900">{cs.groupName}</p>
                        <p className="text-xs text-gray-400">{cs.totalSiswa} murid</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-sm">{cs.avgScore}%</p>
                        <p className="text-[10px] text-gray-400">rata-rata</p>
                      </div>
                      <Badge className={`text-xs px-2 py-0.5 ${
                        cs.tingkatKelulusan >= 70 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {cs.tingkatKelulusan}% lulus
                      </Badge>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-3 pb-3 pt-2">
                      {cs.ranking.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">Belum ada yang mengerjakan</p>
                      ) : (
                        <div className="space-y-1">
                          {cs.ranking.map((r, i) => (
                            <div key={r.userId} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50">
                              <span className={`w-5 text-center text-xs font-bold ${
                                i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-300"
                              }`}>
                                {i + 1}
                              </span>
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
                                {r.nama?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                              <span className="flex-1 text-sm text-gray-700 truncate">{r.nama}</span>
                              <span className="text-sm font-semibold text-gray-900">{r.score}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Per-Question Breakdown */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-blue-500" /> Rincian Jawaban per Soal
        </h3>
        {questionStats.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada data</p>
        ) : (
          <div className="space-y-2">
            {questionStats.map((q, i) => (
              <div key={q.questionId} className="p-3 rounded-xl border border-gray-100">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{q.text}</p>

                    {/* Correct rate bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-500 transition-all"
                          style={{ width: `${q.correctRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-500 shrink-0">{q.correctRate}%</span>
                    </div>

                    {/* Options distribution */}
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      {q.options.map((opt, oi) => {
                        const count = q.optionCounts[String(oi)] || 0;
                        const isCorrect = String(q.correctAnswer) === String(oi);
                        const pct = q.total > 0 ? Math.round((count / q.total) * 100) : 0;
                        return (
                          <div key={oi} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-gray-50">
                            {isCorrect ? <Check size={10} className="text-green-500 shrink-0" /> : <X size={10} className="text-gray-300 shrink-0" />}
                            <span className="truncate flex-1">{opt}</span>
                            <span className="font-medium text-gray-500">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
