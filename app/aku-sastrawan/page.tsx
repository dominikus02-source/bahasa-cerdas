import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  Feather,
  FileText,
  Layers3,
  LockKeyhole,
  PenLine,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import { getUser } from "@/lib/supabase/server";

const tracks = [
  {
    id: "cerpen",
    label: "Jalur Cerpen",
    eyebrow: "Selesaikan satu cerita",
    title: "Cerita pendek yang meninggalkan kesan.",
    description:
      "Pelajari cara menemukan ide, membangun konflik, menghidupkan tokoh, lalu menulis dan merevisi cerpen sampai tuntas.",
    steps: ["Ide & premis", "Tokoh & konflik", "Adegan & dialog", "Draf & revisi"],
    icon: BookOpen,
    tone: "from-violet-500/15 via-fuchsia-500/10 to-transparent",
  },
  {
    id: "novel",
    label: "Jalur Novel",
    eyebrow: "Bangun cerita panjang",
    title: "Dari gagasan besar menjadi draf novel.",
    description:
      "Rancang fondasi cerita, susun kerangka bab, jaga konsistensi karakter, dan bangun kebiasaan menulis hingga draf pertama selesai.",
    steps: ["Premis & dunia cerita", "Karakter & alur", "Kerangka bab", "Draf & rencana revisi"],
    icon: Layers3,
    tone: "from-amber-500/15 via-rose-500/10 to-transparent",
  },
];

const pillars = [
  {
    icon: BookOpen,
    title: "Peta kurikulum",
    description: "Peta belajar cerpen dan novel dengan pelacakan progres. Tandai tahap yang selesai.",
  },
  {
    icon: PenLine,
    title: "Writing Studio",
    description: "Satu ruang untuk mengembangkan ide, menyusun struktur, dan melanjutkan naskah secara bertahap.",
  },
  {
    icon: BrainCircuit,
    title: "AI Writing Coach",
    description: "Pendamping untuk mengevaluasi alur, karakter, dialog, sudut pandang, dan pilihan bahasa.",
  },
  {
    icon: Target,
    title: "Progres yang nyata",
    description: "Lanjutkan naskah melalui Writing Studio. Progres kurikulum tersimpan di akunmu.",
  },
];

const process = [
  ["01", "Pilih jalur", "Mulai dari cerpen atau novel sesuai tujuanmu."],
  ["02", "Pelajari teknik", "Ikuti peta tahapan dan tandai progresmu di kurikulum."],
  ["03", "Tulis karyamu", "Bangun ide menjadi draf dalam ruang menulis pribadi."],
  ["04", "Evaluasi & revisi", "Minta masukan AI Coach jika layanan AI tersedia, lalu revisi naskahmu sendiri."],
];

export default async function AkuSastrawanPage() {
  const user = await getUser();
  const startHref = user ? "/aku-sastrawan/kurikulum" : "/login?next=%2Faku-sastrawan";

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[520px] bg-primary/5 blur-3xl" />
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/20">
            <Feather size={21} />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-black tracking-tight">AKU SASTRAWAN</span>
            <span className="block text-xs text-muted-foreground">by BahasaCerdas</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 sm:inline-flex">
            <Sparkles size={13} /> Premium Writing Academy
          </span>
          <Link
            href={user ? "#program" : "/login?next=%2Faku-sastrawan"}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {user ? "Jelajahi program" : "Masuk"}
            <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 md:pb-24 md:pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-3.5 py-2 text-xs font-bold text-violet-700 dark:text-violet-300">
            <Sparkles size={14} /> RUANG BELAJAR DAN BERKARYA SASTRA
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Jangan cuma punya ide.
            <span className="mt-2 block bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-500 bg-clip-text text-transparent">
              Selesaikan ceritamu.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Ruang menulis premium untuk mengembangkan cerpen dan novel, menyimpan naskah pribadi, serta meminta masukan AI Writing Coach saat layanan tersedia. Peta kurikulum tersedia; modul pembelajaran interaktif sedang disiapkan.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={startHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-violet-600 px-6 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            >
              Lihat program menulis <ArrowRight size={17} />
            </Link>
            <a
              href="#cara-kerja"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-background/80 px-6 text-sm font-semibold transition hover:bg-muted"
            >
              Kenali cara belajarnya
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><Check size={15} className="text-violet-600" /> Jalur cerpen & novel</span>
            <span className="inline-flex items-center gap-2"><Check size={15} className="text-violet-600" /> Peta belajar cerpen & novel</span>
            <span className="inline-flex items-center gap-2"><Check size={15} className="text-violet-600" /> AI sebagai pendamping</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-amber-500/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-card shadow-2xl shadow-violet-950/10">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Writing Studio</p>
                <p className="mt-1 text-sm font-bold">Proyek ceritamu</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Fokus menulis</span>
            </div>
            <div className="space-y-4 p-5 sm:p-7">
              <div className="rounded-2xl bg-muted/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Proyek contoh</span>
                  <span className="text-xs text-muted-foreground">Ilustrasi antarmuka</span>
                </div>
                <h2 className="mt-3 font-serif text-2xl font-bold tracking-tight">Rumah yang Mengingat Hujan</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Sebuah cerita dimulai dari satu pertanyaan yang belum berani dijawab tokohnya.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs">Drama keluarga</span>
                  <span className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs">Sudut pandang orang pertama</span>
                </div>
              </div>
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                <div className="flex items-center gap-2 text-sm font-bold"><WandSparkles size={17} className="text-violet-600" /> Catatan AI Writing Coach</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">“Apa yang paling ditakuti tokohmu jika ia akhirnya mengatakan kebenaran? Jawaban itu bisa menjadi sumber konflik yang lebih kuat.”</p>
                <p className="mt-3 text-xs font-medium text-violet-700 dark:text-violet-300">Pertanyaan pemandu, bukan pengganti suaramu.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border p-3"><p className="text-lg font-black">01</p><p className="mt-1 text-xs text-muted-foreground">Ide</p></div>
                <div className="rounded-xl border border-border p-3"><p className="text-lg font-black">02</p><p className="mt-1 text-xs text-muted-foreground">Kerangka</p></div>
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3"><p className="text-lg font-black text-violet-700 dark:text-violet-300">03</p><p className="mt-1 text-xs text-muted-foreground">Draf</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="program" className="relative z-10 border-y border-border bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">Dua jalur, satu tujuan</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Pilih cerita yang ingin kamu selesaikan.</h2>
            <p className="mt-4 leading-7 text-muted-foreground">Kamu bisa mulai dari nol atau membawa naskah yang selama ini belum selesai.</p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {tracks.map((track) => {
              const Icon = track.icon;
              return (
                <article key={track.id} className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl sm:p-8">
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${track.tone} opacity-80`} />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background/80"><Icon size={22} /></span>
                      <span className="rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1.5 text-xs font-bold text-violet-700 dark:text-violet-300">PROGRAM PREMIUM</span>
                    </div>
                    <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{track.eyebrow}</p>
                    <h3 className="mt-2 text-2xl font-black tracking-tight">{track.title}</h3>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{track.description}</p>
                    <div className="mt-6 grid gap-2 sm:grid-cols-2">
                      {track.steps.map((step) => <div key={step} className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/70 px-3 py-2.5 text-sm"><Check size={15} className="shrink-0 text-violet-600" />{step}</div>)}
                    </div>
                    <Link href={startHref} className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-bold text-background transition hover:opacity-85">
                      Jelajahi jalur ini <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">Lebih dari kelas menulis</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Teman belajar yang ikut menjaga prosesmu.</h2>
            <p className="mt-4 leading-7 text-muted-foreground">Semua dirancang untuk membuat proses menulis lebih terarah, tanpa mengambil alih kreativitas dan suara khas setiap penulis.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return <article key={pillar.title} className="rounded-2xl border border-border bg-card p-5 transition hover:border-violet-500/30">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300"><Icon size={20} /></span>
                <h3 className="mt-4 font-bold">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{pillar.description}</p>
              </article>;
            })}
          </div>
        </div>
      </section>

      <section id="cara-kerja" className="relative z-10 border-y border-border bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">Belajar sambil menghasilkan karya</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Langkah kecil. Cerita yang selesai.</h2>
          </div>
          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {process.map(([number, title, description]) => <article key={number} className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-black text-violet-700 dark:text-violet-300">{number}</p>
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 p-7 text-white shadow-xl shadow-violet-700/20 sm:p-10 lg:p-12">
          <div className="grid gap-7 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold"><LockKeyhole size={14} /> AKSES PREMIUM</div>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Berikan ruang untuk ceritamu tumbuh.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">Pilih langganan bulanan atau tahunan untuk mengakses pengalaman belajar premium. Detail harga dan checkout akan mengikuti konfigurasi langganan resmi BahasaCerdas.</p>
            </div>
            <Link href={startHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-violet-800 transition hover:bg-violet-50">
              {user ? "Jelajahi program" : "Masuk untuk memulai"} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} BahasaCerdas · AKU SASTRAWAN</p>
          <Link href="/" className="inline-flex items-center gap-2 font-semibold transition hover:text-foreground"><FileText size={15} /> Kembali ke BahasaCerdas</Link>
        </div>
      </footer>
    </main>
  );
}
