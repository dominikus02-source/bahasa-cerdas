import { CurriculumStages } from "@/components/aku-sastrawan/CurriculumStages";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Lock,
  Feather,
  Layers3,
  Sparkles,
  Target,
} from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { hasAkuSastrawanAccess } from "@/lib/aku-sastrawan/access";

const curriculum = {
  cerpen: {
    title: "Jalur Cerpen",
    subtitle: "Dari ide kecil menjadi cerita yang utuh.",
    icon: BookOpen,
    stages: [
      { title: "Menemukan ide dan premis", detail: "Menemukan inti cerita, pertanyaan utama, dan perubahan yang dialami tokoh.", lessons: ["Bank ide personal", "Premis satu kalimat", "Tema tanpa menggurui"] },
      { title: "Tokoh dan konflik", detail: "Membuat tokoh yang menginginkan sesuatu dan menghadapi hambatan.", lessons: ["Keinginan dan ketakutan tokoh", "Konflik internal dan eksternal", "Taruhan cerita"] },
      { title: "Adegan, dialog, dan sudut pandang", detail: "Mengubah ringkasan menjadi adegan yang hidup dan terarah.", lessons: ["Membangun adegan", "Dialog yang alami", "Memilih sudut pandang"] },
      { title: "Draf pertama", detail: "Menyelesaikan cerita tanpa terjebak menyunting setiap kalimat.", lessons: ["Peta adegan", "Target draf", "Menjaga momentum"] },
      { title: "Revisi dan penyelesaian", detail: "Membaca ulang struktur, bahasa, dan dampak akhir cerita.", lessons: ["Revisi struktur", "Sunting kalimat", "Naskah final"] },
    ],
  },
  novel: {
    title: "Jalur Novel",
    subtitle: "Bangun cerita panjang dengan fondasi yang kuat.",
    icon: Layers3,
    stages: [
      { title: "Premis dan visi novel", detail: "Menentukan gagasan inti, genre, pembaca, dan janji cerita.", lessons: ["Premis novel", "Genre dan ekspektasi", "Tema dan pertanyaan besar"] },
      { title: "Dunia dan karakter", detail: "Menciptakan tokoh, relasi, latar, dan aturan dunia cerita.", lessons: ["Profil tokoh utama", "Relasi dan antagonisme", "Riset latar"] },
      { title: "Konflik dan struktur", detail: "Merancang konflik utama, titik balik, dan perkembangan tokoh.", lessons: ["Konflik berlapis", "Titik balik", "Busur karakter"] },
      { title: "Kerangka bab", detail: "Memecah alur menjadi rangkaian bab yang punya fungsi.", lessons: ["Sinopsis kerja", "Peta bab", "Tujuan setiap bab"] },
      { title: "Draf dan konsistensi", detail: "Menjaga ritme menulis, kontinuitas, dan arah cerita.", lessons: ["Rutinitas menulis", "Pemeriksaan kontinuitas", "Mengatasi kebuntuan"] },
      { title: "Revisi naskah", detail: "Menyiapkan pembacaan ulang dari struktur besar hingga kalimat.", lessons: ["Revisi makro", "Revisi adegan", "Sunting bahasa"] },
    ],
  },
};

export default async function AkuSastrawanCurriculumPage({
  searchParams,
}: {
  searchParams: Promise<{ jalur?: string }>;
}) {
  const user = await getUser();
  const hasAccess = user ? await hasAkuSastrawanAccess(user.id) : false;
  const params = await searchParams;
  const selected = params.jalur === "novel" ? "novel" : "cerpen";
  const track = curriculum[selected];
  const Icon = track.icon;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/aku-sastrawan" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> AKU SASTRAWAN
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-bold">
            <Sparkles size={13} /> Premium Academy
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-3xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Feather size={23} /></div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">Kurikulum bertahap</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Pilih jalur menulismu.</h1>
          <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">Dua jalur yang berbeda untuk membantumu bergerak dari gagasan menuju naskah yang selesai. Tandai progresmu di setiap tahap. Materi panduan sudah tersedia; modul latihan interaktif lanjutan akan menyusul.</p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {(["cerpen", "novel"] as const).map((key) => {
            const item = curriculum[key];
            const ItemIcon = item.icon;
            const active = key === selected;
            return (
              <Link key={key} href={`/aku-sastrawan/kurikulum?jalur=${key}`} className={`rounded-2xl border p-4 transition hover:border-primary/40 ${active ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border bg-card"}`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background border border-border"><ItemIcon size={19} /></span>
                  <span className="flex-1">
                    <span className="block font-bold">{item.title}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{item.stages.length} tahap rancangan</span>
                  </span>
                  {active ? <CheckCircle2 className="text-primary" size={19} /> : <ArrowRight size={17} className="text-muted-foreground" />}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-card p-5 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon size={23} /></span>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{track.title}</h2>
              <p className="mt-1 text-muted-foreground">{track.subtitle}</p>
            </div>
          </div>
          <div className="mt-7">
            <CurriculumStages track={selected} stages={track.stages} hasAccess={hasAccess} />
          </div>
          <div className="mt-6 rounded-2xl bg-muted/60 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Target size={20} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <h3 className="font-bold">Belajar sampai naskah selesai</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Tandai setiap tahap yang sudah kamu kuasai. Progres tersimpan di akunmu. Gunakan Writing Studio untuk menulis naskah dan AI Writing Coach (jika tersedia) untuk umpan balik.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={user ? "/aku-sastrawan/ruang-menulis" : "/login?next=%2Faku-sastrawan%2Fruang-menulis"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:opacity-90">
                Mulai menulis <ArrowRight size={16} />
              </Link>
              <Link href="/aku-sastrawan" className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold hover:bg-muted">Kembali ke produk</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
