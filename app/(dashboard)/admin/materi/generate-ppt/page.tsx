"use client";

import { useState } from "react";
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
  X
} from "lucide-react";

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

  const grades = [
    "SD Kelas 1", "SD Kelas 2", "SD Kelas 3", "SD Kelas 4", "SD Kelas 5", "SD Kelas 6",
    "SMP Kelas 7", "SMP Kelas 8", "SMP Kelas 9",
    "SMA Kelas 10", "SMA Kelas 11", "SMA Kelas 12",
  ];

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

      if (!res.ok) {
        setAiError(data.error || "Gagal generate PPT");
        return;
      }

      setAiResult(data);
    } catch (err) {
      setAiError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setAiLoading(false);
    }
  };

  // Manual Upload handler
  const handleManualUpload = async () => {
    if (!manualTitle || !manualGrade || !manualFile) {
      setManualError("Judul, kelas, dan file wajib diisi");
      return;
    }

    setManualLoading(true);
    setManualError("");
    setManualResult(null);

    try {
      const formData = new FormData();
      formData.append("file", manualFile);
      formData.append("title", manualTitle);
      formData.append("grade", manualGrade);
      formData.append("topik", manualTopik || "");
      formData.append("kurikulum", manualKurikulum);

      const res = await fetch("/api/admin/upload-materi", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setManualError(data.error || "Gagal upload file");
        return;
      }

      setManualResult(data);
      setManualFile(null);
      setManualTitle("");
      setManualTopik("");
    } catch (err) {
      setManualError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setManualLoading(false);
    }
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
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Presentation className="w-4 h-4" />
            Admin Only
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Kelola Materi Ajar
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Generate PPT dengan AI atau upload manual file PPT/PDF untuk materi pembelajaran
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generate dengan AI
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Manual
            </TabsTrigger>
          </TabsList>

          {/* AI Generate Tab */}
          <TabsContent value="ai">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Parameter Presentasi</CardTitle>
                  <CardDescription>
                    AI akan riset dan generate PPT profesional
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Judul Materi *
                    </label>
                    <Input
                      placeholder="Contoh: Teks Prosedur"
                      value={aiTitle}
                      onChange={(e) => setAiTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Topik/Pembahasan *
                    </label>
                    <Textarea
                      placeholder="Deskripsikan topik yang akan dibahas..."
                      value={aiTopik}
                      onChange={(e) => setAiTopik(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Kelas
                      </label>
                      <select
                        value={aiGrade}
                        onChange={(e) => setAiGrade(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      >
                        {grades.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Kurikulum
                      </label>
                      <select
                        value={aiKurikulum}
                        onChange={(e) => setAiKurikulum(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      >
                        <option value="MERDEKA">Kurikulum Merdeka</option>
                        <option value="K13">Kurikulum 2013</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Jumlah Slide: {aiJumlahSlide}
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="20"
                      value={aiJumlahSlide}
                      onChange={(e) => setAiJumlahSlide(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>5 slide</span>
                      <span>20 slide</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleAIGenerate}
                    disabled={aiLoading}
                    className="w-full bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generate PPT...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate PPT dengan AI
                      </>
                    )}
                  </Button>

                  {aiError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      {aiError}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Result Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Hasil Generate AI</CardTitle>
                  <CardDescription>
                    Preview dan download PPT yang sudah di-generate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!aiResult && !aiLoading && (
                    <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                      <Presentation className="w-12 h-12 mb-4" />
                      <p className="text-lg font-medium">Belum ada hasil</p>
                      <p className="text-sm">Isi parameter dan klik "Generate PPT dengan AI"</p>
                    </div>
                  )}

                  {aiLoading && (
                    <div className="flex flex-col items-center justify-center h-[400px]">
                      <Loader2 className="w-12 h-12 animate-spin text-red-600 mb-4" />
                      <p className="text-lg font-medium text-gray-600">AI sedang generate PPT...</p>
                      <p className="text-sm text-gray-400">Mohon tunggu sebentar</p>
                    </div>
                  )}

                  {aiResult && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <p className="font-medium text-green-700">PPT Berhasil Di-generate!</p>
                        </div>
                        <p className="text-sm text-green-600">
                          {aiResult.slides} slide telah dibuat dan tersimpan
                        </p>
                        {aiResult.warning && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-xs">
                            ⚠️ {aiResult.warning}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Judul</p>
                          <p className="text-sm font-medium text-gray-900">{aiResult.materi?.title}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Kelas</p>
                          <p className="text-sm font-medium text-gray-900">{aiResult.materi?.grade}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Jumlah Slide</p>
                          <p className="text-sm font-medium text-gray-900">{aiResult.slides}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">File Type</p>
                          <p className="text-sm font-medium text-gray-900">{aiResult.materi?.fileType}</p>
                        </div>
                      </div>

                      <a
                        href={aiResult.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                          <Download className="w-4 h-4 mr-2" />
                          Download PPTX
                        </Button>
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Manual Upload Tab */}
          <TabsContent value="manual">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Upload File Manual</CardTitle>
                  <CardDescription>
                    Upload file PPT/PDF yang sudah dibuat
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Judul Materi *
                    </label>
                    <Input
                      placeholder="Contoh: Teks Prosedur"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Deskripsi/Topik
                    </label>
                    <Textarea
                      placeholder="Deskripsi singkat materi..."
                      value={manualTopik}
                      onChange={(e) => setManualTopik(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Kelas *
                      </label>
                      <select
                        value={manualGrade}
                        onChange={(e) => setManualGrade(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      >
                        {grades.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Kurikulum
                      </label>
                      <select
                        value={manualKurikulum}
                        onChange={(e) => setManualKurikulum(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      >
                        <option value="MERDEKA">Kurikulum Merdeka</option>
                        <option value="K13">Kurikulum 2013</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      File PPT/PDF *
                    </label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                        dragOver ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {manualFile ? (
                        <div className="flex items-center justify-center gap-2 text-red-600">
                          <FileText size={20} />
                          <span className="text-sm font-medium">{manualFile.name}</span>
                          <span className="text-xs text-gray-500">({(manualFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                          <button type="button" onClick={() => setManualFile(null)} className="ml-2 text-gray-400 hover:text-red-500">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">
                            Drag & drop atau{" "}
                            <label className="text-red-600 font-medium cursor-pointer hover:underline">
                              browse
                              <input
                                type="file"
                                className="hidden"
                                accept=".pptx,.pdf"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    const ext = f.name.split(".").pop()?.toLowerCase();
                                    if (["pptx", "pdf"].includes(ext || "")) {
                                      setManualFile(f);
                                      setManualError("");
                                    } else {
                                      setManualError("File harus PPTX atau PDF");
                                    }
                                  }
                                }}
                              />
                            </label>
                          </p>
                          <p className="text-xs text-gray-400 mt-1">PPTX atau PDF (max 50MB)</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleManualUpload}
                    disabled={manualLoading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  >
                    {manualLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Materi
                      </>
                    )}
                  </Button>

                  {manualError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      {manualError}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upload Result */}
              <Card>
                <CardHeader>
                  <CardTitle>Hasil Upload</CardTitle>
                  <CardDescription>
                    Preview materi yang sudah di-upload
                  </CardDescription>
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
                      <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mb-4" />
                      <p className="text-lg font-medium text-gray-600">Uploading file...</p>
                      <p className="text-sm text-gray-400">Mohon tunggu sebentar</p>
                    </div>
                  )}

                  {manualResult && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <p className="font-medium text-green-700">Upload Berhasil!</p>
                        </div>
                        <p className="text-sm text-green-600">
                          Materi telah tersimpan dan siap digunakan
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Judul</p>
                          <p className="text-sm font-medium text-gray-900">{manualResult.materi?.title}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Kelas</p>
                          <p className="text-sm font-medium text-gray-900">{manualResult.materi?.grade}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">File Type</p>
                          <p className="text-sm font-medium text-gray-900">{manualResult.materi?.fileType}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Status</p>
                          <p className="text-sm font-medium text-green-600">Published</p>
                        </div>
                      </div>

                      <a
                        href={manualResult.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                          <Download className="w-4 h-4 mr-2" />
                          Download File
                        </Button>
                      </a>

                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                        <p className="text-sm font-medium text-blue-700 mb-2">Info</p>
                        <ul className="space-y-1 text-sm text-blue-600">
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
        </Tabs>
      </div>
    </div>
  );
}
