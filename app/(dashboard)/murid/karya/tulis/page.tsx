"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, PenLine, BookOpen, Newspaper, MessageCircle, Music, Lightbulb, Upload, X, Loader2 } from "lucide-react";

const TYPES = [
  { value: "PUISI", label: "Puisi", icon: PenLine, desc: "Ekspresikan perasaanmu dalam bait-bait indah" },
  { value: "CERPEN", label: "Cerpen", icon: BookOpen, desc: "Tulis cerita pendek imajinasimu" },
  { value: "ARTIKEL", label: "Artikel", icon: Newspaper, desc: "Bagikan opini dan pengetahuanmu" },
  { value: "ANEKDOT", label: "Anekdot", icon: MessageCircle, desc: "Cerita lucu dengan pesan tersirat" },
  { value: "PANTUN", label: "Pantun", icon: Music, desc: "Sastra klasik dengan rima a-b-a-b" },
  { value: "OPINI", label: "Opini", icon: Lightbulb, desc: "Pendapatmu tentang isu terkini" },
];

const TYPE_STYLES: Record<string, { border: string; bg: string; text: string; gradient: string }> = {
  PUISI: { border: "border-rose-500", bg: "bg-rose-50", text: "text-rose-600", gradient: "from-rose-500 to-pink-600" },
  CERPEN: { border: "border-blue-500", bg: "bg-blue-50", text: "text-blue-600", gradient: "from-blue-500 to-indigo-600" },
  ARTIKEL: { border: "border-amber-500", bg: "bg-amber-50", text: "text-amber-600", gradient: "from-amber-500 to-orange-600" },
  ANEKDOT: { border: "border-orange-500", bg: "bg-orange-50", text: "text-orange-600", gradient: "from-orange-500 to-red-600" },
  PANTUN: { border: "border-teal-500", bg: "bg-teal-50", text: "text-teal-600", gradient: "from-teal-500 to-emerald-600" },
  OPINI: { border: "border-violet-500", bg: "bg-violet-50", text: "text-violet-600", gradient: "from-violet-500 to-purple-600" },
};

export default function TulisKaryaPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("PUISI");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUploadCover = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("folder", "karya");
      const res = await fetch("/api/upload/file", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Gagal mengunggah foto");
      setCoverImage(data.url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Judul harus diisi"); return; }
    if (!content.trim()) { setError("Konten harus diisi"); return; }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/siswa/karya", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), type, coverImage: coverImage || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      router.push(`/murid/karya/${data.karya.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/murid/beranda" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tulis Karya</h1>
          <p className="text-sm text-gray-500">Bagikan karyamu dengan seluruh Indonesia</p>
        </div>
      </div>

      {/* Type Selector */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
        {TYPES.map(t => {
          const s = TYPE_STYLES[t.value] || TYPE_STYLES.OPINI;
          return (
            <button key={t.value} onClick={() => setType(t.value)}
              className={`p-3 rounded-xl text-center border-2 transition-all ${
                type === t.value ? `${s.border} ${s.bg} shadow-sm` : "border-gray-100 hover:border-gray-200 bg-white"
              }`}
            >
              <t.icon size={24} className="mx-auto mb-1" />
              <span className={`text-xs font-semibold ${type === t.value ? s.text : "text-gray-600"}`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Title */}
      <div className="mb-4">
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Judul karyamu..."
          className="w-full px-5 py-4 bg-white rounded-2xl border border-gray-200 text-lg font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
        />
      </div>

      {/* Content */}
      <div className="mb-4">
        <textarea
          value={content} onChange={e => setContent(e.target.value)}
          placeholder={type === "PUISI" ? "Tulis puisimu di sini...\n\nSetiap bait,\npenuh makna..." : type === "PANTUN" ? "Tulis pantunmu di sini...\n\nBaris 1: sampiran\nBaris 2: sampiran\nBaris 3: isi\nBaris 4: isi" : "Tulis karyamu di sini..."}
          rows={15}
          className="w-full px-5 py-4 bg-white rounded-2xl border border-gray-200 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all resize-y font-[inherit] leading-relaxed"
        />
      </div>

      {/* Cover Image Upload (optional) */}
      <div className="mb-6">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadCover(f); e.target.value = ""; }}
        />
        {coverImage ? (
          <div className="relative rounded-xl overflow-hidden border border-gray-200 max-w-xs">
            <img src={coverImage} alt="Foto sampul" className="w-full aspect-video object-cover" />
            <button
              type="button"
              onClick={() => setCoverImage("")}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Mengunggah foto..." : "Unggah Foto Sampul (opsional)"}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || uploading}
        className={`w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r ${TYPE_STYLES[type]?.gradient || TYPE_STYLES.OPINI.gradient} text-white rounded-2xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg disabled:opacity-50`}
      >
        {submitting ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <Send size={18} />}
        {submitting ? "Menyimpan..." : "Terbitkan Karya"}
      </button>

      <p className="text-center text-xs text-gray-400 mt-3">
        Dengan menerbitkan, kamu setuju karyamu tampil di feed BahasaCerdas
      </p>
    </div>
  );
}
