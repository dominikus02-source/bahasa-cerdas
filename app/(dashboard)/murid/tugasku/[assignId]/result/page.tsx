"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
  const submissionId = params.id as string;
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
        <p className="text-slate-500">Data tidak ditemukan</p>
        <Link href="/murid/tugasku" className="text-violet-600 hover:underline mt-2 inline-block">
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
        <Link href="/murid/tugasku" className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hasil Kuis</h1>
          <p className="text-sm text-slate-500">Detail jawaban kamu</p>
        </div>
      </div>

      {/* Score Card */}
      <Card className={`p-6 mb-6 border-2 ${passed ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${passed ? "bg-green-100" : "bg-red-100"}`}>
              {passed ? <Award className="w-8 h-8 text-green-600" /> : <AlertCircle className="w-8 h-8 text-red-600" />}
            </div>
            <div>
              <p className="text-4xl font-bold text-slate-900">{Math.round(score)}%</p>
              <p className="text-sm text-slate-500">
                {passed ? "Lulus! Selamat 🎉" : "Belum lulus, terus belajar!"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Nilai Lulus</p>
            <p className="text-lg font-bold text-slate-900">{passingScore}%</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200/60">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{submission.correctCount}</p>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
              <CheckCircle className="w-3 h-3" /> Benar
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{submission.wrongCount}</p>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
              <XCircle className="w-3 h-3" /> Salah
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-600">{submission.skippedCount}</p>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" /> Dilewati
            </p>
          </div>
        </div>

        {submission.timeSpent && (
          <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            Waktu: {Math.floor(submission.timeSpent / 60)} menit {submission.timeSpent % 60} detik
          </div>
        )}
      </Card>

      {/* Question Review */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900 mb-3">Review Jawaban</h3>
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
                  <span className="text-sm font-medium text-slate-500 w-8">#{i + 1}</span>
                  <span className="text-sm text-slate-700 truncate max-w-[300px]">{questionText}</span>
                </div>
                <div className="flex items-center gap-2">
                  {status === "correct" && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {status === "wrong" && <XCircle className="w-5 h-5 text-red-500" />}
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
                          isCorrect ? "bg-green-100 border-2 border-green-300 text-green-800" :
                          isSelected ? "bg-red-100 border-2 border-red-300 text-red-800" :
                          "bg-slate-50 text-slate-600"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-white/60">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt.text}</span>
                          {isCorrect && <CheckCircle className="w-4 h-4 ml-auto text-green-600" />}
                          {isSelected && !isCorrect && <XCircle className="w-4 h-4 ml-auto text-red-600" />}
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
