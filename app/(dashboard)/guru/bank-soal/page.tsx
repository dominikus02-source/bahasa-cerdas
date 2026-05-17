"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Trash2, Zap, Loader2, Save, RefreshCw, Check, ArrowRight, ChevronDown, ChevronUp, X, Search } from "lucide-react";

const KELAS = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const KD_OPTIONS = [
  { value: "3.1", label: "3.1 - Teks Deskripsi" },
  { value: "3.2", label: "3.2 - Teks Cerita" },
  { value: "3.3", label: "3.3 - Teks Negosiasi" },
  { value: "3.4", label: "3.4 - Teks Eksposisi" },
  { value: "3.5", label: "3.5 - Teks Anekdot" },
  { value: "3.6", label: "3.6 - Teks Laporan" },
  { value: "3.7", label: "3.7 - Surat Resmi" },
  { value: "3.8", label: "3.8 - Karya Sastra" },
  { value: "4.1", label: "4.1 - Menulis Teks" },
  { value: "4.2", label: "4.2 - Menyunting Teks" },
];

const TYPE_COLORS: Record<string, string> = {
  PILIHAN_GANDA: "bg-blue-100 text-blue-700 border-blue-200",
  ESSAY: "bg-purple-100 text-purple-700 border-purple-200",
  ISIAN: "bg-orange-100 text-orange-700 border-orange-200",
};

const TYPE_LABELS: Record<string, string> = {
  PILIHAN_GANDA: "Pilihan Ganda",
  ESSAY: "Essay",
  ISIAN: "Isian",
};

const DIFF_COLORS: Record<string, string> = {
  EASY: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HARD: "bg-red-100 text-red-700",
};

const DIFF_LABELS: Record<string, string> = {
  EASY: "Mudah",
  MEDIUM: "Sedang",
  HARD: "Sulit",
};

export default function BankSoalPage() {
  const router = useRouter();
  const [soalList, setSoalList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [topikList, setTopikList] = useState<string[]>([]);
  const [showTambah, setShowTambah] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [generateMsg, setGenerateMsg] = useState("");

  const [activeTab, setActiveTab] = useState("all");
  const [filterKelas, setFilterKelas] = useState("");
  const [filterTopik, setFilterTopik] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    text: "",
    type: "PILIHAN_GANDA",
    difficulty: "MEDIUM",
    options: ["", "", "", ""],
    correctAnswer: "",
    explanation: "",
    isHOTS: false,
    kelas: "",
    kd: "",
  });

  const fetchSoal = useCallback(async () => {
    setFetching(true);
    try {
      let url = "/api/guru/soal";
      const params = new URLSearchParams();
      if (activeTab === "kelas" && filterKelas) params.set("kelas", filterKelas);
      if (activeTab === "topik" && filterTopik) params.set("topik", filterTopik);
      if (url.includes("?")) url += "&" + params.toString();
      else if (params.toString()) url += "?" + params.toString();

      const res = await fetch(url);
      const data = await res.json();
      if (data.data) setSoalList(data.data);
      if (data.kelasList) setKelasList(data.kelasList);
      if (data.topikList) setTopikList(data.topikList);
    } catch (e) {
      console.error(e);
    }
    setFetching(false);
  }, [activeTab, filterKelas, filterTopik]);

  useEffect(() => { fetchSoal(); }, [fetchSoal]);

  const handleGenerate = async () => {
    if (!formData.text) return;
    setLoading(true);
    setGenerateMsg("");
    try {
      const res = await fetch("/api/ai/soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formData.text,
          count: 5,
          type: formData.type,
          difficulty: formData.difficulty,
          kelas: formData.kelas,
          kd: formData.kd,
        }),
      });
      const data = await res.json();
      if (data.soal) {
        setGenerateMsg(`✅ ${data.saved || data.soal.length} soal berhasil dibuat & disimpan!`);
        fetchSoal();
      } else if (data.error) {
        setGenerateMsg(`❌ ${data.error}`);
      }
    } catch (e) {
      setGenerateMsg("❌ Gagal generate soal");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.text || !formData.kelas) return;
    setSaving(true);
    try {
      const res = await fetch("/api/guru/soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: formData.text,
          type: formData.type,
          difficulty: formData.difficulty,
          options: formData.type === "PILIHAN_GANDA" ? formData.options : [],
          correctAnswer: formData.correctAnswer,
          explanation: formData.explanation,
          isHOTS: formData.isHOTS,
          kelas: formData.kelas,
          kd: formData.kd,
          topik: formData.text.slice(0, 30),
          subject: "Bahasa Indonesia",
          source: "MANUAL",
        }),
      });
      const data = await res.json();
      if (data.success && data.soal) {
        setShowTambah(false);
        setFormData({ text: "", type: "PILIHAN_GANDA", difficulty: "MEDIUM", options: ["", "", "", ""], correctAnswer: "", explanation: "", isHOTS: false, kelas: "", kd: "" });
        fetchSoal();
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/guru/soal?id=${id}`, { method: "DELETE" });
      fetchSoal();
      if (selectedIds.has(id)) {
        const newIds = new Set(selectedIds);
        newIds.delete(id);
        setSelectedIds(newIds);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelect = (id: string) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(id)) newIds.delete(id);
    else newIds.add(id);
    setSelectedIds(newIds);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredSoal.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredSoal.map(s => s.id)));
  };

  const handleBuatKuis = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    router.push(`/guru/kuis/new?soalIds=${ids.join(",")}`);
  };

  const filteredSoal = soalList.filter(s => {
    if (searchQuery && !s.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeTab === "kelas" && filterKelas) return s.kelas === filterKelas;
    if (activeTab === "topik" && filterTopik) return s.topik === filterTopik;
    return true;
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Soal</h1>
          <p className="mt-1 text-sm text-gray-600">{soalList.length} soal tersedia</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSoal} disabled={fetching}>
            <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setShowTambah(true)}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Soal
          </Button>
        </div>
      </div>

      {/* AI Generate */}
      <Card className="p-4 mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-5 w-5 text-amber-500" />
          <p className="text-sm font-semibold text-amber-800">Generate Soal dengan AI</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            className="flex-1 min-w-[180px] rounded-lg border border-amber-200 px-3 py-2 text-sm bg-white"
            placeholder="Topik, contoh: Teks Negosiasi"
          />
          <select value={formData.kelas} onChange={(e) => setFormData({ ...formData, kelas: e.target.value })} className="rounded-lg border border-amber-200 px-3 py-2 text-sm bg-white">
            <option value="">Kelas</option>
            {KELAS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="rounded-lg border border-amber-200 px-3 py-2 text-sm bg-white">
            <option value="PILIHAN_GANDA">Pilihan Ganda</option>
            <option value="ESSAY">Essay</option>
            <option value="ISIAN">Isian</option>
          </select>
          <select value={formData.difficulty} onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })} className="rounded-lg border border-amber-200 px-3 py-2 text-sm bg-white">
            <option value="EASY">Mudah</option>
            <option value="MEDIUM">Sedang</option>
            <option value="HARD">Sulit</option>
          </select>
          <Button onClick={handleGenerate} disabled={loading || !formData.text || !formData.kelas} className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {loading ? "..." : "Generate"}
          </Button>
        </div>
        {generateMsg && (
          <div className={`mt-2 text-sm rounded-lg px-3 py-1.5 ${generateMsg.includes("✅") ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"}`}>
            {generateMsg}
          </div>
        )}
      </Card>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari soal..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={filterKelas}
          onChange={(e) => { setFilterKelas(e.target.value); setActiveTab("kelas"); }}
          className="h-10 px-3 rounded-xl border border-gray-200 text-sm bg-white"
        >
          <option value="">Semua Kelas</option>
          {kelasList.map(k => <option key={k} value={k}>Kelas {k}</option>)}
        </select>
        <Button
          variant={selectMode ? "default" : "outline"}
          size="sm"
          onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
        >
          {selectMode ? <X size={14} className="mr-1" /> : <Check size={14} className="mr-1" />}
          {selectMode ? `${selectedIds.size}` : "Pilih"}
        </Button>
      </div>

      {/* Selection bar */}
      {selectMode && selectedIds.size > 0 && (
        <Card className="p-3 mb-4 bg-emerald-50 border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-sm text-emerald-700 font-medium">
              {selectedIds.size === filteredSoal.length ? "Batal Semua" : "Pilih Semua"}
            </button>
            <span className="text-sm text-emerald-600">{selectedIds.size} soal dipilih</span>
          </div>
          <Button size="sm" onClick={handleBuatKuis} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Buat Kuis <ArrowRight size={14} className="ml-1" />
          </Button>
        </Card>
      )}

      {/* Soal List - Kahoot Style */}
      {fetching ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
      ) : filteredSoal.length === 0 ? (
        <Card className="py-16 text-center">
          <BookOpen className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 font-semibold">Belum ada soal</h3>
          <p className="mt-2 text-sm text-gray-500">Generate dengan AI atau tambah manual</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredSoal.map((soal) => {
            const isExpanded = expandedId === soal.id;
            const isSelected = selectedIds.has(soal.id);
            return (
              <Card
                key={soal.id}
                className={`transition-all ${
                  selectMode
                    ? (isSelected ? "ring-2 ring-emerald-500 bg-emerald-50/50 border-emerald-300" : "opacity-60")
                    : "hover:shadow-sm"
                }`}
              >
                {/* Header - always visible */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => {
                    if (selectMode) toggleSelect(soal.id);
                    else setExpandedId(isExpanded ? null : soal.id);
                  }}
                >
                  {selectMode && (
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-xs px-2 py-0.5 border ${TYPE_COLORS[soal.type] || TYPE_COLORS.PILIHAN_GANDA}`}>
                        {TYPE_LABELS[soal.type] || "PG"}
                      </Badge>
                      <Badge className={`text-xs px-2 py-0.5 ${DIFF_COLORS[soal.difficulty] || DIFF_COLORS.MEDIUM}`}>
                        {DIFF_LABELS[soal.difficulty] || "Sedang"}
                      </Badge>
                      {soal.isHOTS && <Badge className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700">HOTS</Badge>}
                      <Badge className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600">Kelas {soal.kelas}</Badge>
                      {soal.source === "AI" && <Badge className="text-xs px-2 py-0.5 bg-violet-100 text-violet-600">AI</Badge>}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{soal.text}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!selectMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); soal.id && handleDelete(soal.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {!selectMode && (
                      isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && !selectMode && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    {soal.topik && <p className="text-xs text-gray-500 mb-2">Topik: {soal.topik}</p>}
                    {soal.kd && <p className="text-xs text-gray-500 mb-2">KD: {soal.kd}</p>}

                    {soal.type === "PILIHAN_GANDA" && soal.options?.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {soal.options.map((opt: string, j: number) => {
                          const isCorrect = String(j) === String(soal.correctAnswer);
                          return (
                            <div key={j} className={`flex items-center gap-2 text-sm p-2 rounded-lg ${isCorrect ? "bg-green-50 text-green-700 font-medium" : "text-gray-600"}`}>
                              <span className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold shrink-0">
                                {String.fromCharCode(65 + j)}
                              </span>
                              <span>{opt}</span>
                              {isCorrect && <Check className="w-4 h-4 ml-auto text-green-600" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {soal.type === "ESSAY" && (
                      <div className="mb-3 p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
                        <p className="font-medium mb-1">Jawaban Essay:</p>
                        <p>{soal.correctAnswer || "Tidak ada jawaban standar"}</p>
                      </div>
                    )}

                    {soal.type === "ISIAN" && (
                      <div className="mb-3 p-3 bg-orange-50 rounded-lg text-sm text-orange-700">
                        <p className="font-medium mb-1">Jawaban:</p>
                        <p>{soal.correctAnswer}</p>
                      </div>
                    )}

                    {soal.explanation && (
                      <div className="p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                        <span className="font-medium">💡 Penjelasan:</span> {soal.explanation}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Tambah Manual Modal */}
      <Modal isOpen={showTambah} onClose={() => setShowTambah(false)} title="Tambah Soal" className="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Pertanyaan</label>
            <textarea value={formData.text} onChange={(e) => setFormData({ ...formData, text: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm" rows={3} placeholder="Tulis pertanyaan..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tipe</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="PILIHAN_GANDA">Pilihan Ganda</option>
                <option value="ESSAY">Essay</option>
                <option value="ISIAN">Isian</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tingkat</label>
              <select value={formData.difficulty} onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="EASY">Mudah</option>
                <option value="MEDIUM">Sedang</option>
                <option value="HARD">Sulit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kelas</label>
              <select value={formData.kelas} onChange={(e) => setFormData({ ...formData, kelas: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="">Pilih</option>
                {KELAS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">KD</label>
            <select value={formData.kd} onChange={(e) => setFormData({ ...formData, kd: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="">Pilih KD</option>
              {KD_OPTIONS.map((kd) => <option key={kd.value} value={kd.value}>{kd.label}</option>)}
            </select>
          </div>
          {formData.type === "PILIHAN_GANDA" && (
            <div>
              <label className="block text-sm font-medium mb-2">Opsi Jawaban (klik radio untuk jawaban benar)</label>
              {formData.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 w-6">{String.fromCharCode(65 + i)}.</span>
                  <input value={opt} onChange={(e) => { const n = [...formData.options]; n[i] = e.target.value; setFormData({ ...formData, options: n }); }} className="flex-1 rounded-lg border px-3 py-1.5 text-sm" placeholder={`Opsi ${String.fromCharCode(65 + i)}`} />
                  <input type="radio" name="correct" checked={formData.correctAnswer === String(i)} onChange={() => setFormData({ ...formData, correctAnswer: String(i) })} />
                </div>
              ))}
            </div>
          )}
          {formData.type === "ESSAY" && (
            <div>
              <label className="block text-sm font-medium mb-1">Kunci Jawaban / Panduan Penilaian</label>
              <textarea value={formData.correctAnswer} onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm" rows={3} placeholder="Tulis kunci jawaban atau panduan penilaian..." />
            </div>
          )}
          {formData.type === "ISIAN" && (
            <div>
              <label className="block text-sm font-medium mb-1">Jawaban Benar</label>
              <input value={formData.correctAnswer} onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm" placeholder="Jawaban yang benar..." />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Penjelasan (opsional)</label>
            <textarea value={formData.explanation} onChange={(e) => setFormData({ ...formData, explanation: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm" rows={2} placeholder="Penjelasan jawaban..." />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="hots" checked={formData.isHOTS} onChange={(e) => setFormData({ ...formData, isHOTS: e.target.checked })} className="rounded" />
            <label htmlFor="hots" className="text-sm font-medium">Soal HOTS</label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowTambah(false)} className="flex-1">Batal</Button>
            <Button onClick={handleSave} disabled={saving || !formData.text || !formData.kelas} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
