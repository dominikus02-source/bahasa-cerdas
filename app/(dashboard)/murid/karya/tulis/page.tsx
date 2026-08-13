"use client";

import { useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, PenLine, BookOpen, Newspaper, MessageCircle, Music, Lightbulb, Upload, X, Loader2, Link2 } from "lucide-react";

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
  CERPEN: { border: "border-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400", gradient: "from-blue-500 to-indigo-600" },
  ARTIKEL: { border: "border-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400", gradient: "from-amber-500 to-orange-600" },
  ANEKDOT: { border: "border-orange-500", bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400", gradient: "from-orange-500 to-red-600" },
  PANTUN: { border: "border-teal-500", bg: "bg-teal-50", text: "text-teal-600", gradient: "from-teal-500 to-emerald-600" },
  OPINI: { border: "border-violet-500", bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400", gradient: "from-violet-500 to-purple-600" },
};

function TulisKaryaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const [title, setTitle] = useState("");
  const [type, setType] = useState(() =>
    typeParam && TYPES.some((t) => t.value === typeParam) ? typeParam : "PUISI"
  );
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);
  const [coverMode, setCoverMode] = useState<"upload" | "link">("upload");
  const [coverLinkUrl, setCoverLinkUrl] = useState("");
  const [photoMode, setPhotoMode] = useState<"upload" | "link">("upload");
  const [photoLinkUrl, setPhotoLinkUrl] = useState("");

  const uploadOne = async (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", "karya");
    const res = await fetch("/api/upload/file", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || "Gagal mengunggah foto");
    return data.url as string;
  };

  const handleUploadCover = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      setCoverImage(await uploadOne(file));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadPhotos = async (files: FileList) => {
    setUploadingPhotos(true);
    setError("");
    try {
      const slots = Math.max(0, 6 - photos.length);
      for (const file of Array.from(files).slice(0, slots)) {
        const url = await uploadOne(file);
        setPhotos(prev => [...prev, url]);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (url: string) => setPhotos(prev => prev.filter(p => p !== url));

  const addPhotoLink = () => {
    const url = photoLinkUrl.trim();
    if (!url) return;
    if (photos.length >= 6) { setError("Maksimal 6 foto"); return; }
    setPhotos(prev => [...prev, url]);
    setPhotoLinkUrl("");
  };

  const setCoverFromLink = () => {
    const url = coverLinkUrl.trim();
    if (!url) return;
    setCoverImage(url);
    setCoverLinkUrl("");
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
        body: JSON.stringify({ title: title.trim(), content: content.trim(), type, coverImage: coverImage || undefined, photos }),
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
        <Link href="/murid/beranda" className="p-2 hover:bg-gray-100 dark:bg-slate-800/80 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-gray-600 dark:text-slate-300" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Tulis Karya</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Bagikan karyamu dengan seluruh Indonesia</p>
        </div>
      </div>

      {/* Type Selector */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
        {TYPES.map(t => {
          const s = TYPE_STYLES[t.value] || TYPE_STYLES.OPINI;
          return (
            <button key={t.value} onClick={() => setType(t.value)}
              className={`p-3 rounded-xl text-center border-2 transition-all ${
                type === t.value ? `${s.border} ${s.bg} shadow-sm` : "border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/90"
              }`}
            >
              <t.icon size={24} className="mx-auto mb-1" />
              <span className={`text-xs font-semibold ${type === t.value ? s.text : "text-gray-600 dark:text-slate-300"}`}>
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
          className="w-full px-5 py-4 bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-200 dark:border-slate-700 text-lg font-bold text-gray-900 dark:text-slate-100 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
        />
      </div>

      {/* Content */}
      <div className="mb-4">
        <textarea
          value={content} onChange={e => setContent(e.target.value)}
          placeholder={type === "PUISI" ? "Tulis puisimu di sini...\n\nSetiap bait,\npenuh makna..." : type === "PANTUN" ? "Tulis pantunmu di sini...\n\nBaris 1: sampiran\nBaris 2: sampiran\nBaris 3: isi\nBaris 4: isi" : "Tulis karyamu di sini..."}
          rows={15}
          className="w-full px-5 py-4 bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all resize-y font-[inherit] leading-relaxed"
        />
      </div>

      {/* Cover Image Upload / Link (optional) */}
      <div className="mb-6">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadCover(f); e.target.value = ""; }}
        />
        {coverImage ? (
          <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 max-w-xs">
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
          <>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setCoverMode("upload")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  coverMode === "upload" ? "bg-violet-600 text-white" : "bg-gray-100 dark:bg-slate-800/80 text-gray-500 hover:bg-gray-200"
                }`}
              ><Upload size={12} className="inline mr-1" />Upload</button>
              <button type="button" onClick={() => setCoverMode("link")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  coverMode === "link" ? "bg-violet-600 text-white" : "bg-gray-100 dark:bg-slate-800/80 text-gray-500 hover:bg-gray-200"
                }`}
              ><Link2 size={12} className="inline mr-1" />Link</button>
            </div>
            {coverMode === "upload" ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 text-gray-500 hover:border-violet-300 hover:text-violet-600 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? "Mengunggah foto..." : "Unggah Foto Sampul (opsional)"}
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  value={coverLinkUrl}
                  onChange={e => setCoverLinkUrl(e.target.value)}
                  placeholder="https://example.com/gambar.jpg"
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-300 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); setCoverFromLink(); } }}
                />
                <button type="button" onClick={setCoverFromLink} disabled={!coverLinkUrl.trim()}
                  className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-all"
                >Pakai</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Foto Pendukung (mis. foto wawancara, opsional, maks 6) */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          Foto Pendukung (opsional)
        </p>
        <input
          ref={photosRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={e => { if (e.target.files?.length) handleUploadPhotos(e.target.files); e.target.value = ""; }}
        />
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {photos.map(url => (
              <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 group">
                <img src={url} alt="Foto pendukung" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 6 && (
          <>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setPhotoMode("upload")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  photoMode === "upload" ? "bg-violet-600 text-white" : "bg-gray-100 dark:bg-slate-800/80 text-gray-500 hover:bg-gray-200"
                }`}
              ><Upload size={12} className="inline mr-1" />Upload</button>
              <button type="button" onClick={() => setPhotoMode("link")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  photoMode === "link" ? "bg-violet-600 text-white" : "bg-gray-100 dark:bg-slate-800/80 text-gray-500 hover:bg-gray-200"
                }`}
              ><Link2 size={12} className="inline mr-1" />Link</button>
            </div>
            {photoMode === "upload" ? (
              <button
                type="button"
                onClick={() => photosRef.current?.click()}
                disabled={uploadingPhotos}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 text-gray-500 hover:border-violet-300 hover:text-violet-600 transition-colors disabled:opacity-50"
              >
                {uploadingPhotos ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploadingPhotos ? "Mengunggah foto..." : `Tambah Foto (${photos.length}/6)`}
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  value={photoLinkUrl}
                  onChange={e => setPhotoLinkUrl(e.target.value)}
                  placeholder="https://example.com/gambar.jpg"
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-300 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPhotoLink(); } }}
                />
                <button type="button" onClick={addPhotoLink} disabled={!photoLinkUrl.trim() || photos.length >= 6}
                  className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-all"
                >Tambah</button>
              </div>
            )}
          </>
        )}
        <p className="text-xs text-gray-400 mt-2">Upload atau tempel link gambar (mis. dari wawancara untuk artikelmu).</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || uploading || uploadingPhotos}
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

export default function TulisKaryaPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-gray-400 flex justify-center">
          <Loader2 size={24} className="animate-spin" />
        </div>
      }
    >
      <TulisKaryaForm />
    </Suspense>
  );
}
