"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Trash2, Zap, Upload, FileText, Loader2, CheckCircle } from "lucide-react";

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

export default function BankSoalPage() {
  const [soalList, setSoalList] = useState<any[]>([]);
  const [showTambah, setShowTambah] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: formData.text, count: 5 }),
      });
      const data = await res.json();
      if (data.soal) {
        setSoalList((prev) => [...prev, ...data.soal]);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const newSoal = {
      text: formData.text,
      type: formData.type,
      difficulty: formData.difficulty,
      options: formData.options,
      correctAnswer: formData.correctAnswer,
      explanation: formData.explanation,
      isHOTS: formData.isHOTS,
      kelas: formData.kelas,
      kd: formData.kd,
      subject: "Bahasa Indonesia",
    };
    setSoalList((prev) => [...prev, newSoal]);
    setShowTambah(false);
    setFormData({ text: "", type: "PILIHAN_GANDA", difficulty: "MEDIUM", options: ["", "", "", ""], correctAnswer: "", explanation: "", isHOTS: false, kelas: "", kd: "" });
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadResult("");
    const fd = new FormData();
    fd.set("file", selectedFile);
    fd.set("kelas", formData.kelas);
    fd.set("kd", formData.kd);
    try {
      const res = await fetch("/api/guru/bank-soal", { method: "POST", body: fd });
      const data = await res.json();
      setUploadResult(data.pesan || (data.success ? "Berhasil diupload" : data.error || "Gagal"));
      if (data.success) { setSelectedFile(null); }
    } catch { setUploadResult("Gagal upload"); }
    setUploading(false);
  };
  };

  const handleDelete = (index: number) => {
    setSoalList((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Soal</h1>
          <p className="mt-1 text-sm text-gray-600">Kelola soal untuk kuis dan tugas</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowTambah(true)}>
            <Plus className="h-4 w-4" /> Tambah Manual
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            <Zap className="h-4 w-4" /> {loading ? "Generating..." : "Generate AI"}
          </Button>
        </div>
      </div>

      {soalList.length === 0 ? (
        <Card className="py-16 text-center">
          <BookOpen className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 font-semibold">Belum ada soal</h3>
          <p className="mt-2 text-sm text-gray-500">Tambahkan soal manual atau generate dengan AI</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {soalList.map((soal, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{soal.type.replace("_", " ")}</Badge>
                    <Badge variant={soal.difficulty === "HARD" ? "destructive" : soal.difficulty === "MEDIUM" ? "warning" : "success"}>
                      {soal.difficulty}
                    </Badge>
                    {soal.isHOTS && <Badge variant="gold">HOTS</Badge>}
      </div>

      {/* Upload File */}
      <Card className="p-4 mb-6 border-2 border-dashed border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-semibold text-slate-700 mb-1">Upload File Soal</p>
            <p className="text-xs text-slate-400">PDF, DOCX — sistem akan ekstrak soal otomatis</p>
          </div>
          <input type="file" accept=".pdf,.docx" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
          <Button onClick={handleFileUpload} disabled={!selectedFile || uploading} variant="outline" className="shrink-0">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Memproses..." : "Upload & Ekstrak"}
          </Button>
        </div>
        {uploadResult && (
          <div className="mt-3 text-sm text-emerald-600 flex items-center gap-1.5 bg-emerald-50 rounded-lg px-3 py-2">
            <CheckCircle size={14} /> {uploadResult}
          </div>
        )}
      </Card>
                  <p className="font-medium">{soal.text}</p>
                  {soal.options?.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      {soal.options.map((opt: string, j: number) => (
                        <li key={j}>• {opt}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <button onClick={() => handleDelete(i)} className="rounded-lg p-2 hover:bg-red-50 text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showTambah} onClose={() => setShowTambah(false)} title="Tambah Soal" className="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Pertanyaan</label>
            <textarea
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              className="w-full rounded-lg border px-4 py-2 text-sm"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipe</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full rounded-lg border px-4 py-2 text-sm"
              >
                <option value="PILIHAN_GANDA">Pilihan Ganda</option>
                <option value="ESSAY">Essay</option>
                <option value="ISIAN">Isian</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tingkat</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full rounded-lg border px-4 py-2 text-sm"
              >
                <option value="EASY">Mudah</option>
                <option value="MEDIUM">Sedang</option>
                <option value="HARD">Sulit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kelas</label>
              <select
                value={formData.kelas}
                onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                className="w-full rounded-lg border px-4 py-2 text-sm"
              >
                <option value="">Pilih Kelas</option>
                {KELAS.map((k) => <option key={k}>Kelas {k}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mata Pelajaran</label>
              <input value="Bahasa Indonesia" disabled className="w-full rounded-lg border px-4 py-2 text-sm bg-gray-50 text-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">KD (Kompetensi Dasar)</label>
              <select
                value={formData.kd}
                onChange={(e) => setFormData({ ...formData, kd: e.target.value })}
                className="w-full rounded-lg border px-4 py-2 text-sm"
              >
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
                  <input
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...formData.options];
                      newOpts[i] = e.target.value;
                      setFormData({ ...formData, options: newOpts });
                    }}
                    className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
                    placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                  />
                  <input
                    type="radio"
                    name="correct"
                    checked={formData.correctAnswer === String.fromCharCode(65 + i)}
                    onChange={() => setFormData({ ...formData, correctAnswer: String.fromCharCode(65 + i) })}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowTambah(false)} className="flex-1">Batal</Button>
            <Button onClick={handleSave} className="flex-1">Simpan</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}