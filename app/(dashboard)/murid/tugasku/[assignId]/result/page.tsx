"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTugasHref } from "@/lib/arena-scope";
import Link from "next/link";
import { ChevronLeft, CheckCircle, XCircle, AlertCircle, Clock, Award } from "lucide-react";
import { Card } from "@/components/ui/card";

interface QuestionResult {
  id: string;
  quizQuestionId: string;
  question: {
    sourceType: string;
    sourceId: string;
    customText: string | null;
    customOptions: any[] | null;
    customCorrectAnswer: number | null;
    orderIndex: number;
    soal?: {
      text: string;
      options: any[];
      correctOptionIndex: number;
    } | null;
  };
  selectedAnswerIndex: number | null;
  isCorrect: boolean | null;
  pointsEarned: number;
  timeSpent: number | null;
}

interface SubmissionDetail {
  id: string;
  status: string;
  score: number | null;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  pointsEarned: number | null;
  pointsTotal: number | null;
  timeSpent: number | null;
  submittedAt: string | null;
  answers: QuestionResult[];
}

export default function MuridQuizResultPage() {
  const params = useParams();
  const tugasHref = useTugasHref();
  // The route segment is named [assignId] for the sibling /take route, which does
  // receive an assignment id. On /result it carries a QuizSubmission id instead —
  // that is what /api/murid/quiz/submission/[id] looks up. Reading params.id here
  // (the old code) always yielded undefined, so the fetch never ran and the page
  // sat on its loading state forever.
  const submissionId = params.assignId as string;
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!submissionId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/murid/quiz/submission/${submissionId}`);
        const data = await res.json();
        if (data.submission) setSubmission(data.submission);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [submissionId]);

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500 dark:text-slate-400">Data tidak ditemukan</p>
        <Link href={tugasHref} className="text-violet-600 dark:text-violet-400 hover:underline mt-2 inline-block">
          Kembali ke Tugasku
        </Link>
      </div>
    );
  }

  const score = submission.score || 0;
  const passingScore = 70;
  const passed = score >= passingScore;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={tugasHref} className="p-2 hover:bg-slate-100 dark:bg-slate-800/70 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hasil Kuis</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Detail jawaban kamu</p>
        </div>
      </div>

      {/* Score Card */}
      <Card className={`p-6 mb-6 border-2 ${passed ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40/50" : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40/50"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${passed ? "bg-green-100" : "bg-red-100"}`}>
              {passed ? <Award className="w-8 h-8 text-green-600 dark:text-green-400" /> : <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />}
            </div>
            <div>
              <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{Math.round(score)}%</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {passed ? "Lulus! Selamat" : "Belum lulus, terus belajar!"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 dark:text-slate-400">Nilai Lulus</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{passingScore}%</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700/60">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{submission.correctCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
              <CheckCircle className="w-3 h-3" /> Benar
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{submission.wrongCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
              <XCircle className="w-3 h-3" /> Salah
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{submission.skippedCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" /> Dilewati
            </p>
          </div>
        </div>

        {submission.timeSpent && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            Waktu: {Math.floor(submission.timeSpent / 60)} menit {submission.timeSpent % 60} detik
          </div>
        )}
      </Card>

      {/* Lanjutkan Belajar */}
      <Card className="p-6 mb-6 border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40/50">
        <div className="text-center mb-4">
          <p className="font-bold text-slate-900 dark:text-slate-100">Lanjutkan Belajar</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Terus berlatih supaya makin hebat!</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/arena/jalur-cerdas"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors text-sm"
          >
            Latihan di Jalur Cerdas
          </Link>
          <Link
            href="/arena/tulis"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-violet-300 text-violet-700 dark:text-violet-300 font-bold rounded-xl hover:bg-violet-50 transition-colors text-sm"
          >
            Tulis Karya
          </Link>
        </div>
      </Card>

      {/* Question Review */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Review Jawaban</h3>
        {submission.answers.map((answer, i) => {
          const isExpanded = expandedQuestions.has(i);
          const soal = answer.question.soal;
          const options = answer.question.sourceType === "SOAL" && soal
            ? soal.options
            : (answer.question.customOptions || []);
          const correctIndex = answer.question.sourceType === "SOAL" && soal
            ? soal.correctOptionIndex
            : (answer.question.customCorrectAnswer ?? -1);
          const questionText = answer.question.sourceType === "SOAL" && soal
            ? soal.text
            : (answer.question.customText || "");

          const status = answer.isCorrect === true ? "correct" : answer.isCorrect === false ? "wrong" : "skipped";

          return (
            <Card key={answer.id} className={`border-l-4 ${status === "correct" ? "border-l-green-500" : status === "wrong" ? "border-l-red-500" : "border-l-slate-300"}`}>
              <button
                onClick={() => toggleQuestion(i)}
                className="w-full p-4 text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400 w-8">#{i + 1}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[300px]">{questionText}</span>
                </div>
                <div className="flex items-center gap-2">
                  {status === "correct" && <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />}
                  {status === "wrong" && <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />}
                  {status === "skipped" && <AlertCircle className="w-5 h-5 text-slate-400" />}
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {options.map((opt: any, optIdx: number) => {
                    const isCorrect = optIdx === correctIndex;
                    const isSelected = optIdx === answer.selectedAnswerIndex;
                    return (
                      <div
                        key={optIdx}
                        className={`p-3 rounded-xl text-sm ${
                          isCorrect ? "bg-green-100 border-2 border-green-300 dark:border-green-700 text-green-800" :
                          isSelected ? "bg-red-100 border-2 border-red-300 dark:border-red-700 text-red-800" :
                          "bg-slate-50 dark:bg-slate-800/50 text-slate-600"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-white bg-white/60 dark:bg-slate-900/60">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt.text}</span>
                          {isCorrect && <CheckCircle className="w-4 h-4 ml-auto text-green-600 dark:text-green-400" />}
                          {isSelected && !isCorrect && <XCircle className="w-4 h-4 ml-auto text-red-600 dark:text-red-400" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
