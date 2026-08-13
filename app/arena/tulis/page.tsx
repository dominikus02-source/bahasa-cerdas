"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PenLine, Send, Image, Sparkles, BookOpen, FileText, Smile, Music, MessageSquare, Trophy, CheckCircle2, Upload, X, Loader2, Link2 } from "lucide-react"
import { getWeeklyChallenge } from "@/lib/weekly-challenge"

const karyaTypes = [
  { value: "PUISI", label: "Puisi", icon: <Sparkles className="w-6 h-6" />, color: "from-fuchsia-500 to-pink-600" },
  { value: "CERPEN", label: "Cerpen", icon: <BookOpen className="w-6 h-6" />, color: "from-blue-500 to-indigo-600" },
  { value: "ARTIKEL", label: "Artikel", icon: <FileText className="w-6 h-6" />, color: "from-emerald-500 to-teal-600" },
  { value: "ANEKDOT", label: "Anekdot", icon: <Smile className="w-6 h-6" />, color: "from-amber-500 to-orange-600" },
  { value: "PANTUN", label: "Pantun", icon: <Music className="w-6 h-6" />, color: "from-violet-500 to-purple-600" },
  { value: "OPINI", label: "Opini", icon: <MessageSquare className="w-6 h-6" />, color: "from-rose-500 to-red-600" },
]

const MAX_PHOTOS = 6

export default function ArenaTulisPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [type, setType] = useState("PUISI")

  useEffect(() => {
    const t = searchParams.get("type")
    if (t && karyaTypes.some(kt => kt.value === t)) {
      setType(t)
    }
  }, [searchParams])
  const challenge = getWeeklyChallenge()
  const isChallengeType = type === challenge.type
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [coverImage, setCoverImage] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const [coverMode, setCoverMode] = useState<"upload" | "link">("upload")
  const [photoMode, setPhotoMode] = useState<"upload" | "link">("upload")
  const [photoLinkUrl, setPhotoLinkUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const coverRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef<HTMLInputElement>(null)

  const uploadOne = async (file: File) => {
    const fd = new FormData()
    fd.set("file", file)
    fd.set("folder", "karya")
    const res = await fetch("/api/upload/file", { method: "POST", body: fd })
    const data = await res.json()
    if (!res.ok || !data.url) throw new Error(data.error || "Gagal mengunggah gambar")
    return data.url as string
  }

  const handleUploadCover = async (file: File) => {
    setUploading(true)
    setError("")
    try {
      setCoverImage(await uploadOne(file))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleUploadPhotos = async (files: FileList) => {
    setUploadingPhotos(true)
    setError("")
    try {
      const slots = Math.max(0, MAX_PHOTOS - photos.length)
      for (const file of Array.from(files).slice(0, slots)) {
        const url = await uploadOne(file)
        setPhotos(prev => [...prev, url])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploadingPhotos(false)
    }
  }

  const addPhotoByLink = () => {
    const url = photoLinkUrl.trim()
    if (!url) return
    setPhotos(prev => (prev.length >= MAX_PHOTOS ? prev : [...prev, url]))
    setPhotoLinkUrl("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/siswa/karya", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          content: content.trim(),
          coverImage: coverImage || undefined,
          photos: photos.length > 0 ? photos : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan")

      if (data.challengeBonus > 0) {
        sessionStorage.setItem(
          "karya-reward",
          `Karyamu masuk tantangan "${data.challengeTheme}" — dapat ${data.coins + data.challengeBonus} koin!`
        )
      }

      // Respons memakai bentuk { karya, id, ... }. Dulu di sini membaca data.id
      // saat server hanya mengirim { karya }, jadi murid selalu dilempar ke
      // /arena/feed/undefined dan memantul balik ke feed tanpa melihat karyanya.
      router.push(`/arena/feed/${data.id ?? data.karya?.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="px-4 py-5 arena-page">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-slate-100">Tulis Karya</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Bagikan karyamu ke seluruh Indonesia!</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type picker */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 block">Jenis Karya</label>
          <div className="grid grid-cols-3 gap-2">
            {karyaTypes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  type === t.value
                    ? `bg-gradient-to-br ${t.color} text-white border-transparent shadow-md`
                    : "bg-white dark:bg-slate-800/90 border-gray-200 dark:border-slate-700 text-gray-600 hover:border-gray-300 dark:border-slate-600"
                }`}
              >
                <div className={type === t.value ? "text-white" : "text-gray-400"}>
                  {t.icon}
                </div>
                <span className="text-[11px] font-semibold">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tantangan Minggu Ini — selalu tampil. Dulu hanya muncul kalau jenis
            karyanya kebetulan sudah cocok, jadi murid tidak pernah tahu ada
            tantangannya sampai tidak sengaja memilih jenis yang tepat. */}
        <button
          type="button"
          onClick={() => setType(challenge.type)}
          className={`w-full text-left rounded-2xl p-4 transition-all ${
            isChallengeType
              ? "bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25"
              : "bg-white dark:bg-slate-800/90 border-2 border-dashed border-violet-300 text-gray-800 dark:text-slate-200 hover:border-violet-400 active:scale-[0.99]"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isChallengeType ? "bg-white bg-white/20 dark:bg-slate-900/20" : "bg-violet-100"
            }`}>
              <Sparkles size={22} className={isChallengeType ? "text-yellow-300" : "text-violet-600 dark:text-violet-400"} />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isChallengeType ? "bg-white bg-white/20 dark:bg-slate-900/20" : "bg-violet-100 text-violet-700 dark:text-violet-300"
              }`}>
                Tantangan Minggu Ini
              </span>
              <p className="text-base font-extrabold mt-1.5 leading-tight">{challenge.theme}</p>
              <p className={`text-xs mt-0.5 leading-snug ${isChallengeType ? "text-white/80" : "text-gray-500 dark:text-slate-400"}`}>
                {challenge.prompt}
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <span className="inline-flex items-center gap-1.5 bg-yellow-400 text-yellow-950 text-[11px] font-extrabold px-2.5 py-1 rounded-full">
                  <Trophy size={12} /> +{challenge.bonusCoins} koin
                </span>
                {isChallengeType ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white/90">
                    <CheckCircle2 size={13} /> Karyamu ikut tantangan ini
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400">
                    Ketuk untuk ikut &rarr;
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>

        {/* Title */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Judul</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masukkan judul karyamu..."
            className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
            required
          />
        </div>

        {/* Cover Image */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
            <div className="flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5" />
              Gambar Sampul (opsional)
            </div>
          </label>
          <div className="flex gap-1.5 mb-2">
            {(["upload", "link"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setCoverMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  coverMode === mode ? "bg-violet-600 text-white" : "bg-gray-100 dark:bg-slate-800/80 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {mode === "upload" ? "Upload" : "Pakai Link"}
              </button>
            ))}
          </div>
          {coverMode === "upload" ? (
            <>
              <input
                ref={coverRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUploadCover(e.target.files[0])}
              />
              {coverImage ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImage} alt="Sampul" className="w-full h-44 object-cover" />
                  <button
                    type="button"
                    onClick={() => { setCoverImage(""); if (coverRef.current) coverRef.current.value = "" }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                    aria-label="Hapus sampul"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-3.5 rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-700 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:bg-violet-950/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploading ? "Mengunggah..." : "Upload gambar sampul"}
                </button>
              )}
            </>
          ) : (
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://example.com/gambar.jpg"
              className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
            />
          )}
        </div>

        {/* Photos */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
            <div className="flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5" />
              Foto ({photos.length}/{MAX_PHOTOS}, opsional)
            </div>
          </label>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {photos.map((url, i) => (
                <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                    aria-label={`Hapus foto ${i + 1}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {photos.length < MAX_PHOTOS && (
            <>
              <div className="flex gap-1.5 mb-2">
                {(["upload", "link"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPhotoMode(mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      photoMode === mode ? "bg-violet-600 text-white" : "bg-gray-100 dark:bg-slate-800/80 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {mode === "upload" ? "Upload" : "Pakai Link"}
                  </button>
                ))}
              </div>
              {photoMode === "upload" ? (
                <>
                  <input
                    ref={photosRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && handleUploadPhotos(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => photosRef.current?.click()}
                    disabled={uploadingPhotos}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:bg-slate-800/60 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {uploadingPhotos ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {uploadingPhotos ? "Mengunggah..." : "Upload foto (bisa banyak)"}
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={photoLinkUrl}
                    onChange={(e) => setPhotoLinkUrl(e.target.value)}
                    placeholder="https://example.com/foto.jpg"
                    className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
                  />
                  <button
                    type="button"
                    onClick={addPhotoByLink}
                    className="px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-violet-700 transition-all"
                  >
                    <Link2 size={14} /> Tambah
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Content */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Konten</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis karyamu di sini..."
            rows={12}
            className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 resize-none"
            required
          />
          <p className="text-[10px] text-gray-400 mt-1.5 text-right">{content.length} karakter</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !title.trim() || !content.trim()}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm hover:shadow-lg hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {loading ? "Menyimpan..." : "Publikasikan"}
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}