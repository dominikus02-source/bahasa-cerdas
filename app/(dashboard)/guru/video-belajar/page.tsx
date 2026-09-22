"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Play, Clock, Search, Upload, Video, AlertCircle, CheckCircle2, Camera, Mic, Sun, X, Loader2, Trash2, Eye, EyeOff } from "lucide-react";
import SafeMediaImage from "@/components/shared/safe-media-image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

const CATEGORIES = [
  { value: "", label: "Semua" },
  { value: "PEMBELAJARAN", label: "Pembelajaran" },
  { value: "GRAMMATIKA", label: "Grammatika" },
  { value: "SASTRA", label: "Sastra" },
  { value: "WRITING", label: "Menulis" },
  { value: "SPEAKING", label: "Berbicara" },
  { value: "READING", label: "Membaca" },
  { value: "MEDIA", label: "Media" },
  { value: "UKBI_PREP", label: "UKBI Prep" },
];

const GRADE_RANGES = [
  { value: "", label: "Semua Kelas" },
  { value: "1-2", label: "Kelas 1-2 (SD)" },
  { value: "3-4", label: "Kelas 3-4 (SD)" },
  { value: "5-6", label: "Kelas 5-6 (SD)" },
  { value: "7-9", label: "Kelas 7-9 (SMP)" },
  { value: "10-12", label: "Kelas 10-12 (SMA)" },
];

const VIDEO_RULES = [
  { icon: Clock, title: "Durasi Maksimal 10 Menit", desc: "Video tidak boleh lebih dari 600 detik", color: "text-blue-500", bg: "bg-blue-50" },
  { icon: Camera, title: "Bebas Format", desc: "Boleh portrait (9:16) atau landscape (16:9)", color: "text-purple-500", bg: "bg-purple-50" },
  { icon: Mic, title: "Suara Jelas", desc: "Pastikan audio terdengar jelas tanpa noise", color: "text-green-500", bg: "bg-green-50" },
  { icon: Sun, title: "Pencahayaan Baik", desc: "Rekam di tempat terang, hindari backlight", color: "text-amber-500", bg: "bg-amber-50" },
];

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} detik`;
  return s > 0 ? `${m}m ${s}d` : `${m} menit`;
}

export default function VideoBelajarPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [grade, setGrade] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ title: "", description: "", category: "PEMBELAJARAN", grade: "", videoUrl: "" });
  const [uploadResult, setUploadResult] = useState("");

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      const res = await fetchWithTimeout(`/api/video?${params}`);
      if (!res.ok) throw new Error("Unable to load videos");
      const data = await res.json();
      setVideos(data.videos || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { void fetchVideos(); }, [fetchVideos]);

  const filtered = videos.filter((v) => {
    if (search && !v.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (grade && v.grade !== grade) return false;
    return true;
  });

  const handleUpload = async () => {
    if (!uploadForm.title) return;
    if (!uploadForm.videoUrl && !selectedFile) {
      setUploadResult("Masukkan URL video atau pilih file video");
      return;
    }
    setUploading(true);
    setUploadResult("");

    try {
      const fd = new FormData();
      fd.set("title", uploadForm.title);
      fd.set("description", uploadForm.description);
      fd.set("category", uploadForm.category);
      fd.set("grade", uploadForm.grade);
      fd.set("videoUrl", uploadForm.videoUrl);
      if (selectedFile) fd.set("file", selectedFile);

      const res = await fetch("/api/video", { method: "POST", body: fd });
      const data = await res.json();

      if (res.ok) {
        setUploadResult("success");
        setShowUpload(false);
        setUploadForm({ title: "", description: "", category: "PEMBELAJARAN", grade: "", videoUrl: "" });
        setSelectedFile(null);
        fetchVideos();
      } else {
        setUploadResult(data.error || "Gagal upload");
      }
    } catch {
      setUploadResult("Gagal upload");
    }
    setUploading(false);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Belajar</h1>
          <p className="mt-1 text-sm text-gray-600">Koleksi video pembelajaran Bahasa Indonesia</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)} variant="outline">
          <Upload size={16} /> {showUpload ? "Batal" : "Unggah Video"}
        </Button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="mb-8 space-y-6">
          {/* Rules Card */}
          <Card className="p-5 border-2 border-red-100 bg-red-50/50">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={20} className="text-red-500" />
              <h3 className="font-bold text-gray-900">Aturan Upload Video</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VIDEO_RULES.map((rule, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-gray-100">
                  <div className={`w-10 h-10 rounded-lg ${rule.bg} flex items-center justify-center shrink-0`}>
                    <rule.icon size={18} className={rule.color} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{rule.title}</p>
                    <p className="text-xs text-gray-500">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Upload Form */}
          <Card className="p-6 border-2 border-gray-200">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Video size={20} className="text-red-500" /> Upload Video Baru
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Judul Video</label>
                <input value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 focus:outline-none"
                  placeholder="Cara Menulis Teks Deskripsi" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deskripsi</label>
                <textarea value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 focus:outline-none"
                  rows={2} placeholder="Penjelasan singkat tentang video..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Kategori</label>
                  <select value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm">
                    {CATEGORIES.filter(c => c.value).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kelas</label>
                  <select value={uploadForm.grade} onChange={(e) => setUploadForm({ ...uploadForm, grade: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm">
                    <option value="">Pilih Kelas</option>
                    {GRADE_RANGES.filter(g => g.value).map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Video URL (YouTube/Vimeo)</label>
                <input value={uploadForm.videoUrl} onChange={(e) => setUploadForm({ ...uploadForm, videoUrl: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 focus:outline-none"
                  placeholder="https://youtube.com/watch?v=..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">File Video (opsional)</label>
                <input type="file" accept="video/mp4,video/quicktime" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => { setShowUpload(false); setUploadResult(""); }} className="flex-1">Batal</Button>
                <Button onClick={handleUpload} disabled={uploading || !uploadForm.title || (!uploadForm.videoUrl && !selectedFile)} className="flex-1 bg-gradient-to-r from-red-500 to-red-600">
                  {uploading ? <><Loader2 size={16} className="animate-spin" /> Mengunggah...</> : <><Upload size={16} /> Unggah Video</>}
                </Button>
              </div>
              {uploadResult && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${uploadResult === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {uploadResult === "success" ? <CheckCircle2 size={16} /> : <X size={16} />}
                  {uploadResult === "success" ? "Video berhasil diupload!" : uploadResult}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Search & Filter */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari video..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-red-500 focus:outline-none" />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={grade} onChange={(e) => setGrade(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
            {GRADE_RANGES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Memuat...</div>
      ) : loadError ? (
        <div className="text-center py-16"><p className="text-gray-500">Video belum bisa dimuat.</p><Button className="mt-4" onClick={() => void fetchVideos()}>Coba lagi</Button></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Play className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">Belum ada video</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((video) => (
            <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 border border-gray-100 group">
              <Link href={`/video-belajar/${video.id}`} className="block group">
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  <SafeMediaImage
                    src={video.thumbnailUrl}
                    alt={video.title}
                    fallbackType="video"
                    containerClassName="w-full h-full"
                    className="group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:scale-110 shadow-lg">
                      <Play size={20} className="text-red-500 ml-0.5" />
                    </div>
                  </div>
                  {video.duration && (
                    <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md">
                      {formatDuration(video.duration)}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 group-hover:text-red-500 transition-colors">{video.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{video.description}</p>
                </div>
              </Link>
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {CATEGORIES.find(c => c.value === video.category)?.label || video.category}
                  </Badge>
                  {video.grade && (
                    <Badge variant="outline" className="text-[10px]">
                      Kelas {video.grade}
                    </Badge>
                  )}
                  <div className="flex-1" />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const res = await fetch("/api/video", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: video.id, isPublished: !video.isPublished }),
                          });
                          if (res.ok) fetchVideos();
                        } catch {}
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${video.isPublished ? "hover:bg-amber-50" : "hover:bg-green-50"}`}
                      title={video.isPublished ? "Unpublish" : "Publish"}
                    >
                      {video.isPublished ? (
                        <EyeOff size={14} className="text-amber-500" />
                      ) : (
                        <Eye size={14} className="text-green-500" />
                      )}
                    </button>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!confirm("Hapus video ini?")) return;
                        try {
                          const res = await fetch(`/api/video?id=${video.id}`, { method: "DELETE" });
                          if (res.ok) fetchVideos();
                        } catch {}
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Hapus video"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
