"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, XCircle } from "lucide-react";

interface AdaptiveQuestion {
  id: string;
  text: string;
  options: string[];
  questionType: string;
  topic: string | null;
  skill: string | null;
  subskill: string | null;
  difficulty: string | null;
}

interface AdaptiveSession {
  sessionId: string;
  actionTitle?: string;
  targetSkill: string | null;
  targetDifficulty: string | null;
  reasonText: string;
  questions: AdaptiveQuestion[];
}

export default function AdaptivePracticePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<AdaptiveSession | null>(null);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/player/adaptive-practice?sessionId=${encodeURIComponent(sessionId)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => alive && setSession(data))
      .catch(() => alive && setError("Latihan personal belum bisa dimuat."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  const question = session?.questions[index];

  async function submitAnswer(value: string | number) {
    if (!session || !question || submitting || result !== null) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/player/adaptive-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer", sessionId: session.sessionId, questionId: question.id, answer: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Jawaban belum tersimpan.");
      setResult(Boolean(data.correct));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Jawaban belum tersimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function nextQuestion() {
    if (!session) return;
    if (index + 1 >= session.questions.length) {
      await fetch("/api/player/adaptive-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", sessionId: session.sessionId }),
      });
      router.push("/murid/beranda");
      return;
    }
    setIndex((value) => value + 1);
    setAnswer("");
    setResult(null);
  }

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-violet-600" /></div>;
  }

  if (error || !session || !question) {
    return (
      <div className="mx-auto max-w-lg py-20 px-5 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300">{error || "Latihan tidak tersedia."}</p>
        <button type="button" onClick={() => router.push("/murid/beranda")} className="mt-4 text-sm font-semibold text-violet-600 hover:underline">
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 md:py-10">
      <div className="flex items-center justify-between gap-3 mb-8">
        <button type="button" onClick={() => router.push("/murid/beranda")} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" aria-label="Kembali ke Beranda">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Latihan Personal</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{session.actionTitle || "Latihan Hari Ini"}</p>
        </div>
        <span className="text-xs text-slate-500">{index + 1}/{session.questions.length}</span>
      </div>

      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mb-8 overflow-hidden">
        <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${((index + 1) / session.questions.length) * 100}%` }} />
      </div>

      <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 md:p-8">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{session.reasonText}</p>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{question.text}</h1>

        {question.options.length > 0 ? (
          <div className="mt-7 space-y-3">
            {question.options.map((option, optionIndex) => (
              <button
                key={`${question.id}-${optionIndex}`}
                type="button"
                disabled={submitting || result !== null}
                onClick={() => submitAnswer(optionIndex)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 transition hover:border-violet-400 hover:bg-violet-50 disabled:cursor-default dark:border-slate-700 dark:text-slate-200 dark:hover:bg-violet-950/30"
              >
                <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold dark:bg-slate-800">{String.fromCharCode(65 + optionIndex)}</span>
                {option}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-7 flex gap-2">
            <input value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={result !== null || submitting} className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Tulis jawabanmu" />
            <button type="button" onClick={() => submitAnswer(answer)} disabled={!answer.trim() || submitting || result !== null} className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Kirim</button>
          </div>
        )}

        {result !== null && (
          <div className={`mt-7 rounded-2xl px-4 py-3 text-sm ${result ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"}`}>
            <div className="flex items-center gap-2 font-semibold">
              {result ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              {result ? "Jawabanmu benar." : "Belum tepat. Simpan hasilnya dan lanjutkan."}
            </div>
            <button type="button" onClick={nextQuestion} className="mt-3 inline-flex items-center gap-2 font-semibold underline underline-offset-4">
              {index + 1 >= session.questions.length ? "Selesai" : "Soal Berikutnya"}
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
