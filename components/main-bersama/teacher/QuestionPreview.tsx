"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react";

export interface PreviewQuestion {
  prompt: string;
  options: string[];
  correctIndex: number | null;
  answerText?: string;
  explanation?: string;
  passage?: { title?: string; content: string };
  unsupportedReason?: string;
}

/** Preview with keys, for the verified teacher UI only. */
export default function QuestionPreview({ title, questions, onClose }: {
  title: string; questions: PreviewQuestion[]; onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [onClose]);
  if (typeof document === "undefined") return null;
  const question = questions[index];
  const move = (next: number) => { setIndex(next); setReveal(false); };
  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/80 p-3 sm:p-6"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="Pratinjau soal sebelum bermain"
        className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
          <div className="min-w-0"><span className="text-xs font-bold uppercase tracking-wide text-violet-700">Pratinjau guru · belum mulai bermain</span>
            <h2 className="truncate text-xl font-bold">{title || "Paket soal"}</h2></div>
          <button type="button" aria-label="Tutup pratinjau" onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-100"><X size={20}/></button>
        </header>
        {question ? <div className="overflow-y-auto p-4 sm:p-6" key={index}>
          <div className="mb-4 flex items-center justify-between gap-2 text-sm font-semibold text-violet-700">
            <span>Soal {index + 1} dari {questions.length}</span><span>Seperti tampilan siswa</span>
          </div>
          {question.passage?.content ? <article className="mb-4 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-amber-50 p-4 text-base leading-relaxed">
            <strong className="block">{question.passage.title ?? "Bacaan"}</strong>{question.passage.content}</article> : null}
          <p className="mb-6 whitespace-pre-wrap break-words text-lg font-bold leading-relaxed sm:text-xl">{question.prompt.trim() || "Pertanyaan belum diisi"}</p>
          {question.options.length > 0 ? <div className="grid gap-3">{question.options.map((option, i) => (
            <div key={i} className={`flex min-h-12 items-center gap-3 rounded-xl border p-3.5 text-left text-base ${reveal && question.correctIndex === i ? "border-emerald-600 bg-emerald-50 font-bold" : "border-slate-200 bg-slate-50"}`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white font-bold">{String.fromCharCode(65 + i)}</span>
              <span className="break-words">{option || "Pilihan belum diisi"}</span>
            </div>
          ))}</div> : <div className="rounded-xl border border-dashed border-slate-300 p-4 text-slate-500">Siswa akan mengetik jawaban singkat.</div>}
          {question.unsupportedReason ? <p role="status" className="mt-4 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">Perlu diperbaiki: {question.unsupportedReason}</p> : null}
          {reveal ? <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
            <strong>Kunci jawaban: </strong>{question.options.length
              ? (question.correctIndex === null || question.correctIndex < 0 ? "Belum diisi" : `${String.fromCharCode(65 + question.correctIndex)}. ${question.options[question.correctIndex] ?? "Belum diisi"}`)
              : (question.answerText || "Belum diisi")}
            {question.explanation ? <p className="mt-2 whitespace-pre-wrap">Pembahasan: {question.explanation}</p> : null}
          </div> : null}
        </div> : <p className="p-6">Belum ada soal untuk dipratinjau.</p>}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 p-4">
          <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-semibold disabled:opacity-40"
            onClick={() => move(index - 1)} disabled={index <= 0}><ChevronLeft size={18}/> Sebelumnya</button>
          <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-100 px-4 font-semibold text-emerald-950"
            onClick={() => setReveal(!reveal)}><Eye size={18}/> {reveal ? "Sembunyikan kunci" : "Lihat kunci"}</button>
          <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-4 font-semibold text-white disabled:opacity-40"
            onClick={() => move(index + 1)} disabled={index >= questions.length - 1}>Berikutnya <ChevronRight size={18}/></button>
        </footer>
      </section>
    </div>, document.body
  );
}
