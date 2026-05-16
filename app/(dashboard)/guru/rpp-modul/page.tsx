"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Zap, Download, Trash2, Upload, Loader2, Eye, FileUp, CheckCircle } from "lucide-react";

type Tab = "generate" | "upload" | "list";
const KELAS = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const SEMESTER = ["1", "2"];
const TAHUN_AJARAN = ["2025/2026", "2026/2027", "2027/2028"];

export default function RPPModulPage() {
  const [activeTab, setActiveTab] = useState<Tab>("generate");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const [rppList, setRppList] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRpp, setPreviewRpp] = useState<any>(null);

  const [genForm, setGenForm] = useState({
    kd: "",
    kelas: "10",
    topik: "",
    alokasi: "2x40",
    metode: "Diskusi",
  });

  const [uploadForm, setUploadForm] = useState({
    title: "",
    kelas: "10",
    semester: "1",
    tahunAjaran: "2025/2026",
  });

  const fetchRpp = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/guru/rpp");
      const data = await res.json();
      if (data.data) setRppList(data.data);
    } catch (e) {
      console.error(e);
    }
    setFetching(false);
  }, []);

  useEffect(() => { fetchRpp(); }, [fetchRpp]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/rpp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(genForm),
      });
      const data = await res.json();
      if (data.rpp) setGenerated(data.rpp);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
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
        setUploadResult("RPP berhasil diupload!");
        setSelectedFile(null);
        setUploadForm({ title: "", kelas: "10", semester: "1", tahunAjaran: "2025/2026" });
        fetchRpp();
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
      await fetch(`/api/guru/rpp?id=${id}`, { method: "DELETE" });
      setRppList((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = (rpp: any) => {
    if (rpp.fileUrl) {
      window.open(rpp.fileUrl, "_blank");
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "generate", label: "Generate AI", icon: <Zap className="h-4 w-4" /> },
    { id: "upload", label: "Upload File", icon: <Upload className="h-4 w-4" /> },
    { id: "list", label: `Daftar RPP (${rppList.length})`, icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">RPP & Modul Ajar</h1>
        <p className="mt-1 text-sm text-gray-600">Generate dengan AI atau upload file RPP/Modul</p>
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
        <Card className="p-6 max-w-2xl">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" /> Generate RPP dengan AI
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Kelas</label>
                <select
                  value={genForm.kelas}
                  onChange={(e) => setGenForm({ ...genForm, kelas: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2"
                >
                  {KELAS.map((k) => <option key={k} value={k}>Kelas {k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mata Pelajaran</label>
                <input value="Bahasa Indonesia" disabled className="w-full rounded-lg border px-4 py-2 bg-gray-50 text-gray-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Alokasi Waktu</label>
                <input
                  value={genForm.alokasi}
                  onChange={(e) => setGenForm({ ...genForm, alokasi: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2"
                  placeholder="2x40 menit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Metode</label>
                <select
                  value={genForm.metode}
                  onChange={(e) => setGenForm({ ...genForm, metode: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2"
                >
                  <option>Diskusi</option>
                  <option>Ceramah</option>
                  <option>Project Based</option>
                  <option>Problem Based</option>
                  <option>Inquiry</option>
                  <option>Game Based</option>
                  <option>Blended Learning</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">KD / Kompetensi Dasar</label>
              <input
                value={genForm.kd}
                onChange={(e) => setGenForm({ ...genForm, kd: e.target.value })}
                className="w-full rounded-lg border px-4 py-2"
                placeholder="3.1 Menganalisis struktur teks..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Topik / Materi</label>
              <textarea
                value={genForm.topik}
                onChange={(e) => setGenForm({ ...genForm, topik: e.target.value })}
                className="w-full rounded-lg border px-4 py-2"
                rows={2}
                placeholder="Teks Negosiasi"
              />
            </div>
            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              <Zap className="h-4 w-4" /> {loading ? "Generating..." : "Generate RPP dengan AI"}
            </Button>
          </div>

          {generated && (
            <div className="mt-6 rounded-lg border bg-emerald-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="success">RPP Generated</Badge>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPreviewRpp(generated)}>
                    <Eye className="h-4 w-4" /> Preview
                  </Button>
                </div>
              </div>
              <h3 className="font-bold text-lg">{generated.title || "RPP Bahasa Indonesia"}</h3>
              {generated.competency && (
                <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Kompetensi:</span> {generated.competency}</p>
              )}
              {generated.indicators && (
                <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Indikator:</span> {generated.indicators}</p>
              )}
              {generated.description && (
                <p className="text-sm text-gray-600 mt-2">{generated.description}</p>
              )}
              {generated.learningSteps && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-1">Langkah Pembelajaran:</p>
                  <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
                    {generated.learningSteps.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              {generated.assessment && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-1">Penilaian:</p>
                  <p className="text-sm text-gray-700">{generated.assessment}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Upload File Tab */}
      {activeTab === "upload" && (
        <Card className="p-6 max-w-2xl">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <FileUp className="h-5 w-5 text-blue-500" /> Upload RPP / Modul
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Judul RPP / Modul</label>
              <input
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                className="w-full rounded-lg border px-4 py-2"
                placeholder="RPP Teks Negosiasi Kelas 10"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Kelas</label>
                <select
                  value={uploadForm.kelas}
                  onChange={(e) => setUploadForm({ ...uploadForm, kelas: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2"
                >
                  {KELAS.map((k) => <option key={k} value={k}>Kelas {k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Semester</label>
                <select
                  value={uploadForm.semester}
                  onChange={(e) => setUploadForm({ ...uploadForm, semester: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2"
                >
                  {SEMESTER.map((s) => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tahun Ajaran</label>
                <select
                  value={uploadForm.tahunAjaran}
                  onChange={(e) => setUploadForm({ ...uploadForm, tahunAjaran: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2"
                >
                  {TAHUN_AJARAN.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">File (PDF, DOCX, PPTX)</label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".pdf,.docx,.pptx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="rpp-file"
                />
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
              {uploading ? "Uploading..." : "Upload RPP"}
            </Button>
            {uploadResult && (
              <div className={`text-sm flex items-center gap-1.5 rounded-lg px-3 py-2 ${uploadResult.includes("berhasil") ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"}`}>
                <CheckCircle size={14} /> {uploadResult}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Daftar RPP Tab */}
      {activeTab === "list" && (
        <div>
          {fetching ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : rppList.length === 0 ? (
            <Card className="py-16 text-center">
              <FileText className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 font-semibold">Belum ada RPP</h3>
              <p className="mt-2 text-sm text-gray-500">Generate dengan AI atau upload file RPP</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {rppList.map((rpp) => (
                <Card key={rpp.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{rpp.fileType || "PDF"}</Badge>
                        <Badge>Kelas {rpp.kelas}</Badge>
                        {rpp.isPublished && <Badge variant="success">Published</Badge>}
                        {rpp.isPremium && <Badge variant="gold">Premium</Badge>}
                      </div>
                      <h3 className="font-semibold">{rpp.title}</h3>
                      {rpp.description && <p className="text-sm text-gray-600 mt-1">{rpp.description}</p>}
                      <p className="text-xs text-gray-400 mt-2">
                        Semester {rpp.semester} • {rpp.tahunAjaran} • {new Date(rpp.createdAt).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {rpp.fileUrl && (
                        <Button size="sm" variant="outline" onClick={() => handleDownload(rpp)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setPreviewRpp(rpp)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(rpp.id)} className="text-red-500 hover:text-red-700">
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
      {previewRpp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewRpp(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{previewRpp.title || "Preview RPP"}</h2>
              <button onClick={() => setPreviewRpp(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="space-y-4 text-sm">
              {previewRpp.competency && (
                <div><span className="font-semibold">Kompetensi Dasar:</span> {previewRpp.competency}</div>
              )}
              {previewRpp.indicators && (
                <div><span className="font-semibold">Indikator:</span> {previewRpp.indicators}</div>
              )}
              {previewRpp.learningSteps && (
                <div>
                  <span className="font-semibold">Langkah Pembelajaran:</span>
                  <ol className="list-decimal list-inside mt-2 space-y-2">
                    {previewRpp.learningSteps.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              {previewRpp.assessment && (
                <div><span className="font-semibold">Penilaian:</span> {previewRpp.assessment}</div>
              )}
              {previewRpp.differentiation && (
                <div><span className="font-semibold">Diferensiasi:</span> {previewRpp.differentiation}</div>
              )}
              {previewRpp.materials && (
                <div><span className="font-semibold">Materi:</span> {previewRpp.materials}</div>
              )}
              {previewRpp.description && !previewRpp.learningSteps && (
                <div>{previewRpp.description}</div>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              {previewRpp.fileUrl && (
                <Button onClick={() => window.open(previewRpp.fileUrl, "_blank")}>
                  <Download className="h-4 w-4" /> Download File
                </Button>
              )}
              <Button variant="outline" onClick={() => setPreviewRpp(null)}>Tutup</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
