"use client";

import { useEffect, useRef, useState } from "react";
import { PenLine, Save } from "lucide-react";

interface WritingAnswerProps {
  questionId: string;
  questionNumber: number;
  sectionName: string;
  prompt: string;
  instruction?: string;
  passage?: string;
  imageUrl?: string;
  minWords?: number;
  maxWords?: number;
  value: string;
  onChange: (questionId: string, text: string) => void;
}

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/**
 * Seksi Menulis: editor teks + penghitung kata + proteksi kehilangan jawaban.
 * - Draf disimpan ke localStorage tiap ketik (tahan refresh/putus koneksi).
 * - onChange menaikkan nilai ke parent yang meng-autosave ke server (30 dtk).
 */
export default function WritingAnswer({
  questionId,
  questionNumber,
  sectionName,
  prompt,
  instruction,
  passage,
  imageUrl,
  minWords,
  maxWords,
  value,
  onChange,
}: WritingAnswerProps) {
  const draftKey = `ukbi-menulis-draft:${questionId}`;
  const [text, setText] = useState(value || "");
  const restored = useRef(false);

  // Pulihkan draf lokal bila lebih panjang dari nilai server (mis. setelah refresh).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft && draft.length > (value || "").length) {
        setText(draft);
        onChange(questionId, draft);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handle = (v: string) => {
    setText(v);
    try {
      localStorage.setItem(draftKey, v);
    } catch {}
    onChange(questionId, v);
  };

  const words = countWords(text);
  const overMax = maxWords ? words > maxWords : false;
  const belowMin = minWords ? words < minWords : false;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
          {sectionName || "Menulis"} · Soal {questionNumber}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <Save className="h-3 w-3" /> Tersimpan otomatis
        </span>
      </div>

      {passage && (
        <div className="mb-3 max-h-48 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
          {passage}
        </div>
      )}
      {imageUrl && (
        <img src={imageUrl} alt="Gambar soal" className="mb-3 max-h-56 w-full rounded-xl border border-slate-100 object-contain" />
      )}

      <div className="mb-3 flex items-start gap-2">
        <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <div>
          <p className="text-sm font-medium leading-relaxed text-slate-800 sm:text-base">{prompt}</p>
          {instruction && <p className="mt-1 text-xs text-slate-500">{instruction}</p>}
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => handle(e.target.value)}
        rows={10}
        placeholder="Tulis jawaban Anda di sini…"
        className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
      />

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className={`font-medium ${overMax ? "text-red-500" : belowMin ? "text-amber-500" : "text-slate-500"}`}>
          {words} kata{maxWords ? ` / maksimal ${maxWords}` : ""}
          {minWords ? ` · minimal ${minWords}` : ""}
        </span>
        {overMax && <span className="text-red-500">Melebihi batas kata</span>}
        {!overMax && belowMin && <span className="text-amber-500">Belum mencapai minimal kata</span>}
      </div>
    </div>
  );
}
