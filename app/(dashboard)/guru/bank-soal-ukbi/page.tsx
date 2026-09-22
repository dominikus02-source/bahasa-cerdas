"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Plus, BookOpen, Trash2, Filter, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

const SEKSI = ["MENDENGARKAN", "MERESPONS_KAIDAH", "MEMBACA", "MENULIS", "BERBICARA"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

export default function BankSoalUKBIPage() {
  const [soal, setSoal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filterSeksi, setFilterSeksi] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ seksi: "MENDENGARKAN", text: "", options: ["", "", "", ""], correctAnswer: "0", explanation: "", difficulty: "MEDIUM" });
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiSeksi, setAiSeksi] = useState("MENDENGARKAN");
  const [aiDifficulty, setAiDifficulty] = useState("MEDIUM");
  const [aiLoading, setAiLoading] = useState(false);

  const fetchSoal = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const params = new URLSearchParams();
    if (filterSeksi) params.set("seksi", filterSeksi);
    try {
      const res = await fetchWithTimeout(`/api/bank-soal/ukbi?${params}`);
      if (!res.ok) throw new Error("Unable to load questions");
      const data = await res.json();
      setSoal(data.soal || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [filterSeksi]);

  useEffect(() => { void fetchSoal(); }, [fetchSoal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/bank-soal/ukbi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); setForm({ seksi: "MENDENGARKAN", text: "", options: ["", "", "", ""], correctAnswer: "0", explanation: "", difficulty: "MEDIUM" }); fetchSoal(); }
  }

  async function handleAIGenerate() {
    if (!aiTopic) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic,
          count: aiCount,
          type: "PILIHAN_GANDA",
          difficulty: aiDifficulty,
          context: `UKBI seksi ${aiSeksi}`,
        }),
      });
      const data = await res.json();
      if (data.soal) {
        for (const q of data.soal) {
          await fetch("/api/bank-soal/ukbi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              seksi: aiSeksi,
              text: q.text,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation || "",
              difficulty: q.difficulty || aiDifficulty,
            }),
          });
        }
        fetchSoal();
      }
    } catch (e) {
      console.error(e);
    }
    setAiLoading(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/bank-soal/ukbi?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchSoal();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Soal UKBI</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola soal UKBI untuk simulasi & latihan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowForm(!showForm)}><Plus size={16} /> {showForm ? "Batal" : "Tambah Manual"}</Button>
          <Button onClick={() => setAiTopic(aiTopic || "Tata Bahasa")} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
            <Zap size={16} /> Buat dengan AI
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <select value={filterSeksi} onChange={(e) => setFilterSeksi(e.target.value)} className="rounded-xl border px-3 py-2 text-sm bg-white">
          <option value="">Semua Seksi</option>
          {SEKSI.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* AI Generation */}
      {aiTopic && (
        <Card className="p-4 mb-6 border-2 border-amber-200 bg-amber-50/50">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Zap size={16} className="text-amber-600" /> Buat Soal UKBI dengan AI</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium mb-1">Topik</label>
              <input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} className="rounded-lg border px-3 py-2 text-sm w-48" placeholder="Tata bahasa, kosakata..." />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Seksi</label>
              <select value={aiSeksi} onChange={(e) => setAiSeksi(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                {SEKSI.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Jumlah</label>
              <select value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} className="rounded-lg border px-3 py-2 text-sm">
                <option value={3}>3 soal</option>
                <option value={5}>5 soal</option>
                <option value={10}>10 soal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tingkat</label>
              <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                <option value="EASY">Mudah</option>
                <option value="MEDIUM">Sedang</option>
                <option value="HARD">Sulit</option>
              </select>
            </div>
            <Button onClick={handleAIGenerate} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap size={16} />}
              {aiLoading ? "Memproses..." : "Buat"}
            </Button>
          </div>
        </Card>
      )}

      {/* Manual Form */}
      {showForm && (
        <Card className="p-6 mb-6 border-2 border-violet-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Seksi</label>
                <select value={form.seksi} onChange={(e) => setForm({ ...form, seksi: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm">
                  {SEKSI.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tingkat</label>
                <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm">
                  <option value="EASY">Mudah</option>
                  <option value="MEDIUM">Sedang</option>
                  <option value="HARD">Sulit</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pertanyaan</label>
              <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm" rows={3} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Opsi Jawaban</label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium w-6">{String.fromCharCode(65 + i)}.</span>
                  <input value={opt} onChange={(e) => { const o = [...form.options]; o[i] = e.target.value; setForm({ ...form, options: o }); }} className="flex-1 rounded-lg border px-3 py-1.5 text-sm" required />
                  <input type="radio" name="correct" checked={form.correctAnswer === String(i)} onChange={() => setForm({ ...form, correctAnswer: String(i) })} />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Penjelasan</label>
              <textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm" rows={2} />
            </div>
            <Button type="submit">Simpan Soal</Button>
          </form>
        </Card>
      )}

      {loading ? <div className="text-center py-12 text-gray-400">Memuat...</div> : loadError ? (
        <div className="text-center py-16"><p className="text-gray-500">Bank soal belum bisa dimuat.</p><Button className="mt-4" onClick={() => void fetchSoal()}>Coba lagi</Button></div>
      ) : soal.length === 0 ? (
        <div className="text-center py-16"><BookOpen size={48} className="mx-auto text-gray-200 mb-3" /><p className="text-gray-500">Belum ada soal</p></div>
      ) : (
        <div className="space-y-3">
          {soal.map((s: any) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-[10px]">{s.seksi}</Badge>
                    <Badge variant={s.difficulty === "HARD" ? "destructive" : s.difficulty === "MEDIUM" ? "warning" : "success"} className="text-[10px]">{s.difficulty}</Badge>
                  </div>
                  <p className="text-sm font-medium">{s.text}</p>
                  <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                    {s.options?.map((o: string, i: number) => (
                      <p key={i} className={s.correctAnswer === String(i) ? "text-emerald-600 font-semibold" : ""}>{String.fromCharCode(65 + i)}. {o} {s.correctAnswer === String(i) && "✓"}</p>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleDelete(s.id)} className="rounded-lg p-2 hover:bg-red-50 text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
