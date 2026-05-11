"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, Flag, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

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
  subKompetensi?: string;
}

interface Section {
  sectionIndex: number;
  sectionName: string;
  seksi?: string;
  timeLimit: number;
  questions: Question[];
}

interface PacketData {
  session: any;
  packet: any;
  questions: Section[];
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
        setError(result.error);
        return;
      }

      setData(result);
      if (result.session?.answers) {
        setAnswers(result.session.answers);
      }
      if (result.session?.flagged) {
        setFlagged(result.session.flagged);
      }

      if (result.session?.expiresAt) {
        const expires = new Date(result.session.expiresAt);
        const now = new Date();
        const diff = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000));
        setTimeLeft(diff);
      } else if (result.packet?.duration) {
        setTimeLeft(result.packet.duration * 60);
      }
    } catch (e) {
      setError("Gagal memuat soal");
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.paketId, router]);

  useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const sections = data?.questions || [];
  const currentSectionData = sections[currentSection];
  const questions = currentSectionData?.questions || [];
  const currentQ = questions[currentQuestion];
  const isFlagged = flagged.includes(currentQuestion);

  const selectAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const toggleFlag = () => {
    setFlagged((prev) =>
      prev.includes(currentQuestion) ? prev.filter((f) => f !== currentQuestion) : [...prev, currentQuestion]
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
    if (!autoSubmit) setShowConfirm(true);
    if (submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/kompetensi/${resolvedParams.paketId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, timeSpent: (data?.packet?.duration || 60) * 60 - timeLeft }),
      });
      const result = await res.json();
      if (result.success) {
        router.push(`/kompetisi/${resolvedParams.paketId}/hasil?attempt=${result.attemptNumber}`);
      } else {
        setError(result.error || "Submit gagal");
      }
    } catch (e) {
      setError("Terjadi kesalahan saat submit");
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const answeredCount = Object.keys(answers).length;
  const totalInSection = questions.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Memuat soal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-8 shadow-sm max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="font-bold text-xl mb-2">{error}</h2>
          <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Tidak ada soal tersedia.</p>
          <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-slate-900 text-sm">{data?.packet?.title}</h1>
            <p className="text-xs text-slate-500">
              Seksi {currentSection + 1}/{sections.length} · {currentQuestion + 1}/{totalInSection}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-sm ${
            timeLeft <= 60 ? "bg-red-100 text-red-600 animate-pulse" : "bg-slate-100 text-slate-700"
          }`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
            <CheckCircle className="w-3.5 h-3.5" />
            {answeredCount} dijawab
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full p-4 space-y-4">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              {currentSectionData?.sectionName || data?.packet?.type}
            </span>
            <button
              onClick={toggleFlag}
              className={`p-2 rounded-lg transition-colors ${isFlagged ? "bg-yellow-100 text-yellow-600" : "hover:bg-slate-100 text-slate-400"}`}
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>

          {currentQ.passage && (
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 mb-4 italic border-l-4 border-indigo-300 leading-relaxed">
              {currentQ.passage}
            </div>
          )}

          {currentQ.imageUrl && (
            <div className="mb-4 rounded-xl overflow-hidden">
              <img src={currentQ.imageUrl} alt="soal" className="max-h-48 object-contain mx-auto" />
            </div>
          )}

          <p className="text-slate-800 leading-relaxed font-medium">{currentQ.text}</p>
        </div>

        <div className="space-y-2.5">
          {currentQ.options?.map((option: any) => {
            const isSelected = answers[currentQ.id] === option.id;
            return (
              <button
                key={option.id}
                onClick={() => selectAnswer(currentQ.id, option.id)}
                className={`w-full text-left rounded-xl p-4 transition-all flex items-start gap-3 ${
                  isSelected
                    ? "bg-indigo-50 border-2 border-indigo-500 shadow-sm"
                    : "bg-white border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/50"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {option.id}
                </div>
                <span className={`text-sm font-medium pt-1 ${isSelected ? "text-indigo-900" : "text-slate-700"}`}>
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4">
          <button
            onClick={goPrev}
            disabled={currentSection === 0 && currentQuestion === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Sebelumnya
          </button>

          <button
            onClick={goNext}
            disabled={currentSection === sections.length - 1 && currentQuestion === questions.length - 1}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Selanjutnya <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white border-t border-slate-200 px-4 py-3 sticky bottom-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="shrink-0">
                <p className="text-xs font-bold text-slate-500 mb-1">{section.sectionName}</p>
                <div className="flex gap-1 flex-wrap">
                  {section.questions.map((q, qIdx) => {
                    const isAnswered = !!answers[q.id];
                    const isFlag = sIdx === currentSection && flagged.includes(qIdx);
                    const isCurrent = sIdx === currentSection && qIdx === currentQuestion;
                    return (
                      <button
                        key={q.id}
                        onClick={() => goToQuestion(sIdx, qIdx)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                          isCurrent ? "ring-2 ring-indigo-500 ring-offset-1" : ""
                        } ${
                          isFlag
                            ? "bg-yellow-100 text-yellow-700 border-2 border-yellow-300"
                            : isAnswered
                            ? "bg-green-100 text-green-700 border-2 border-green-300"
                            : "bg-slate-100 text-slate-500 border-2 border-transparent hover:bg-slate-200"
                        }`}
                      >
                        {qIdx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => handleSubmit(false)}
            className="w-full mt-2 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
          >
            Kirim Jawaban
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <h2 className="font-bold text-lg">Konfirmasi Kirim?</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Anda telah menjawab <strong>{answeredCount}</strong> soal. 
              {answeredCount < (data?.packet?.totalQuestions || 0) && (
                <span className="text-red-500"> Masih ada {(data?.packet?.totalQuestions || 0) - answeredCount} soal belum dijawab.</span>
              )}
            </p>
            <p className="text-xs text-slate-400 mb-5">Setelah dikirim, Anda tidak dapat mengubah jawaban.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 border-2 border-slate-200 text-slate-600 font-bold rounded-xl">
                Batal
              </button>
              <button onClick={() => handleSubmit(true)} disabled={submitting} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Ya, Kirim"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}