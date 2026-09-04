"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, BarChart3, Users, Trophy, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Submission {
  id: string;
  userId: string;
  user: { fullName: string; avatar: string | null };
  status: string;
  score: number | null;
  pointsEarned: number | null;
  pointsTotal: number | null;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  timeSpent: number | null;
  submittedAt: string | null;
  attemptNumber: number;
}

export default function QuizResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const quizId = params.id as string;
  const fromKelasKu = searchParams.get("from") === "kelasku";
  const groupId = searchParams.get("groupId");
  const backHref = fromKelasKu && groupId ? `/guru/kelasku?tab=tugas&group=${groupId}` : "/guru/kuis";
  const [quiz, setQuiz] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [questionStats, setQuestionStats] = useState<any[]>([]);

  useEffect(() => {
    if (!quizId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [quizRes, resultsRes] = await Promise.all([
          fetch(`/api/guru/quiz/${quizId}`),
          fetch(`/api/guru/quiz/${quizId}/results`),
        ]);
        const quizData = await quizRes.json();
        const resultsData = await resultsRes.json();
        if (quizData.quiz) setQuiz(quizData.quiz);
        if (resultsData.submissions) setSubmissions(resultsData.submissions);
        if (resultsData.questionStats) setQuestionStats(resultsData.questionStats);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [quizId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const gradedSubmissions = submissions.filter(s => s.status === "SUBMITTED" || s.status === "GRADED");
  const avgScore = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions.length)
    : 0;
  const completionRate = quiz?._count?.assignments > 0
    ? Math.round((gradedSubmissions.length / (quiz._count.assignments * 10)) * 100)
    : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={backHref} className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Hasil Kuis</h1>
          <p className="text-sm text-slate-500">{quiz?.title}</p>
        </div>
        <Button variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{gradedSubmissions.length}</p>
              <p className="text-xs text-slate-500">Siswa Mengerjakan</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{avgScore}%</p>
              <p className="text-xs text-slate-500">Rata-rata Nilai</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${avgScore >= 70 ? "bg-green-100" : "bg-red-100"}`}>
              {avgScore >= 70 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{completionRate}%</p>
              <p className="text-xs text-slate-500">Tingkat Penyelesaian</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{quiz?.questions?.length || 0}</p>
              <p className="text-xs text-slate-500">Jumlah Soal</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Question Analytics */}
      {questionStats.length > 0 && (
        <Card className="p-5 mb-8">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" /> Analisis Per Soal
          </h3>
          <div className="space-y-3">
            {questionStats.map((qs: any, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-600 w-8">#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 truncate">{qs.text?.slice(0, 60)}...</span>
                    <span className="text-xs font-medium text-slate-600">{qs.correctRate}% benar</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${qs.correctRate >= 70 ? "bg-green-500" : qs.correctRate >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${qs.correctRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Submissions Table */}
      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" /> Daftar Nilai Siswa
        </h3>
        {gradedSubmissions.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Belum ada siswa yang mengerjakan</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Siswa</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Nilai</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Benar</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Salah</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Waktu</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {gradedSubmissions
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .map((sub, i) => (
                    <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-6">#{i + 1}</span>
                          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold">
                            {sub.user.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-900">{sub.user.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${sub.score && sub.score >= 70 ? "text-green-600" : "text-red-600"}`}>
                          {Math.round(sub.score || 0)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3.5 h-3.5" /> {sub.correctCount}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-3.5 h-3.5" /> {sub.wrongCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {sub.timeSpent ? `${Math.floor(sub.timeSpent / 60)}m ${sub.timeSpent % 60}s` : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${sub.status === "GRADED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                          {sub.status === "SUBMITTED" ? "Menunggu" : "Dinilai"}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
