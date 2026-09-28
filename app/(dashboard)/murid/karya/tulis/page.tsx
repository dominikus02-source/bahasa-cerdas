"use client";

import { useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, PenLine, BookOpen, Newspaper, Music, Lightbulb, Upload, X, Loader2, Link2, ChevronDown, Sparkles, ScrollText, GitBranch, Megaphone, Palette, Theater } from "lucide-react";

const TYPES = [
  { value: "PUISI", label: "Puisi", icon: PenLine, desc: "Ungkapkan rasa dan gagasan dengan bahasa yang indah" },
  { value: "PANTUN", label: "Pantun", icon: Music, desc: "Bermain kata dengan sampiran, isi, dan rima" },
  { value: "SYAIR", label: "Syair", icon: ScrollText, desc: "Bercerita melalui bait-bait yang berima" },
  { value: "GURINDAM", label: "Gurindam", icon: GitBranch, desc: "Dua baris berisi nasihat atau sebab-akibat" },
  { value: "CERPEN", label: "Cerpen", icon: BookOpen, desc: "Ceritakan kisah singkat dengan konflik dan pesan" },
  { value: "ANEKDOT", label: "Anekdot", icon: Theater, desc: "Cerita singkat yang lucu sekaligus bermakna" },
  { value: "SLOGAN", label: "Slogan", icon: Megaphone, desc: "Kalimat singkat yang kuat dan mudah diingat" },
  { value: "OPINI", label: "Opini", icon: Lightbulb, desc: "Sampaikan pendapat dengan alasan dan bukti" },
  { value: "ARTIKEL", label: "Artikel", icon: Newspaper, desc: "Jelaskan gagasan atau informasi secara runtut" },
  { value: "KARYA_BEBAS", label: "Karya Bebas", icon: Palette, desc: "Bebaskan ide dan buat karya dengan caramu sendiri" },
];

const TYPE_GUIDES: Record<string, { intro: string; points: string[]; example: string; prompt: string }> = {
  PUISI: { intro: "Karya sastra yang menyampaikan perasaan atau gagasan melalui pilihan kata, larik, dan bait.", points: ["Pilih kata yang kuat dan bermakna.", "Gunakan larik dan bait sesuai kebutuhan.", "Boleh memakai majas, imaji, atau permainan bunyi."], example: "Pagi datang membawa cahaya\nAku membuka jendela\nMenemukan harapan baru\nUntuk melangkah hari ini.", prompt: "Mulai dari satu perasaan atau pengalaman yang ingin kamu ceritakan." },
  PANTUN: { intro: "Puisi rakyat yang umumnya terdiri dari empat baris: dua sampiran dan dua isi.", points: ["4 baris dalam satu bait.", "Baris 1–2 menjadi sampiran.", "Baris 3–4 menjadi isi.", "Rima yang umum: a-b-a-b."], example: "Pergi pagi membawa bekal\nSinggah sebentar membeli jamu\nKalau ingin menjadi andal\nRajin belajar setiap waktu.", prompt: "Tentukan pesanmu dulu, lalu buat dua baris sampiran yang berima." },
  SYAIR: { intro: "Puisi rakyat yang umumnya terdiri dari empat baris dan seluruh barisnya berisi cerita atau pesan.", points: ["4 baris dalam satu bait.", "Semua baris menjadi isi.", "Rima yang umum: a-a-a-a.", "Isi dapat membentuk rangkaian cerita atau nasihat."], example: "Dengarkan nasihat wahai kawan\nJadikan ilmu sebagai pegangan\nTekun belajar sepanjang zaman\nAgar cita-cita menjadi kenyataan.", prompt: "Pilih cerita atau nasihat yang ingin kamu sampaikan dalam satu rangkaian." },
  GURINDAM: { intro: "Puisi rakyat yang umumnya terdiri dari dua baris dengan hubungan makna seperti sebab dan akibat.", points: ["Biasanya terdiri dari 2 baris.", "Baris pertama berisi sebab atau kondisi.", "Baris kedua berisi akibat atau jawaban.", "Rima yang umum: a-a."], example: "Jika rajin menuntut ilmu,\nBertambah luas wawasanmu.", prompt: "Buat satu kondisi atau sebab, lalu tentukan akibat atau nasihatnya." },
  CERPEN: { intro: "Cerita pendek yang berfokus pada satu rangkaian peristiwa dan dapat dibaca dalam waktu relatif singkat.", points: ["Tentukan tokoh dan karakternya.", "Tentukan latar tempat dan waktu.", "Bangun alur dengan masalah atau konflik.", "Akhiri dengan penyelesaian atau pesan yang jelas."], example: "Pagi itu, Raka menemukan sebuah dompet di halaman sekolah. Ia mencari pemiliknya dan mengembalikannya sebelum pelajaran dimulai.", prompt: "Siapa tokohmu, apa masalahnya, dan apa yang berubah pada akhir cerita?" },
  ANEKDOT: { intro: "Cerita singkat yang dapat menghadirkan kelucuan atau kejadian tidak biasa untuk menyampaikan kritik atau pesan.", points: ["Ada kejadian yang menarik atau lucu.", "Tokoh dan situasi dibuat jelas.", "Ada kejutan atau kelucuan.", "Pesan atau kritik tetap dapat dipahami."], example: "Guru bertanya, “Mengapa tugasmu belum selesai?” Beni menjawab, “Sudah selesai, Bu. Hanya saja tugasnya masih dalam perjalanan dari rumah.”", prompt: "Cari kejadian sehari-hari yang lucu, lalu tentukan pesan yang ingin kamu sampaikan." },
  SLOGAN: { intro: "Kalimat pendek yang dibuat menarik agar mudah diingat dan mendorong orang melakukan atau mengingat sesuatu.", points: ["Singkat dan mudah diingat.", "Pesannya jelas.", "Gunakan kata yang kuat dan menarik.", "Sesuaikan dengan tujuan atau sasaran."], example: "Baca Hari Ini, Hebat Esok Hari!", prompt: "Tentukan satu ajakan, lalu ringkas menjadi kalimat yang mudah diingat." },
  OPINI: { intro: "Tulisan yang menyampaikan pandangan penulis terhadap suatu persoalan dengan alasan yang dapat dipertanggungjawabkan.", points: ["Nyatakan pendapat utama dengan jelas.", "Berikan alasan yang logis.", "Gunakan contoh atau bukti yang relevan.", "Tutup dengan simpulan atau penegasan."], example: "Menurut saya, membaca 15 menit sebelum pelajaran membantu siswa membangun kebiasaan membaca secara rutin.", prompt: "Apa pendapatmu? Mengapa? Contoh atau bukti apa yang mendukungnya?" },
  ARTIKEL: { intro: "Tulisan yang membahas gagasan, informasi, atau topik secara terstruktur agar pembaca memperoleh pemahaman.", points: ["Tentukan topik dan tujuan.", "Susun pembuka, pembahasan, dan penutup.", "Gunakan informasi yang relevan.", "Pilih bahasa yang jelas dan terstruktur."], example: "Membawa botol minum sendiri merupakan kebiasaan sederhana yang dapat mengurangi penggunaan botol sekali pakai.", prompt: "Pilih satu topik yang kamu kuasai. Apa informasi utama yang ingin pembaca bawa pulang?" },
  KARYA_BEBAS: { intro: "Ruang untuk membuat karya yang tidak harus mengikuti satu bentuk sastra atau tulisan tertentu.", points: ["Tentukan tujuan karyamu.", "Pilih bentuk yang paling nyaman.", "Gunakan bahasa yang jelas dan bertanggung jawab.", "Buat karya yang mencerminkan idemu sendiri."], example: "Kamu bisa membuat cerita, surat, refleksi, naskah pendek, atau bentuk tulisan kreatif lain.", prompt: "Kalau tidak ada aturan genre, apa yang paling ingin kamu ceritakan hari ini?" },
};

const TYPE_STYLES: Record<string, { border: string; bg: string; text: string; gradient: string }> = {
  PUISI: { border: "border-rose-500", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-600 dark:text-rose-400", gradient: "from-rose-500 to-pink-600" },
  PANTUN: { border: "border-teal-500", bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-600 dark:text-teal-400", gradient: "from-teal-500 to-emerald-600" },
  SYAIR: { border: "border-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/40", text: "text-cyan-600 dark:text-cyan-400", gradient: "from-cyan-500 to-blue-600" },
  GURINDAM: { border: "border-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400", gradient: "from-amber-500 to-orange-600" },
  CERPEN: { border: "border-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400", gradient: "from-blue-500 to-indigo-600" },
  ANEKDOT: { border: "border-orange-500", bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400", gradient: "from-orange-500 to-red-600" },
  SLOGAN: { border: "border-pink-500", bg: "bg-pink-50 dark:bg-pink-950/40", text: "text-pink-600 dark:text-pink-400", gradient: "from-pink-500 to-fuchsia-600" },
  OPINI: { border: "border-violet-500", bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400", gradient: "from-violet-500 to-purple-600" },
  ARTIKEL: { border: "border-sky-500", bg: "bg-sky-50 dark:bg-sky-950/40", text: "text-sky-600 dark:text-sky-400", gradient: "from-sky-500 to-blue-600" },
  KARYA_BEBAS: { border: "border-fuchsia-500", bg: "bg-fuchsia-50 dark:bg-fuchsia-950/40", text: "text-fuchsia-600 dark:text-fuchsia-400", gradient: "from-fuchsia-500 to-purple-600" },
};

function TulisKaryaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const [openTypeMenu, setOpenTypeMenu] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState(() =>
    typeParam && TYPES.some((t) => t.value === typeParam) ? typeParam : "PUISI"
  );
  const selected = TYPES.find((item) => item.value === type) ?? TYPES[0];
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

      {/* Pilih jenis karya */}
      <section className="mb-5 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-300">
              <Sparkles size={14} /> Studio Berkarya
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Mau menulis apa hari ini?</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Pilih jenis karya. Setelah dipilih, kamu langsung mendapat materi singkat dan contoh sebelum mulai menulis.</p>
          </div>

          <div className="relative w-full md:w-[380px]">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Jenis karya</p>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={openTypeMenu}
              onClick={() => setOpenTypeMenu((value) => !value)}
              className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3.5 text-left shadow-sm transition-all dark:bg-slate-800 ${openTypeMenu ? `${TYPE_STYLES[type]?.border || "border-violet-500"} ring-4 ring-violet-100 dark:ring-violet-950/40` : "border-slate-200 dark:border-slate-700"}`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TYPE_STYLES[type]?.bg || "bg-violet-50"} ${TYPE_STYLES[type]?.text || "text-violet-600"}`}>
                <selected.icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-slate-900 dark:text-slate-100">{TYPES.find((t) => t.value === type)?.label}</span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{TYPES.find((t) => t.value === type)?.desc}</span>
              </span>
              <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${openTypeMenu ? "rotate-180" : ""}`} />
            </button>

            {openTypeMenu && (
              <div className="absolute left-0 right-0 z-30 mt-2 max-h-[min(420px,65vh)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                {TYPES.map((item) => {
                  const itemStyle = TYPE_STYLES[item.value];
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="option"
                      aria-selected={item.value === type}
                      onClick={() => { setType(item.value); setOpenTypeMenu(false); setError(""); }}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${item.value === type ? itemStyle.bg : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${itemStyle.bg} ${itemStyle.text}`}>
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{item.label}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{item.desc}</span>
                      </span>
                      {item.value === type && <span className={`text-xs font-bold ${itemStyle.text}`}>Dipilih</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Materi singkat */}
      {(() => {
        const guide = TYPE_GUIDES[type];
        const guideStyle = TYPE_STYLES[type] || TYPE_STYLES.PUISI;
        return (
          <section className={`mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900`}>
            <div className={`border-b border-slate-200/70 p-5 dark:border-slate-800 md:p-6 ${guideStyle.bg}`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${guideStyle.gradient} text-white shadow-lg`}>
                  <selected.icon size={22} />
                </div>
                <div>
                  <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                    <Sparkles size={11} /> Belajar 60 detik
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{TYPES.find((t) => t.value === type)?.label}</h2>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{guide.intro}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-[1.1fr_.9fr] md:p-6">
              <div>
                <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Yang perlu kamu ingat</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {guide.points.map((point) => (
                    <div key={point} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                      <div className="flex gap-2">
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${guideStyle.bg} ${guideStyle.text}`}><Sparkles size={10} /></span>
                        <p className="text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-300">{point}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-2xl bg-slate-900 p-4 text-sm text-white dark:bg-slate-800">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/60">Pemantik</p>
                  <p className="mt-1 leading-relaxed text-white/90">{guide.prompt}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="mb-2 flex items-center gap-2"><Lightbulb size={16} className="text-amber-500" /><p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Contoh singkat</p></div>
                <p className="whitespace-pre-line text-sm italic leading-7 text-slate-600 dark:text-slate-300">“{guide.example}”</p>
              </div>
            </div>
          </section>
        );
      })()}

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
