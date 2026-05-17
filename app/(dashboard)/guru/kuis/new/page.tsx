"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save, Plus, Trash2, GripVertical, Zap, BookOpen, Clock, Shuffle, Eye, Check, X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Soal {
  id: string;
  text: string;
  type: string;
  difficulty: string;
  options: string[];
  correctAnswer: string;
  explanation: string | null;
  isHOTS: boolean;
  kelas: string;
  topik: string | null;
}

export default function QuizBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const [quizData, setQuizData] = useState({
    title: "",
    description: "",
    type: "LATIHAN",
    kelas: "",
    subject: "Bahasa Indonesia",
    topik: "",
    KD: "",
    difficulty: "MEDIUM",
    timeLimit: "",
    shuffleQuestions: false,
    shuffleOptions: false,
    showResults: true,
    showCorrectAnswer: true,
    passingScore: "",
    maxAttempts: "1",
  });

  const [selectedSoalIds, setSelectedSoalIds] = useState<string[]>([]);
  const [bankSoal, setBankSoal] = useState<Soal[]>([]);
  const [soalLoading, setSoalLoading] = useState(false);
  const [soalFilter, setSoalFilter] = useState({ kelas: "", topik: "" });
  const [showSoalPicker, setShowSoalPicker] = useState(false);

  useEffect(() => {
    const preSelected = searchParams.get("soalIds");
    if (preSelected) {
      setSelectedSoalIds(preSelected.split(","));
    }
    if (editId) {
      fetchQuiz(editId);
    }
  }, [editId, searchParams]);

  useEffect(() => {
    if (selectedSoalIds.length > 0) {
      fetchBankSoal();
    }
  }, [selectedSoalIds]);

  const fetchQuiz = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guru/quiz/${id}`);
      const data = await res.json();
      if (data.quiz) {
        const q = data.quiz;
        setQuizData({
          title: q.title || "",
          description: q.description || "",
          type: q.type || "LATIHAN",
          kelas: q.kelas || "",
          subject: q.subject || "Bahasa Indonesia",
          topik: q.topik || "",
          KD: q.KD || "",
          difficulty: q.difficulty || "MEDIUM",
          timeLimit: q.timeLimit ? String(q.timeLimit) : "",
          shuffleQuestions: q.shuffleQuestions || false,
          shuffleOptions: q.shuffleOptions || false,
          showResults: q.showResults !== false,
          showCorrectAnswer: q.showCorrectAnswer !== false,
          passingScore: q.passingScore ? String(q.passingScore) : "",
          maxAttempts: String(q.maxAttempts || 1),
        });
        const soalIds = q.questions?.filter((qq: any) => qq.sourceType === "SOAL").map((qq: any) => qq.sourceId) || [];
        setSelectedSoalIds(soalIds);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankSoal = async () => {
    setSoalLoading(true);
    try {
      let url = "/api/guru/soal";
      const params = new URLSearchParams();
      if (soalFilter.kelas) params.set("kelas", soalFilter.kelas);
      if (soalFilter.topik) params.set("topik", soalFilter.topik);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.data) setBankSoal(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setSoalLoading(false);
    }
  };

  const toggleSoal = (id: string) => {
    setSelectedSoalIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const removeSoal = (id: string) => {
    setSelectedSoalIds(prev => prev.filter(i => i !== id));
  };

  const moveSoal = (index: number, direction: "up" | "down") => {
    const newIds = [...selectedSoalIds];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newIds.length) return;
    [newIds[index], newIds[targetIndex]] = [newIds[targetIndex], newIds[index]];
    setSelectedSoalIds(newIds);
  };

  const handleSave = async (publish = false) => {
    if (!quizData.title || !quizData.kelas) {
      alert("Judul dan kelas harus diisi");
      return;
    }
    if (selectedSoalIds.length === 0) {
      alert("Pilih minimal 1 soal dari Bank Soal");
      return;
    }

    setSaving(true);
    try {
      let quizId = editId;

      if (!editId) {
        const res = await fetch("/api/guru/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...quizData,
            timeLimit: quizData.timeLimit ? parseInt(quizData.timeLimit) : null,
            passingScore: quizData.passingScore ? parseInt(quizData.passingScore) : null,
            maxAttempts: parseInt(quizData.maxAttempts) || 1,
          }),
        });
        const data = await res.json();
        if (data.quiz) quizId = data.quiz.id;
      } else {
        await fetch(`/api/guru/quiz/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...quizData,
            timeLimit: quizData.timeLimit ? parseInt(quizData.timeLimit) : null,
            passingScore: quizData.passingScore ? parseInt(quizData.passingScore) : null,
            maxAttempts: parseInt(quizData.maxAttempts) || 1,
          }),
        });
      }

      if (quizId) {
        await fetch(`/api/guru/quiz/${quizId}/questions/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ soalIds: selectedSoalIds }),
        });

        if (publish) {
          await fetch(`/api/guru/quiz/${quizId}/publish`, { method: "POST" });
        }

        router.push(`/guru/kuis/${quizId}/assign`);
      }
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const KELAS = ["1","2","3","4","5","6","7","8","9","10","11","12"];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/guru/kuis" className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{editId ? "Edit Kuis" : "Buat Kuis Baru"}</h1>
          <p className="text-sm text-slate-500">Step {step} dari 3</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium text-center transition-all ${step === s ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}
          >
            {s === 1 ? "Pengaturan" : s === 2 ? "Pilih Soal" : "Review"}
          </button>
        ))}
      </div>

      {/* Step 1: Settings */}
      {step === 1 && (
        <Card className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Judul Kuis *</label>
            <input
              value={quizData.title}
              onChange={e => setQuizData({ ...quizData, title: e.target.value })}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Contoh: Ulangan Harian Bab 3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
            <textarea
              value={quizData.description}
              onChange={e => setQuizData({ ...quizData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="Deskripsi kuis (opsional)"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
              <select
                value={quizData.type}
                onChange={e => setQuizData({ ...quizData, type: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="LATIHAN">Latihan</option>
                <option value="TUGAS">Tugas</option>
                <option value="UJIAN">Ujian</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kelas *</label>
              <select
                value={quizData.kelas}
                onChange={e => setQuizData({ ...quizData, kelas: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Pilih Kelas</option>
                {KELAS.map(k => <option key={k} value={k}>Kelas {k}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Topik</label>
              <input
                value={quizData.topik}
                onChange={e => setQuizData({ ...quizData, topik: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Contoh: Teks Negosiasi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Batas Waktu (menit)</label>
              <input
                type="number"
                value={quizData.timeLimit}
                onChange={e => setQuizData({ ...quizData, timeLimit: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Kosongkan = tanpa batas"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nilai Lulus (%)</label>
              <input
                type="number"
                value={quizData.passingScore}
                onChange={e => setQuizData({ ...quizData, passingScore: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Contoh: 70"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Maksimal Percobaan</label>
              <input
                type="number"
                value={quizData.maxAttempts}
                onChange={e => setQuizData({ ...quizData, maxAttempts: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="1 = sekali"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={quizData.shuffleQuestions} onChange={e => setQuizData({ ...quizData, shuffleQuestions: e.target.checked })} className="rounded" />
              <Shuffle className="w-4 h-4 text-slate-400" /> Acak urutan soal
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={quizData.shuffleOptions} onChange={e => setQuizData({ ...quizData, shuffleOptions: e.target.checked })} className="rounded" />
              <Shuffle className="w-4 h-4 text-slate-400" /> Acak opsi jawaban
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={quizData.showResults} onChange={e => setQuizData({ ...quizData, showResults: e.target.checked })} className="rounded" />
              <Eye className="w-4 h-4 text-slate-400" /> Tampilkan hasil
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <Link href="/guru/kuis" className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl text-center hover:bg-slate-50">
              Batal
            </Link>
            <button onClick={() => setStep(2)} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700">
              Lanjut: Pilih Soal →
            </button>
          </div>
        </Card>
      )}

      {/* Step 2: Select Soal */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{selectedSoalIds.length} soal dipilih</p>
            <Button onClick={() => { setShowSoalPicker(true); fetchBankSoal(); }} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <Plus className="w-4 h-4 mr-2" /> Tambah dari Bank Soal
            </Button>
          </div>

          {selectedSoalIds.length === 0 ? (
            <Card className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Belum ada soal dipilih</p>
              <Button onClick={() => { setShowSoalPicker(true); fetchBankSoal(); }} className="mt-3 bg-emerald-600">
                Pilih Soal dari Bank Soal
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {selectedSoalIds.map((sid, idx) => {
                const soal = bankSoal.find(s => s.id === sid);
                return (
                  <Card key={sid} className="p-4 flex items-center gap-3">
                    <button onClick={() => moveSoal(idx, "up")} className="p-1 hover:bg-slate-100 rounded" disabled={idx === 0}>
                      <ChevronLeft className="w-4 h-4 rotate-90 text-slate-400" />
                    </button>
                    <span className="text-sm font-medium text-slate-400 w-6">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 truncate">{soal?.text || `Soal #${sid.slice(0, 8)}`}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">{soal?.type?.replace("_", " ")}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">{soal?.difficulty}</span>
                        {soal?.isHOTS && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">HOTS</span>}
                      </div>
                    </div>
                    <button onClick={() => moveSoal(idx, "down")} className="p-1 hover:bg-slate-100 rounded" disabled={idx === selectedSoalIds.length - 1}>
                      <ChevronLeft className="w-4 h-4 -rotate-90 text-slate-400" />
                    </button>
                    <button onClick={() => removeSoal(sid)} className="p-1 hover:bg-red-50 rounded">
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button onClick={() => setStep(1)} className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">
              ← Kembali
            </button>
            <button onClick={() => setStep(3)} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700">
              Lanjut: Review →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-lg">{quizData.title}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Tipe:</span> <span className="font-medium">{quizData.type}</span></div>
            <div><span className="text-slate-500">Kelas:</span> <span className="font-medium">{quizData.kelas}</span></div>
            <div><span className="text-slate-500">Jumlah Soal:</span> <span className="font-medium">{selectedSoalIds.length}</span></div>
            <div><span className="text-slate-500">Batas Waktu:</span> <span className="font-medium">{quizData.timeLimit ? `${quizData.timeLimit} menit` : "Tanpa batas"}</span></div>
            <div><span className="text-slate-500">Nilai Lulus:</span> <span className="font-medium">{quizData.passingScore ? `${quizData.passingScore}%` : "-"}</span></div>
            <div><span className="text-slate-500">Percobaan:</span> <span className="font-medium">{quizData.maxAttempts}</span></div>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setStep(2)} className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">
              ← Kembali
            </button>
            <button onClick={() => handleSave(false)} disabled={saving} className="flex-1 py-3 bg-slate-600 text-white font-bold rounded-xl hover:bg-slate-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Simpan Draft"}
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Simpan & Publish"}
            </button>
          </div>
        </Card>
      )}

      {/* Soal Picker Modal */}
      {showSoalPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSoalPicker(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Pilih Soal dari Bank Soal</h2>
              <button onClick={() => setShowSoalPicker(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex gap-3 mb-4">
              <select value={soalFilter.kelas} onChange={e => setSoalFilter({ ...soalFilter, kelas: e.target.value })} className="h-10 px-3 rounded-lg border border-slate-200 text-sm">
                <option value="">Semua Kelas</option>
                {KELAS.map(k => <option key={k} value={k}>Kelas {k}</option>)}
              </select>
              <Button onClick={fetchBankSoal} size="sm" className="bg-emerald-600">Cari</Button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {soalLoading ? (
                <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" /></div>
              ) : bankSoal.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Tidak ada soal ditemukan</p>
              ) : (
                bankSoal.map(soal => (
                  <div key={soal.id} className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedSoalIds.includes(soal.id) ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`} onClick={() => toggleSoal(soal.id)}>
                    <div className="flex items-start gap-2">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedSoalIds.includes(soal.id) ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}>
                        {selectedSoalIds.includes(soal.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900">{soal.text}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">{soal.type?.replace("_", " ")}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">{soal.difficulty}</span>
                          <span className="text-xs text-slate-400">Kelas {soal.kelas}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-3 mt-4 pt-4 border-t">
              <button onClick={() => setShowSoalPicker(false)} className="flex-1 py-2.5 border-2 border-slate-200 text-slate-600 font-bold rounded-xl">Tutup</button>
              <button onClick={() => setShowSoalPicker(false)} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl">
                Tambah {selectedSoalIds.length} Soal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
