"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Zap, Download, Trash2, Upload, Loader2, Eye, FileUp, CheckCircle, BookOpen, Layers, Check, X, Printer, Save } from "lucide-react";

type Tab = "generate" | "upload" | "list";
type DocType = "RPP" | "MODUL";

const KELAS = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const SEMESTER = ["1", "2"];
const TAHUN_AJARAN = ["2025/2026", "2026/2027", "2027/2028"];

const METODE_OPTIONS = [
  { value: "Diskusi", label: "Diskusi", icon: "💬" },
  { value: "Ceramah", label: "Ceramah", icon: "🎤" },
  { value: "Project Based Learning", label: "Project Based", icon: "🔨" },
  { value: "Problem Based Learning", label: "Problem Based", icon: "🧩" },
  { value: "Inquiry", label: "Inquiry", icon: "🔍" },
  { value: "Game Based Learning", label: "Game Based", icon: "🎮" },
  { value: "Blended Learning", label: "Blended", icon: "💻" },
  { value: "Cooperative Learning", label: "Cooperative", icon: "🤝" },
  { value: "Discovery Learning", label: "Discovery", icon: "🔎" },
];

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
  { value: "4.3", label: "4.3 - Membaca Pemahaman" },
];

export default function RPPModulPage() {
  const [activeTab, setActiveTab] = useState<Tab>("generate");
  const [docType, setDocType] = useState<DocType>("RPP");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const [rppList, setRppList] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [genForm, setGenForm] = useState({
    kd1: "",
    kd2: "",
    kd3: "",
    kelas: "10",
    topik: "",
    alokasi: "2x40",
    metode1: "",
    metode2: "",
    metode3: "",
  });

  const [uploadForm, setUploadForm] = useState({
    title: "",
    kelas: "10",
    semester: "1",
    tahunAjaran: "2025/2026",
  });

  const fetchDocs = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/guru/generated-rpp?type=${docType}`);
      const data = await res.json();
      if (data.data) setRppList(data.data);
    } catch (e) {
      console.error(e);
    }
    setFetching(false);
  }, [docType]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const kds = [genForm.kd1, genForm.kd2, genForm.kd3].filter(Boolean);
      const methods = [genForm.metode1, genForm.metode2, genForm.metode3].filter(Boolean);
      const res = await fetch("/api/ai/rpp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kd: kds.join(", "),
          kelas: genForm.kelas,
          topik: genForm.topik,
          alokasi: genForm.alokasi,
          metode: methods.join(", "),
          type: docType,
        }),
      });
      const data = await res.json();
      if (data.rpp) setGenerated(data.rpp);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!generated || !genForm.topik) return;
    setSaving(true);
    try {
      const kds = [genForm.kd1, genForm.kd2, genForm.kd3].filter(Boolean);
      const methods = [genForm.metode1, genForm.metode2, genForm.metode3].filter(Boolean);
      const res = await fetch("/api/guru/generated-rpp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: docType,
          title: generated.title || `${docType} ${genForm.topik}`,
          description: generated.description || "",
          kelas: genForm.kelas,
          semester: 1,
          tahunAjaran: "2025/2026",
          kds,
          methods,
          content: generated,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchDocs();
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.title) return;
    setUploading(true);
    setUploadResult("");
    const fd = new FormData();
    fd.set("file", selectedFile);
    fd.set("title", uploadForm.title);
    fd.set("kelas", uploadForm.kelas);
    fd.set("semester", uploadForm.semester);
    fd.set("tahunAjaran", uploadForm.tahunAjaran);
    fd.set("isPublished", "true");
    try {
      const res = await fetch("/api/guru/rpp", { method: "POST", body: fd });
      const data = await res.json();
      if (data.rpp) {
        setUploadResult("Berhasil diupload!");
        setSelectedFile(null);
        setUploadForm({ title: "", kelas: "10", semester: "1", tahunAjaran: "2025/2026" });
      } else {
        setUploadResult(data.error || "Gagal upload");
      }
    } catch {
      setUploadResult("Gagal upload");
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/guru/generated-rpp?id=${id}`, { method: "DELETE" });
      fetchDocs();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMetode = (num: 1 | 2 | 3, value: string) => {
    const key = `metode${num}` as keyof typeof genForm;
    setGenForm({ ...genForm, [key]: genForm[key] === value ? "" : value });
  };

  const toggleKd = (num: 1 | 2 | 3, value: string) => {
    const key = `kd${num}` as keyof typeof genForm;
    setGenForm({ ...genForm, [key]: genForm[key] === value ? "" : value });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "generate", label: `Generate AI`, icon: <Zap className="h-4 w-4" /> },
    { id: "upload", label: "Upload File", icon: <Upload className="h-4 w-4" /> },
    { id: "list", label: `Daftar ${docType} (${rppList.length})`, icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">RPP & Modul Ajar</h1>
        <p className="mt-1 text-sm text-gray-600">Generate dengan AI atau upload file</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Generate AI Tab */}
      {activeTab === "generate" && (
        <div className="max-w-3xl space-y-6">
          {/* Type Selector */}
          <div className="flex gap-3">
            <button
              onClick={() => setDocType("RPP")}
              className={`flex-1 p-4 rounded-2xl border-2 transition-all text-center ${
                docType === "RPP"
                  ? "border-emerald-500 bg-emerald-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <BookOpen size={24} className={`mx-auto mb-2 ${docType === "RPP" ? "text-emerald-600" : "text-gray-400"}`} />
              <p className={`font-bold ${docType === "RPP" ? "text-emerald-700" : "text-gray-700"}`}>RPP</p>
              <p className="text-xs text-gray-500">Rencana Pelaksanaan Pembelajaran</p>
            </button>
            <button
              onClick={() => setDocType("MODUL")}
              className={`flex-1 p-4 rounded-2xl border-2 transition-all text-center ${
                docType === "MODUL"
                  ? "border-blue-500 bg-blue-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <Layers size={24} className={`mx-auto mb-2 ${docType === "MODUL" ? "text-blue-600" : "text-gray-400"}`} />
              <p className={`font-bold ${docType === "MODUL" ? "text-blue-700" : "text-gray-700"}`}>Modul Ajar</p>
              <p className="text-xs text-gray-500">Modul Pembelajaran Lengkap</p>
            </button>
          </div>

          <Card className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" /> Generate {docType} dengan AI
            </h2>
            <div className="space-y-5">
              {/* Kelas & Mapel */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Kelas</label>
                  <select value={genForm.kelas} onChange={(e) => setGenForm({ ...genForm, kelas: e.target.value })} className="w-full rounded-lg border px-4 py-2">
                    {KELAS.map((k) => <option key={k} value={k}>Kelas {k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mata Pelajaran</label>
                  <input value="Bahasa Indonesia" disabled className="w-full rounded-lg border px-4 py-2 bg-gray-50 text-gray-600" />
                </div>
              </div>

              {/* KD Selection (3) */}
              <div>
                <label className="block text-sm font-medium mb-2">KD / Kompetensi Dasar (pilih sampai 3)</label>
                <div className="space-y-2">
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400 w-8">KD {num}</span>
                      <select
                        value={genForm[`kd${num}` as keyof typeof genForm] as string}
                        onChange={(e) => toggleKd(num as 1 | 2 | 3, e.target.value)}
                        className="flex-1 rounded-lg border px-4 py-2 text-sm"
                      >
                        <option value="">Pilih KD...</option>
                        {KD_OPTIONS.map((kd) => <option key={kd.value} value={kd.value}>{kd.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metode Pembelajaran (3) */}
              <div>
                <label className="block text-sm font-medium mb-2">Metode Pembelajaran (pilih sampai 3)</label>
                <div className="grid grid-cols-3 gap-2">
                  {METODE_OPTIONS.map((m) => {
                    const isSelected = genForm.metode1 === m.value || genForm.metode2 === m.value || genForm.metode3 === m.value;
                    return (
                      <button
                        key={m.value}
                        onClick={() => {
                          if (!genForm.metode1) toggleMetode(1, m.value);
                          else if (!genForm.metode2) toggleMetode(2, m.value);
                          else if (!genForm.metode3) toggleMetode(3, m.value);
                          else toggleMetode(1, m.value);
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-sm transition-all ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span>{m.icon}</span>
                        <span className="font-medium">{m.label}</span>
                        {isSelected && <Check size={14} className="ml-auto text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Alokasi & Topik */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Alokasi Waktu</label>
                  <input value={genForm.alokasi} onChange={(e) => setGenForm({ ...genForm, alokasi: e.target.value })} className="w-full rounded-lg border px-4 py-2" placeholder="2x40 menit" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Topik / Materi</label>
                <textarea value={genForm.topik} onChange={(e) => setGenForm({ ...genForm, topik: e.target.value })} className="w-full rounded-lg border px-4 py-2" rows={2} placeholder="Teks Negosiasi" />
              </div>

              <Button onClick={handleGenerate} disabled={loading} className="w-full">
                <Zap className="h-4 w-4" /> {loading ? "Generating..." : `Generate ${docType} dengan AI`}
              </Button>
            </div>
          </Card>

          {/* Generated Result */}
          {generated && (
            <Card className="p-0 overflow-hidden border-2 border-emerald-200">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-white/20 text-white border-0">{docType} Generated</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setPreviewDoc(generated)}>
                      <Eye className="h-4 w-4" /> Preview
                    </Button>
                    <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? "Saving..." : "Simpan"}
                    </Button>
                  </div>
                </div>
                <h3 className="text-xl font-bold">{generated.title || `${docType} ${genForm.topik}`}</h3>
                <p className="text-white/70 text-sm mt-1">Kelas {genForm.kelas} • Bahasa Indonesia</p>
              </div>

              {/* Content Preview */}
              <div className="p-6 space-y-4 bg-white">
                {generated.competency && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Kompetensi</p>
                    <p className="text-sm text-gray-800">{generated.competency}</p>
                  </div>
                )}
                {generated.indicators && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Indikator</p>
                    <p className="text-sm text-gray-800">{generated.indicators}</p>
                  </div>
                )}
                {generated.learningSteps && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Langkah Pembelajaran</p>
                    <ol className="text-sm text-gray-800 list-decimal list-inside space-y-1">
                      {generated.learningSteps.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {generated.assessment && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Penilaian</p>
                    <p className="text-sm text-gray-800">{generated.assessment}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Upload File Tab */}
      {activeTab === "upload" && (
        <Card className="p-6 max-w-2xl">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <FileUp className="h-5 w-5 text-blue-500" /> Upload {docType}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Judul</label>
              <input value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} className="w-full rounded-lg border px-4 py-2" placeholder={`${docType} Teks Negosiasi Kelas 10`} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Kelas</label>
                <select value={uploadForm.kelas} onChange={(e) => setUploadForm({ ...uploadForm, kelas: e.target.value })} className="w-full rounded-lg border px-4 py-2">
                  {KELAS.map((k) => <option key={k} value={k}>Kelas {k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Semester</label>
                <select value={uploadForm.semester} onChange={(e) => setUploadForm({ ...uploadForm, semester: e.target.value })} className="w-full rounded-lg border px-4 py-2">
                  {SEMESTER.map((s) => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tahun Ajaran</label>
                <select value={uploadForm.tahunAjaran} onChange={(e) => setUploadForm({ ...uploadForm, tahunAjaran: e.target.value })} className="w-full rounded-lg border px-4 py-2">
                  {TAHUN_AJARAN.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">File (PDF, DOCX, PPTX)</label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                <input type="file" accept=".pdf,.docx,.pptx" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" id="rpp-file" />
                <label htmlFor="rpp-file" className="cursor-pointer">
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600">
                      <CheckCircle size={20} />
                      <span className="font-medium">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Klik untuk pilih file</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, DOCX, PPTX (max 20MB)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
            <Button onClick={handleUpload} disabled={!selectedFile || !uploadForm.title || uploading} className="w-full">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : `Upload ${docType}`}
            </Button>
            {uploadResult && (
              <div className={`text-sm flex items-center gap-1.5 rounded-lg px-3 py-2 ${uploadResult.includes("Berhasil") ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"}`}>
                <CheckCircle size={14} /> {uploadResult}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Daftar Tab */}
      {activeTab === "list" && (
        <div>
          {fetching ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
          ) : rppList.length === 0 ? (
            <Card className="py-16 text-center">
              <FileText className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 font-semibold">Belum ada {docType}</h3>
              <p className="mt-2 text-sm text-gray-500">Generate dengan AI atau upload file</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {rppList.map((doc) => (
                <Card key={doc.id} className="p-5 hover:shadow-md transition-shadow border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={doc.type === "MODUL" ? "default" : "secondary"}>{doc.type || docType}</Badge>
                        <Badge>Kelas {doc.kelas}</Badge>
                        {doc.isPublished && <Badge variant="success">Published</Badge>}
                      </div>
                      <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                      {doc.description && <p className="text-sm text-gray-500 mt-1">{doc.description}</p>}
                      {doc.kds && doc.kds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {doc.kds.map((kd: string, i: number) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{kd}</span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">{new Date(doc.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => setPreviewDoc(doc.content || doc)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(doc.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Print Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">{previewDoc.title || "Preview"}</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  <Printer size={14} className="mr-1" /> Print
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPreviewDoc(null)}>Tutup</Button>
              </div>
            </div>

            {/* Document Content */}
            <div className="p-8 print:p-0">
              {/* Document Header */}
              <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
                <p className="text-sm text-gray-500 mb-1">RENCANA PELAKSANAAN PEMBELAJARAN</p>
                <h1 className="text-2xl font-bold text-gray-900">{previewDoc.title || "RPP Bahasa Indonesia"}</h1>
                <div className="flex items-center justify-center gap-4 mt-3 text-sm text-gray-500">
                  <span>Kelas {previewDoc.kelas || genForm.kelas}</span>
                  <span>•</span>
                  <span>Bahasa Indonesia</span>
                  <span>•</span>
                  <span>Alokasi: {genForm.alokasi || "2x40"} menit</span>
                </div>
              </div>

              {/* KD */}
              {(previewDoc.kds?.length > 0 || genForm.kd1 || genForm.kd2 || genForm.kd3) && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Kompetensi Dasar</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                    {[genForm.kd1, genForm.kd2, genForm.kd3, ...(previewDoc.kds || [])].filter(Boolean).map((kd: string, i: number) => (
                      <p key={i} className="text-sm text-gray-700">{i + 1}. {kd}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Methods */}
              {(previewDoc.methods?.length > 0 || genForm.metode1 || genForm.metode2 || genForm.metode3) && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Metode Pembelajaran</h3>
                  <div className="flex flex-wrap gap-2">
                    {[genForm.metode1, genForm.metode2, genForm.metode3, ...(previewDoc.methods || [])].filter(Boolean).map((m: string, i: number) => (
                      <Badge key={i} variant="secondary">{m}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Competency */}
              {previewDoc.competency && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Kompetensi</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4">{previewDoc.competency}</p>
                </div>
              )}

              {/* Indicators */}
              {previewDoc.indicators && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Indikator</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4">{previewDoc.indicators}</p>
                </div>
              )}

              {/* Learning Steps */}
              {previewDoc.learningSteps && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Langkah Pembelajaran</h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <ol className="space-y-3">
                      {previewDoc.learningSteps.map((step: string, i: number) => (
                        <li key={i} className="flex gap-3 text-sm text-gray-700">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {/* Assessment */}
              {previewDoc.assessment && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Penilaian</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4">{previewDoc.assessment}</p>
                </div>
              )}

              {/* Differentiation */}
              {previewDoc.differentiation && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Diferensiasi</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4">{previewDoc.differentiation}</p>
                </div>
              )}

              {/* Materials */}
              {previewDoc.materials && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Materi & Referensi</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4">{previewDoc.materials}</p>
                </div>
              )}

              {/* Description fallback */}
              {previewDoc.description && !previewDoc.learningSteps && (
                <div className="mb-6">
                  <p className="text-sm text-gray-700 leading-relaxed">{previewDoc.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
