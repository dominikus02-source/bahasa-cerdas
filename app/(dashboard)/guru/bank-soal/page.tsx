"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Trash2, Zap, Upload, Loader2, CheckCircle, Save, RefreshCw, Check, Gamepad2, Dices, Filter, ChevronDown, X } from "lucide-react";

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

type TabType = "all" | "kelas" | "topik";

export default function BankSoalPage() {
  const [soalList, setSoalList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [topikList, setTopikList] = useState<string[]>([]);
  const [showTambah, setShowTambah] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [generateMsg, setGenerateMsg] = useState("");

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [filterKelas, setFilterKelas] = useState("");
  const [filterTopik, setFilterTopik] = useState("");
  const [showKelasDropdown, setShowKelasDropdown] = useState(false);
  const [showTopikDropdown, setShowTopikDropdown] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
      if (activeTab === "kelas" && filterKelas) url += `?kelas=${filterKelas}`;
      else if (activeTab === "topik" && filterTopik) url += `?topik=${encodeURIComponent(filterTopik)}`;

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
      console.error(e);
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
          options: formData.options,
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
    if (selectedIds.size === soalList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(soalList.map(s => s.id)));
  };

  const filteredSoal = soalList.filter(s => {
    if (activeTab === "kelas" && filterKelas) return s.kelas === filterKelas;
    if (activeTab === "topik" && filterTopik) return s.topik === filterTopik;
    return true;
  });

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: "all", label: "Semua", count: soalList.length },
    { id: "kelas", label: "Per Kelas" },
    { id: "topik", label: "Per Topik" },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Soal</h1>
          <p className="mt-1 text-sm text-gray-600">Kelola soal untuk latihan, kuis, dan game</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchSoal} disabled={fetching}>
            <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowTambah(true)}>
            <Plus className="h-4 w-4" /> Tambah Manual
          </Button>
        </div>
      </div>

      {/* AI Generate Section */}
      <Card className="p-4 mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-5 w-5 text-amber-500" />
          <p className="text-sm font-semibold text-amber-800">Generate Soal dengan AI</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            className="flex-1 min-w-[200px] rounded-lg border border-amber-200 px-4 py-2 text-sm bg-white"
            placeholder="Topik soal, contoh: Teks Negosiasi"
          />
          <select value={formData.kelas} onChange={(e) => setFormData({ ...formData, kelas: e.target.value })} className="rounded-lg border border-amber-200 px-3 py-2 text-sm bg-white">
            <option value="">Kelas</option>
            {KELAS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="rounded-lg border border-amber-200 px-3 py-2 text-sm bg-white">
            <option value="PILIHAN_GANDA">PG</option>
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
            {loading ? "Generating..." : "Generate 5 Soal"}
          </Button>
        </div>
        {generateMsg && (
          <div className={`mt-3 text-sm flex items-center gap-1.5 rounded-lg px-3 py-2 ${generateMsg.includes("✅") ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"}`}>
            {generateMsg}
          </div>
        )}
      </Card>

      {/* Tabs & Filters */}
      <div className="flex items-center gap-3 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); if (tab.id === "all") { setFilterKelas(""); setFilterTopik(""); } }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {tab.label} {tab.count !== undefined && `(${tab.count})`}
          </button>
        ))}

        {activeTab === "kelas" && (
          <div className="relative">
            <button onClick={() => setShowKelasDropdown(!showKelasDropdown)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-100 text-violet-700 hover:bg-violet-200">
              <Filter size={14} /> Kelas {filterKelas || "Semua"} <ChevronDown size={14} />
            </button>
            {showKelasDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
                <button onClick={() => { setFilterKelas(""); setShowKelasDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Semua</button>
                {kelasList.map(k => (
                  <button key={k} onClick={() => { setFilterKelas(k); setShowKelasDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Kelas {k}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "topik" && (
          <div className="relative">
            <button onClick={() => setShowTopikDropdown(!showTopikDropdown)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">
              <Filter size={14} /> {filterTopik || "Semua Topik"} <ChevronDown size={14} />
            </button>
            {showTopikDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10 min-w-[200px] max-h-[300px] overflow-y-auto">
                <button onClick={() => { setFilterTopik(""); setShowTopikDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Semua</button>
                {topikList.map(t => (
                  <button key={t} onClick={() => { setFilterTopik(t); setShowTopikDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 truncate">{t}</button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="ml-auto flex gap-2">
          <Button variant={selectMode ? "default" : "outline"} size="sm" onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}>
            {selectMode ? <X size={14} className="mr-1" /> : <Check size={14} className="mr-1" />}
            {selectMode ? `Pilih (${selectedIds.size})` : "Pilih Soal"}
          </Button>
          {selectMode && selectedIds.size > 0 && (
            <>
              <Button variant="outline" size="sm" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <BookOpen size={14} className="mr-1" /> Latihan
              </Button>
              <Button variant="outline" size="sm" className="bg-violet-50 text-violet-700 border-violet-200">
                <Gamepad2 size={14} className="mr-1" /> Game
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Soal List */}
      {fetching ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
      ) : filteredSoal.length === 0 ? (
        <Card className="py-16 text-center">
          <BookOpen className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 font-semibold">Belum ada soal</h3>
          <p className="mt-2 text-sm text-gray-500">Generate dengan AI atau tambah manual</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {selectMode && (
            <div className="flex items-center justify-between px-2">
              <button onClick={selectAll} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                {selectedIds.size === filteredSoal.length ? "Batal Pilih Semua" : "Pilih Semua"}
              </button>
              <span className="text-sm text-gray-500">{selectedIds.size} / {filteredSoal.length} dipilih</span>
            </div>
          )}
          {filteredSoal.map((soal) => (
            <Card key={soal.id} className={`p-4 transition-all ${selectMode ? (selectedIds.has(soal.id) ? "ring-2 ring-emerald-500 bg-emerald-50/50" : "opacity-70") : "hover:shadow-md"}`}>
              <div className="flex items-start gap-3">
                {selectMode && (
                  <button onClick={() => toggleSelect(soal.id)} className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selectedIds.has(soal.id) ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}>
                    {selectedIds.has(soal.id) && <Check size={12} className="text-white" />}
                  </button>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="secondary">{soal.type?.replace("_", " ") || "PG"}</Badge>
                    <Badge variant={soal.difficulty === "HARD" ? "destructive" : soal.difficulty === "MEDIUM" ? "warning" : "success"}>{soal.difficulty || "MEDIUM"}</Badge>
                    {soal.isHOTS && <Badge variant="gold">HOTS</Badge>}
                    <Badge>Kelas {soal.kelas}</Badge>
                    {soal.topik && <Badge variant="outline">{soal.topik}</Badge>}
                    {soal.source === "AI" && <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">AI</Badge>}
                  </div>
                  <p className="font-medium text-gray-900">{soal.text}</p>
                  {soal.options?.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      {soal.options.map((opt: string, j: number) => (
                        <li key={j} className={String(j) === String(soal.correctAnswer) ? "text-emerald-600 font-medium" : ""}>
                          {String.fromCharCode(65 + j)}. {opt} {String(j) === String(soal.correctAnswer) && "✓"}
                        </li>
                      ))}
                    </ul>
                  )}
                  {soal.explanation && <p className="mt-2 text-xs text-gray-400 italic">💡 {soal.explanation}</p>}
                </div>
                {!selectMode && (
                  <button onClick={() => soal.id && handleDelete(soal.id)} className="rounded-lg p-2 hover:bg-red-50 text-red-500 shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tambah Manual Modal */}
      <Modal isOpen={showTambah} onClose={() => setShowTambah(false)} title="Tambah Soal" className="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Pertanyaan</label>
            <textarea value={formData.text} onChange={(e) => setFormData({ ...formData, text: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm" rows={3} placeholder="Tulis pertanyaan..." />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipe</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm">
                <option value="PILIHAN_GANDA">Pilihan Ganda</option>
                <option value="ESSAY">Essay</option>
                <option value="ISIAN">Isian</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tingkat</label>
              <select value={formData.difficulty} onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm">
                <option value="EASY">Mudah</option>
                <option value="MEDIUM">Sedang</option>
                <option value="HARD">Sulit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kelas</label>
              <select value={formData.kelas} onChange={(e) => setFormData({ ...formData, kelas: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm">
                <option value="">Pilih Kelas</option>
                {KELAS.map((k) => <option key={k} value={k}>Kelas {k}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mata Pelajaran</label>
              <input value="Bahasa Indonesia" disabled className="w-full rounded-lg border px-4 py-2 text-sm bg-gray-50 text-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">KD</label>
              <select value={formData.kd} onChange={(e) => setFormData({ ...formData, kd: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm">
                <option value="">Pilih KD</option>
                {KD_OPTIONS.map((kd) => <option key={kd.value} value={kd.value}>{kd.label}</option>)}
              </select>
            </div>
          </div>
          {formData.type === "PILIHAN_GANDA" && (
            <div>
              <label className="block text-sm font-medium mb-2">Opsi Jawaban</label>
              {formData.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 w-6">{String.fromCharCode(65 + i)}.</span>
                  <input value={opt} onChange={(e) => { const n = [...formData.options]; n[i] = e.target.value; setFormData({ ...formData, options: n }); }} className="flex-1 rounded-lg border px-3 py-1.5 text-sm" placeholder={`Opsi ${String.fromCharCode(65 + i)}`} />
                  <input type="radio" name="correct" checked={formData.correctAnswer === String(i)} onChange={() => setFormData({ ...formData, correctAnswer: String(i) })} />
                </div>
              ))}
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
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowTambah(false)} className="flex-1">Batal</Button>
            <Button onClick={handleSave} disabled={saving || !formData.text || !formData.kelas} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
