"use client";

import { useState, useEffect } from "react";
import { Search, Plus, BookOpen, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SEKSI = ["MENDENGARKAN", "MERESPONS_KAIDAH", "MEMBACA", "MENULIS", "BERBICARA"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

export default function BankSoalUKBIPage() {
  const [soal, setSoal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeksi, setFilterSeksi] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ seksi: "MENDENGARKAN", text: "", options: ["", "", "", ""], correctAnswer: "0", explanation: "", difficulty: "MEDIUM" });

  useEffect(() => { fetchSoal(); }, [filterSeksi]);

  async function fetchSoal() {
    const params = new URLSearchParams();
    if (filterSeksi) params.set("seksi", filterSeksi);
    const res = await fetch(`/api/bank-soal/ukbi?${params}`);
    const data = await res.json();
    setSoal(data.soal || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/bank-soal/ukbi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); setForm({ seksi: "MENDENGARKAN", text: "", options: ["", "", "", ""], correctAnswer: "0", explanation: "", difficulty: "MEDIUM" }); fetchSoal(); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Soal UKBI</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola soal UKBI untuk simulasi & latihan</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}><Plus size={16} /> {showForm ? "Batal" : "Tambah Soal"}</Button>
      </div>

      <div className="flex gap-2 mb-4">
        <select value={filterSeksi} onChange={(e) => setFilterSeksi(e.target.value)} className="rounded-xl border px-3 py-2 text-sm bg-white">
          <option value="">Semua Seksi</option>
          {SEKSI.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

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

      {loading ? <div className="text-center py-12 text-gray-400">Memuat...</div> : soal.length === 0 ? (
        <div className="text-center py-16"><BookOpen size={48} className="mx-auto text-gray-200 mb-3" /><p className="text-gray-500">Belum ada soal</p></div>
      ) : (
        <div className="space-y-3">
          {soal.map((s: any) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start gap-2 mb-2">
                <Badge variant="secondary" className="text-[10px]">{s.seksi}</Badge>
                <Badge variant={s.difficulty === "HARD" ? "destructive" : s.difficulty === "MEDIUM" ? "warning" : "success"} className="text-[10px]">{s.difficulty}</Badge>
              </div>
              <p className="text-sm font-medium">{s.text}</p>
              <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                {s.options?.map((o: string, i: number) => (
                  <p key={i} className={s.correctAnswer === String(i) ? "text-emerald-600 font-semibold" : ""}>{String.fromCharCode(65 + i)}. {o} {s.correctAnswer === String(i) && "✓"}</p>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
