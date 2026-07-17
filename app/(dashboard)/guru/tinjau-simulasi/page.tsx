"use client";

import { useEffect, useState } from "react";
import { PenLine, Mic, Loader2, CheckCircle2, Save } from "lucide-react";

interface Item {
  id: string;
  student: string;
  seksi: string;
  questionText: string;
  answer: string;
  isAudio: boolean;
  score: number;
  createdAt: string;
}

export default function TinjauSimulasiPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "MENULIS" | "BERBICARA">("ALL");

  useEffect(() => {
    fetch("/api/guru/tinjau-konstruktif")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        setItems(d.items || []);
        const init: Record<string, string> = {};
        (d.items || []).forEach((it: Item) => (init[it.id] = String(it.score || "")));
        setScores(init);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (id: string) => {
    setSavingId(id);
    try {
      const res = await fetch("/api/guru/tinjau-konstruktif", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerId: id, score: Number(scores[id] || 0) }),
      });
      if (res.ok) {
        setSavedId(id);
        setTimeout(() => setSavedId((s) => (s === id ? null : s)), 1500);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Gagal menyimpan");
      }
    } finally {
      setSavingId(null);
    }
  };

  const filtered = filter === "ALL" ? items : items.filter((i) => i.seksi === filter);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tinjau Simulasi (Menulis & Berbicara)</h1>
        <p className="mt-1 text-sm text-gray-500">
          Nilai jawaban esai dan putar rekaman lisan murid di kelasmu. Beri skor 0–100 per jawaban.
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        {(["ALL", "MENULIS", "BERBICARA"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f ? "bg-emerald-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f === "ALL" ? "Semua" : f === "MENULIS" ? "Menulis" : "Berbicara"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-gray-400">
          Belum ada jawaban Menulis/Berbicara dari murid kelasmu.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((it) => (
            <div key={it.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                    it.seksi === "BERBICARA" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {it.seksi === "BERBICARA" ? <Mic className="h-3 w-3" /> : <PenLine className="h-3 w-3" />}
                  {it.seksi === "BERBICARA" ? "Berbicara" : "Menulis"}
                </span>
                <span className="text-sm font-semibold text-gray-900">{it.student}</span>
              </div>

              {it.questionText && <p className="mb-2 text-xs text-gray-500">Soal: {it.questionText}</p>}

              {it.isAudio ? (
                <audio controls src={it.answer} className="w-full" preload="none">
                  Browser tidak mendukung pemutar audio.
                </audio>
              ) : (
                <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">
                  {it.answer || <span className="text-gray-400">(kosong)</span>}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500">Nilai (0–100):</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={scores[it.id] ?? ""}
                  onChange={(e) => setScores((s) => ({ ...s, [it.id]: e.target.value }))}
                  className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  onClick={() => save(it.id)}
                  disabled={savingId === it.id}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingId === it.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : savedId === it.id ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {savedId === it.id ? "Tersimpan" : "Simpan"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
