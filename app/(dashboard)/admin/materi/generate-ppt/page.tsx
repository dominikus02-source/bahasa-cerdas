"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Loader2, 
  Presentation, 
  Download,
  CheckCircle2,
  FileText,
  Upload,
  X,
  Trash2,
  AlertTriangle,
  Search,
  FolderOpen,
} from "lucide-react";
import { saveMateriAction } from "@/app/actions/upload-materi";
import { createClient } from "@/lib/supabase/client";

export default function AdminPPTGeneratorPage() {
  const [activeTab, setActiveTab] = useState("ai");

  // AI Generate state
  const [aiTitle, setAiTitle] = useState("");
  const [aiTopik, setAiTopik] = useState("");
  const [aiGrade, setAiGrade] = useState("SMA Kelas 10");
  const [aiKurikulum, setAiKurikulum] = useState("MERDEKA");
  const [aiJumlahSlide, setAiJumlahSlide] = useState(10);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiError, setAiError] = useState("");

  // Manual Upload state
  const [manualTitle, setManualTitle] = useState("");
  const [manualTopik, setManualTopik] = useState("");
  const [manualGrade, setManualGrade] = useState("SMA Kelas 10");
  const [manualKurikulum, setManualKurikulum] = useState("MERDEKA");
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualResult, setManualResult] = useState<any>(null);
  const [manualError, setManualError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // All Materi list state
  const [materis, setMateris] = useState<any[]>([]);
  const [materisLoading, setMaterisLoading] = useState(false);
  const [materisSearch, setMaterisSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const grades = [
    "SD Kelas 1", "SD Kelas 2", "SD Kelas 3", "SD Kelas 4", "SD Kelas 5", "SD Kelas 6",
    "SMP Kelas 7", "SMP Kelas 8", "SMP Kelas 9",
    "SMA Kelas 10", "SMA Kelas 11", "SMA Kelas 12",
  ];

  const fetchMateris = useCallback(async () => {
    setMaterisLoading(true);
    try {
      const res = await fetch("/api/admin/materi?limit=100");
      const data = await res.json();
      if (data.data) setMateris(data.data);
    } catch {} finally {
      setMaterisLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "all") fetchMateris();
  }, [activeTab, fetchMateris]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/materi?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMateris(prev => prev.filter(m => m.id !== id));
        setDeleteConfirm(null);
      }
    } catch {} finally {
      setDeletingId(null);
    }
  };

  const filteredMateris = materis.filter(m =>
    m.title.toLowerCase().includes(materisSearch.toLowerCase()) ||
    (m.grade || "").toLowerCase().includes(materisSearch.toLowerCase()) ||
    (m.uploader?.fullName || "").toLowerCase().includes(materisSearch.toLowerCase())
  );

  // AI Generate handler
  const handleAIGenerate = async () => {
    if (!aiTitle || !aiTopik) {
      setAiError("Judul dan topik wajib diisi");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    try {
      const res = await fetch("/api/admin/generate-ppt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: aiTitle, topik: aiTopik, grade: aiGrade, kurikulum: aiKurikulum, jumlahSlide: aiJumlahSlide }),
      });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error || "Gagal generate PPT"); return; }
      setAiResult(data);
    } catch { setAiError("Terjadi kesalahan. Silakan coba lagi."); }
    finally { setAiLoading(false); }
  };

  // Manual Upload handler - upload directly to Supabase Storage
  const handleManualUpload = async () => {
    if (!manualTitle || !manualGrade || !manualFile) {
      setManualError("Judul, kelas, dan file wajib diisi");
      return;
    }
    setManualLoading(true);
    setManualError("");
    setManualResult(null);
    try {
      const fileExt = manualFile.name.split(".").pop()?.toLowerCase();
      if (!["pptx", "pdf"].includes(fileExt || "")) {
        setManualError("File harus PPTX atau PDF");
        return;
      }

      // Configure storage bucket to accept large files
      await fetch("/api/admin/configure-storage", { method: "POST" }).catch(() => {});

      // Upload directly to Supabase Storage from client (bypasses Vercel 4.5MB limit)
      const supabase = createClient();
      const fileName = `admin/materi/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, manualFile, {
          cacheControl: "31536000",
          upsert: false,
        });

      if (uploadError) {
        const isRLS = uploadError.message?.toLowerCase().includes("row-level security") || 
                      uploadError.message?.includes("policy");
        setManualError(
          isRLS
            ? "Izin upload ditolak Supabase. Buka Supabase Dashboard → SQL Editor → jalankan perintah:\nCREATE POLICY documents_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');"
            : "Gagal upload file: " + uploadError.message
        );
        return;
      }

      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(uploadData.path);
      const fileUrl = urlData.publicUrl;

      // Save metadata to database via server action
      const result = await saveMateriAction({
        title: manualTitle,
        grade: manualGrade,
        topik: manualTopik || "",
        fileUrl,
        fileKey: uploadData.path,
        fileType: fileExt === "pdf" ? "PDF" : "PPTX",
      });

      if (result.error) {
        setManualError(result.error);
        return;
      }

      setManualResult(result);
      setManualFile(null);
      setManualTitle("");
      setManualTopik("");
    } catch (e: any) {
      console.error("Upload exception:", e);
      setManualError(e?.message || "Terjadi kesalahan. Silakan coba lagi.");
    }
    finally { setManualLoading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      const ext = dropped.name.split(".").pop()?.toLowerCase();
      if (["pptx", "pdf"].includes(ext || "")) {
        setManualFile(dropped);
        setManualError("");
      } else {
        setManualError("File harus PPTX atau PDF");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 dark:text-red-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Presentation className="w-4 h-4" />
            Admin Only
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            Kelola Materi Ajar
          </h1>
          <p className="text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
            Generate PPT dengan AI atau upload manual file PPT/PDF untuk materi pembelajaran
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generate AI
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Manual
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Semua Materi
            </TabsTrigger>
          </TabsList>

          {/* AI Generate Tab */}
          <TabsContent value="ai">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Parameter Presentasi</CardTitle>
                  <CardDescription>AI akan riset dan generate PPT profesional</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">Judul Materi *</label>
                    <Input placeholder="Contoh: Teks Prosedur" value={aiTitle} onChange={(e) => setAiTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">Topik/Pembahasan *</label>
                    <Textarea placeholder="Deskripsikan topik yang akan dibahas..." value={aiTopik} onChange={(e) => setAiTopik(e.target.value)} className="min-h-[100px]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">Kelas</label>
                      <select value={aiGrade} onChange={(e) => setAiGrade(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800/90">
                        {grades.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">Kurikulum</label>
                      <select value={aiKurikulum} onChange={(e) => setAiKurikulum(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800/90">
                        <option value="MERDEKA">Kurikulum Nasional</option>
                        <option value="K13">Kurikulum 2013</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">Jumlah Slide: {aiJumlahSlide}</label>
                    <input type="range" min="5" max="20" value={aiJumlahSlide} onChange={(e) => setAiJumlahSlide(parseInt(e.target.value))} className="w-full" />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400"><span>5 slide</span><span>20 slide</span></div>
                  </div>
                  <Button onClick={handleAIGenerate} disabled={aiLoading} className="w-full bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700">
                    {aiLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Buat PPT...</> : <><Sparkles className="w-4 h-4 mr-2" /> Buat PPT dengan AI</>}
                  </Button>
                  {aiError && <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">{aiError}</div>}
                </CardContent>
              </Card>

              {/* Result Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Hasil Generate AI</CardTitle>
                  <CardDescription>Preview dan download PPT yang sudah di-generate</CardDescription>
                </CardHeader>
                <CardContent>
                  {!aiResult && !aiLoading && (
                    <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                      <Presentation className="w-12 h-12 mb-4" />
                      <p className="text-lg font-medium">Belum ada hasil</p>
                      <p className="text-sm">Isi parameter dan klik &ldquo;Generate PPT dengan AI&rdquo;</p>
                    </div>
                  )}
                  {aiLoading && (
                    <div className="flex flex-col items-center justify-center h-[400px]">
                      <Loader2 className="w-12 h-12 animate-spin text-red-600 dark:text-red-400 mb-4" />
                      <p className="text-lg font-medium text-gray-600 dark:text-slate-300">AI sedang generate PPT...</p>
                      <p className="text-sm text-gray-400">Mohon tunggu sebentar</p>
                    </div>
                  )}
                  {aiResult && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <p className="font-medium text-green-700 dark:text-green-300">PPT Berhasil Di-generate!</p>
                        </div>
                        <p className="text-sm text-green-600 dark:text-green-400">{aiResult.slides} slide telah dibuat dan tersimpan</p>
                        {aiResult.warning && <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 rounded text-yellow-700 dark:text-yellow-300 text-xs">⚠️ {aiResult.warning}</div>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg"><p className="text-xs text-gray-500 dark:text-slate-400">Judul</p><p className="text-sm font-medium text-gray-900 dark:text-slate-100">{aiResult.materi?.title}</p></div>
                        <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg"><p className="text-xs text-gray-500 dark:text-slate-400">Kelas</p><p className="text-sm font-medium text-gray-900 dark:text-slate-100">{aiResult.materi?.grade}</p></div>
                        <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg"><p className="text-xs text-gray-500 dark:text-slate-400">Jumlah Slide</p><p className="text-sm font-medium text-gray-900 dark:text-slate-100">{aiResult.slides}</p></div>
                        <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg"><p className="text-xs text-gray-500 dark:text-slate-400">File Type</p><p className="text-sm font-medium text-gray-900 dark:text-slate-100">{aiResult.materi?.fileType}</p></div>
                      </div>
                      {aiResult.downloadUrl && (
                        <a href={aiResult.downloadUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                            <Download className="w-4 h-4 mr-2" /> Unduh PPTX
                          </Button>
                        </a>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Manual Upload Tab */}
          <TabsContent value="manual">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload File Manual</CardTitle>
                  <CardDescription>Upload file PPT/PDF yang sudah dibuat</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">Judul Materi *</label>
                    <Input placeholder="Contoh: Teks Prosedur" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">Deskripsi/Topik</label>
                    <Textarea placeholder="Deskripsi singkat materi..." value={manualTopik} onChange={(e) => setManualTopik(e.target.value)} className="min-h-[80px]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">Kelas *</label>
                      <select value={manualGrade} onChange={(e) => setManualGrade(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800/90">
                        {grades.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">Kurikulum</label>
                      <select value={manualKurikulum} onChange={(e) => setManualKurikulum(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800/90">
                        <option value="MERDEKA">Kurikulum Nasional</option>
                        <option value="K13">Kurikulum 2013</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">File PPT/PDF *</label>
                    <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragOver ? "border-red-500 bg-red-50 dark:bg-red-950/40" : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:border-slate-600"}`}>
                      {manualFile ? (
                        <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
                          <FileText size={20} />
                          <span className="text-sm font-medium">{manualFile.name}</span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">({(manualFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                          <button type="button" onClick={() => setManualFile(null)} className="ml-2 text-gray-400 hover:text-red-500 dark:text-red-400"><X size={16} /></button>
                        </div>
                      ) : (
                        <div>
                          <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 dark:text-slate-300">Drag & drop atau <label className="text-red-600 dark:text-red-400 font-medium cursor-pointer hover:underline">browse
                            <input type="file" className="hidden" accept=".pptx,.pdf" onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) { const ext = f.name.split(".").pop()?.toLowerCase(); if (["pptx", "pdf"].includes(ext || "")) { setManualFile(f); setManualError(""); } else { setManualError("File harus PPTX atau PDF"); } }
                            }} />
                          </label></p>
                          <p className="text-xs text-gray-400 mt-1">PPTX atau PDF (max 50MB)</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button onClick={handleManualUpload} disabled={manualLoading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                    {manualLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengunggah...</> : <><Upload className="w-4 h-4 mr-2" /> Unggah Materi</>}
                  </Button>
                  {manualError && <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">{manualError}</div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hasil Upload</CardTitle>
                  <CardDescription>Preview materi yang sudah di-upload</CardDescription>
                </CardHeader>
                <CardContent>
                  {!manualResult && !manualLoading && (
                    <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                      <Upload className="w-12 h-12 mb-4" />
                      <p className="text-lg font-medium">Belum ada upload</p>
                      <p className="text-sm">Upload file PPT/PDF untuk menambahkan materi</p>
                    </div>
                  )}
                  {manualLoading && (
                    <div className="flex flex-col items-center justify-center h-[400px]">
                      <Loader2 className="w-12 h-12 animate-spin text-emerald-600 dark:text-emerald-400 mb-4" />
                      <p className="text-lg font-medium text-gray-600 dark:text-slate-300">Uploading file...</p>
                      <p className="text-sm text-gray-400">Mohon tunggu sebentar</p>
                    </div>
                  )}
                  {manualResult && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <p className="font-medium text-green-700 dark:text-green-300">Upload Berhasil!</p>
                        </div>
                        <p className="text-sm text-green-600 dark:text-green-400">Materi telah tersimpan dan siap digunakan</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg"><p className="text-xs text-gray-500 dark:text-slate-400">Judul</p><p className="text-sm font-medium text-gray-900 dark:text-slate-100">{manualResult.materi?.title}</p></div>
                        <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg"><p className="text-xs text-gray-500 dark:text-slate-400">Kelas</p><p className="text-sm font-medium text-gray-900 dark:text-slate-100">{manualResult.materi?.grade}</p></div>
                        <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg"><p className="text-xs text-gray-500 dark:text-slate-400">File Type</p><p className="text-sm font-medium text-gray-900 dark:text-slate-100">{manualResult.materi?.fileType}</p></div>
                        <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg"><p className="text-xs text-gray-500 dark:text-slate-400">Status</p>                        <p className="text-sm font-medium text-green-600 dark:text-green-400">Diterbitkan</p></div>
                      </div>
                      {manualResult.downloadUrl && (
                        <a href={manualResult.downloadUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                            <Download className="w-4 h-4 mr-2" /> Download File
                          </Button>
                        </a>
                      )}
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-lg">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Info</p>
                        <ul className="space-y-1 text-sm text-blue-600 dark:text-blue-400">
                          <li>• Materi langsung published</li>
                          <li>• Guru bisa akses di menu Materi Ajar</li>
                          <li>• File tersimpan di Supabase Storage</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* All Materi Tab */}
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Semua Materi Ajar</CardTitle>
                    <CardDescription>{materis.length} materi total — dikelola oleh admin</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchMateris} disabled={materisLoading}>
                    <Loader2 className={`w-4 h-4 mr-2 ${materisLoading ? "animate-spin" : ""}`} />
                    Muat Ulang
                  </Button>
                </div>
                <div className="relative mt-3">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Cari materi..." value={materisSearch} onChange={e => setMaterisSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                </div>
              </CardHeader>
              <CardContent>
                {materisLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-16 bg-gray-50 dark:bg-slate-800/60 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : filteredMateris.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3" />
                    <p className="font-medium">Belum ada materi</p>
                    <p className="text-sm">Generate atau upload materi terlebih dahulu</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredMateris.map((m) => (
                      <div key={m.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800/60 rounded-xl hover:bg-gray-100 dark:bg-slate-800/80 transition-colors group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 ${m.fileType === "PPTX" ? "bg-orange-500" : "bg-red-500"}`}>
                          {m.fileType || "FILE"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">{m.title}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {m.grade || "—"} • {m.fileType || "—"} • oleh {m.uploader?.fullName || "Admin"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {m.fileUrl && (
                            <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-950/40 rounded-lg transition-colors" title="Download">
                              <Download size={16} />
                            </a>
                          )}
                          {deleteConfirm === m.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(m.id)} disabled={deletingId === m.id}
                                className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                                {deletingId === m.id ? "..." : "Hapus"}
                              </button>
                              <button onClick={() => setDeleteConfirm(null)}
                                className="px-3 py-1.5 text-xs font-semibold bg-gray-200 dark:bg-slate-700/80 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-300 transition-colors">
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(m.id)}
                              className="p-2 text-gray-400 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-950/40 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Hapus">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
