"use client";

import { useState, useEffect, useCallback } from "react";
import { useTugasHref } from "@/lib/arena-scope";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, Flag, Check, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QuizData {
  assignment: { id: string; dueDate: string | null; notes: string | null; group: { name: string } };
  quiz: { id: string; title: string; description: string | null; type: string; timeLimit: number | null; maxAttempts: number; showResults: boolean };
  questions: any[];
  existingSubmission: any;
}

export default function QuizTakePage({ params }: { params: Promise<{ assignId: string }> }) {
  const tugasHref = useTugasHref();
  const router = useRouter();
  const [assignId, setAssignId] = useState<string>("");
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    params.then(p => setAssignId(p.assignId));
  }, [params]);

  const fetchQuiz = useCallback(async () => {
    if (!assignId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/murid/quiz/${assignId}`);
      const data = await res.json();
      if (data.quiz) {
        setQuizData(data);
        if (data.quiz.timeLimit) {
          setTimeLeft(data.quiz.timeLimit * 60);
        }
        if (data.existingSubmission) {
          setStartTime(Date.now() - (data.existingSubmission.startedAt ? Date.now() - new Date(data.existingSubmission.startedAt).getTime() : 0));
        } else {
          // Belum ada submission aktif → mulai otomatis supaya jawaban &
          // submit tersimpan ke server (tanpa ini action "answer"/"submit"
          // menolak dengan "No active submission").
          await fetch(`/api/murid/quiz/${assignId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "start" }),
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [assignId]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev !== null && prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  const handleStart = async () => {
    try {
      await fetch(`/api/murid/quiz/${assignId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      setStartTime(Date.now());
    } catch (e) {
      console.error(e);
    }
  };

  const selectAnswer = async (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
    try {
      await fetch(`/api/murid/quiz/${assignId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer", quizQuestionId: questionId, answerIndex }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFlag = (questionId: string) => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/murid/quiz/${assignId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      const data = await res.json();
      if (data.submission) {
        setResult(data);
        setSubmitted(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-20">
        <AlertTriangle className="w-16 h-16 text-red-300 mx-auto mb-4" />
        <h3 className="font-bold text-slate-600 mb-2">Kuis tidak ditemukan</h3>
        <Link href={tugasHref}><Button variant="outline">Kembali ke Tugasku</Button></Link>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Kuis Selesai!</h2>
          <p className="text-slate-500 mb-6">{quizData.quiz.title}</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-emerald-600">{Math.round(result.score)}%</p>
              <p className="text-xs text-slate-500">Nilai</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-green-600">{result.correctCount}</p>
              <p className="text-xs text-slate-500">Benar</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-red-600">{result.wrongCount}</p>
              <p className="text-xs text-slate-500">Salah</p>
            </div>
          </div>
          {quizData.quiz.showResults && (
            <Link href={`/murid/tugasku/${assignId}/result`}>
              <Button className="bg-violet-600 hover:bg-violet-700 text-white w-full">Lihat Detail Jawaban</Button>
            </Link>
          )}
          <Link href={tugasHref} className="block mt-3 text-sm text-slate-500 hover:text-slate-700">
            ← Kembali ke Tugasku
          </Link>
        </Card>
      </div>
    );
  }

  const question = quizData.questions[currentQ];
  const soal = question?.soal;
  const unanswered = quizData.questions.filter(q => answers[q.id] === undefined || answers[q.id] === null).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href={tugasHref} className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="text-center">
          <h1 className="font-bold text-slate-900">{quizData.quiz.title}</h1>
          <p className="text-xs text-slate-500">{quizData.assignment.group.name}</p>
        </div>
        {timeLeft !== null && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold ${timeLeft < 60 ? "bg-red-100 text-red-700" : "bg-violet-100 text-violet-700"}`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Question Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {quizData.questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentQ(i)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
              i === currentQ ? "bg-violet-600 text-white" :
              answers[q.id] !== undefined && answers[q.id] !== null ? "bg-green-100 text-green-700 border border-green-200" :
              flagged.has(q.id) ? "bg-amber-100 text-amber-700 border border-amber-200" :
              "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {i + 1}
            {flagged.has(q.id) && <Flag className="w-3 h-3 absolute -top-1 -right-1" />}
          </button>
        ))}
      </div>

      {/* Question */}
      {question && (
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <span className="text-sm text-slate-500">Soal {currentQ + 1} dari {quizData.questions.length}</span>
            <button
              onClick={() => toggleFlag(question.id)}
              className={`p-2 rounded-lg transition-colors ${flagged.has(question.id) ? "bg-amber-100 text-amber-600" : "hover:bg-slate-100 text-slate-400"}`}
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
          <p className="text-lg font-medium text-slate-900 mb-6">{soal?.text || question.customText}</p>
          {soal?.options && (
            <div className="space-y-3">
              {soal.options.map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => selectAnswer(question.id, i)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    answers[question.id] === i
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      answers[question.id] === i ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-sm">{opt}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
          disabled={currentQ === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" /> Sebelumnya
        </button>
        <span className="text-sm text-slate-400">{unanswered} belum dijawab</span>
        {currentQ < quizData.questions.length - 1 ? (
          <button
            onClick={() => setCurrentQ(currentQ + 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-violet-600 hover:bg-violet-50"
          >
            Selanjutnya <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <Button onClick={() => setShowConfirm(true)} className="bg-violet-600 hover:bg-violet-700 text-white">
            <Check className="w-4 h-4 mr-2" /> Kumpulkan
          </Button>
        )}
      </div>

      {/* Confirm Submit Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900">Kumpulkan Jawaban?</h3>
              <p className="text-sm text-slate-500 mt-2">
                {unanswered > 0 ? `Masih ada ${unanswered} soal belum dijawab. ` : ""}
                Pastikan semua jawaban sudah benar.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 border-2 border-slate-200 text-slate-600 font-bold rounded-xl">
                Periksa Lagi
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Ya, Kumpulkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
