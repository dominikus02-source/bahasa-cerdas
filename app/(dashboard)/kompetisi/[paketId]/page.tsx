"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Flag, XCircle } from "lucide-react";
import TestShell from "@/components/kompetensi/TestShell";
import TestHeader from "@/components/kompetensi/TestHeader";
import QuestionCard from "@/components/kompetensi/QuestionCard";
import QuestionNavigator from "@/components/kompetensi/QuestionNavigator";
import SectionProgress from "@/components/kompetensi/SectionProgress";
import SubmitConfirmModal from "@/components/kompetensi/SubmitConfirmModal";

interface Question {
  id: string;
  text: string;
  passage?: string;
  audioUrl?: string;
  imageUrl?: string;
  type: string;
  options: any[];
  difficulty?: string;
  seksi?: string;
  kompetensi?: string;
}

interface SectionData {
  sectionIndex: number;
  sectionName: string;
  seksi?: string;
  timeLimit: number;
  questions: Question[];
}

interface PacketData {
  session: any;
  paket: any;
  questions: SectionData[];
}

export default function KompetisiPage({ params }: { params: Promise<{ paketId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [data, setData] = useState<PacketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeUp, setTimeUp] = useState(false);

  const expiresAtRef = useRef<number | null>(null);
  const timerStartedRef = useRef(false);
  const submittedRef = useRef(false);

  const fetchTest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kompetensi/${resolvedParams.paketId}`);
      const result = await res.json();

      if (result.error) {
        if (result.session?.status === "COMPLETED") {
          router.push(`/kompetisi/${resolvedParams.paketId}/hasil`);
          return;
        }
        if (result.message === "Anda sudah menyelesaikan tes ini") {
          router.push(`/kompetisi/${resolvedParams.paketId}/hasil`);
          return;
        }
        setError(result.error);
        return;
      }

      if (!result.questions || result.questions.length === 0) {
        setError("Tidak ada soal tersedia untuk paket ini.");
        return;
      }

      const hasQuestions = result.questions.some((s: any) => s.questions && s.questions.length > 0);
      if (!hasQuestions) {
        setError("Tidak ada soal tersedia untuk paket ini.");
        return;
      }

      setData(result);
      if (result.session?.answers) setAnswers(result.session.answers);
      if (result.session?.flagged) setFlagged(result.session.flagged);

      // Compute expiresAt timestamp
      let expiresMs: number | null = null;
      if (result.session?.expiresAt) {
        expiresMs = new Date(result.session.expiresAt).getTime();
      } else if (result.paket?.duration) {
        expiresMs = Date.now() + result.paket.duration * 60 * 1000;
      } else {
        // Fallback: 30 minutes
        expiresMs = Date.now() + 30 * 60 * 1000;
      }

      expiresAtRef.current = expiresMs;

      const remaining = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
      setTimeLeft(remaining);
    } catch {
      setError("Gagal memuat soal");
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.paketId, router]);

  // Fetch test data on mount
  useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  // Timer interval — runs based on expiresAtRef
  useEffect(() => {
    if (!expiresAtRef.current) return;

    timerStartedRef.current = true;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAtRef.current! - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeUp(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.session?.id]); // Re-run only when session changes (new test)

  // Auto-submit when time is up
  const handleSubmitRef = useRef<(auto?: boolean) => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  useEffect(() => {
    if (timeUp && !submittedRef.current) {
      // Don't auto-submit for now — show message + manual submit button
      setShowConfirm(true);
    }
  }, [timeUp]);

  const sections = data?.questions || [];
  const currentSectionData = sections[currentSection];
  const questions = currentSectionData?.questions || [];
  const currentQ = questions[currentQuestion];
  const isFlagged = currentSection === 0 ? flagged.includes(currentQuestion) : false;

  const getAbsoluteIndex = (sIdx: number, qIdx: number) => {
    let idx = 0;
    for (let s = 0; s < sIdx; s++) {
      idx += sections[s]?.questions.length || 0;
    }
    return idx + qIdx;
  };
  const absoluteIdx = getAbsoluteIndex(currentSection, currentQuestion);

  const selectAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const toggleFlag = () => {
    setFlagged((prev) =>
      prev.includes(absoluteIdx)
        ? prev.filter((f) => f !== absoluteIdx)
        : [...prev, absoluteIdx]
    );
  };

  const goToQuestion = (sectionIdx: number, qIdx: number) => {
    setCurrentSection(sectionIdx);
    setCurrentQuestion(qIdx);
  };

  const goNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((q) => q + 1);
    } else if (currentSection < sections.length - 1) {
      setCurrentSection((s) => s + 1);
      setCurrentQuestion(0);
    }
  };

  const goPrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((q) => q - 1);
    } else if (currentSection > 0) {
      const prevSection = sections[currentSection - 1];
      setCurrentSection((s) => s - 1);
      setCurrentQuestion((prevSection?.questions?.length || 1) - 1);
    }
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit && !timeUp) setShowConfirm(true);
    if (submitting || submittedRef.current) return;
    submittedRef.current = true;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/kompetensi/${resolvedParams.paketId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, timeSpent: (data?.paket?.duration || 30) * 60 - timeLeft }),
      });
      const result = await res.json();
      if (result.success) {
        router.push(`/kompetisi/${resolvedParams.paketId}/hasil?attempt=${result.attemptNumber}`);
      } else {
        setError(result.error || "Submit gagal");
        submittedRef.current = false;
      }
    } catch {
      setError("Terjadi kesalahan saat submit");
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const answeredCount = sections.reduce((s, sec) => s + sec.questions.filter((q) => answers[q.id]).length, 0);
  const totalQuestions = sections.reduce((s, sec) => s + sec.questions.length, 0);
  const flaggedCount = flagged.length;

  if (loading) {
    return (
      <TestShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Memuat soal...</p>
          </div>
        </div>
      </TestShell>
    );
  }

  if (error) {
    return (
      <TestShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center bg-white rounded-2xl p-8 shadow-sm max-w-md border border-slate-200">
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <h2 className="font-bold text-lg mb-2 text-slate-800">{error}</h2>
            <p className="text-sm text-slate-500 mb-4">Paket simulasi tidak dapat dimuat. Silakan coba lagi.</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setError(""); fetchTest(); }}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
              >
                Coba Lagi
              </button>
              <button
                onClick={() => router.back()}
                className="px-6 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      </TestShell>
    );
  }

  if (!currentQ) {
    // Check if any section has questions
    const hasAnyQuestion = sections.some(s => s.questions.length > 0);
    if (!hasAnyQuestion) {
      return (
        <TestShell>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center bg-white rounded-2xl p-8 shadow-sm max-w-md border border-slate-200">
              <XCircle className="w-14 h-14 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">Tidak ada soal tersedia untuk paket ini.</p>
              <button
                onClick={() => router.back()}
                className="mt-4 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
              >
                Kembali
              </button>
            </div>
          </div>
        </TestShell>
      );
    }
    // Skip sections with 0 questions (e.g., listening without audio)
    const nextSectionWithQuestions = sections.find(s => s.questions.length > 0);
    if (nextSectionWithQuestions) {
      setCurrentSection(nextSectionWithQuestions.sectionIndex);
      setCurrentQuestion(0);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50">
      <TestHeader
        title={data?.paket?.title || "Latihan"}
        type={data?.paket?.type || ""}
        currentSection={currentSection}
        totalSections={sections.length}
        currentQuestion={currentQuestion}
        totalInSection={questions.length}
        timeLeft={timeLeft}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        onExit={() => {
          if (answeredCount > 0) {
            if (confirm("Anda akan keluar dari latihan. Jawaban yang belum dikirim akan hilang. Lanjutkan?")) {
              router.back();
            }
          } else {
            router.back();
          }
        }}
      />

      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="flex gap-4 sm:gap-6">
          {/* Side section progress (desktop) */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24">
              <SectionProgress
                sections={sections}
                currentSection={currentSection}
                answers={answers}
                flagged={[]}
                onGoToSection={(sIdx) => {
                  setCurrentSection(sIdx);
                  setCurrentQuestion(0);
                }}
              />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4 sm:space-y-5">
            {/* Section progress (mobile) */}
            <div className="lg:hidden">
              <SectionProgress
                sections={sections}
                currentSection={currentSection}
                answers={answers}
                flagged={[]}
                onGoToSection={(sIdx) => {
                  setCurrentSection(sIdx);
                  setCurrentQuestion(0);
                }}
              />
            </div>

            {/* Time up banner */}
            {timeUp && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-center">
                <p className="text-sm font-bold text-red-700 mb-2">Waktu habis. Silakan kirim jawaban Anda.</p>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Mengirim..." : "Kirim Jawaban"}
                </button>
              </div>
            )}

            <QuestionCard
              questionNumber={currentQuestion + 1}
              totalInSection={questions.length}
              sectionName={currentSectionData?.sectionName || ""}
              question={currentQ}
              selectedAnswer={answers[currentQ.id] || null}
              isFlagged={isFlagged}
              onSelectAnswer={selectAnswer}
              onToggleFlag={toggleFlag}
              isListening={currentQ.type?.toLowerCase() === "listening" || currentQ.type?.toLowerCase() === "mendengarkan"}
            />

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={goPrev}
                disabled={currentSection === 0 && currentQuestion === 0}
                className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2.5 sm:py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs sm:text-sm font-medium hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Sebelumnya</span>
                <span className="sm:hidden">Sebelum</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFlag}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-colors border ${
                    isFlagged
                      ? "bg-amber-50 text-amber-600 border-amber-200"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  } shadow-sm`}
                >
                  <Flag className={`w-3.5 h-3.5 ${isFlagged ? "fill-amber-500" : ""}`} />
                  <span className="hidden sm:inline">{isFlagged ? "Sudah ditandai" : "Tandai"}</span>
                  <span className="sm:hidden">{isFlagged ? "Ditandai" : "Tandai"}</span>
                </button>
              </div>

              <button
                onClick={goNext}
                disabled={currentQuestion === questions.length - 1 && currentSection === sections.length - 1}
                className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <span className="sm:hidden">Lanjut</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom bar */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/70 shadow-sm p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <QuestionNavigator
                  sections={sections}
                  currentSection={currentSection}
                  currentQuestion={currentQuestion}
                  answers={answers}
                  flagged={flagged}
                  onGoToQuestion={goToQuestion}
                />

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-emerald-100 border border-emerald-300" />
                      Dijawab
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-amber-100 border border-amber-300" />
                      Ragu
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-slate-50 border border-slate-200" />
                      Kosong
                    </span>
                  </div>

                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={submitting || timeUp}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-xs sm:text-sm shadow-sm disabled:opacity-50"
                  >
                    Kirim Jawaban
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SubmitConfirmModal
        open={showConfirm}
        onClose={() => {
          if (!timeUp) setShowConfirm(false);
        }}
        onConfirm={() => handleSubmit(false)}
        submitting={submitting}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        flaggedCount={flaggedCount}
        sections={sections}
        answers={answers}
        timeUp={timeUp}
      />
    </div>
  );
}
