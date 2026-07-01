import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import { Sparkles, Users, ShoppingBag, Heart, Shield, BrainCircuit, BookOpen, Lightbulb, ArrowRight, GraduationCap, Globe, PenTool } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Tentang BahasaCerdas — Misi, Visi & Tim",
  description: "Pelajari tentang BahasaCerdas: platform edukasi Bahasa Indonesia yang dibangun oleh guru, untuk guru. Misi kami membantu guru mengajar lebih efektif dengan teknologi AI dan komunitas MGMP.",
  alternates: {
    canonical: "https://www.bahasacerdas.com/tentang",
  },
  openGraph: {
    title: "Tentang BahasaCerdas | Platform Edukasi Bahasa Indonesia",
    description: "Dibangun oleh guru, untuk guru. Misi, visi, dan tim di balik BahasaCerdas.",
    url: "https://www.bahasacerdas.com/tentang",
  },
};

const founders = [
  {
    initial: "D",
    name: "Dominikus Wahyu",
    role: "Founder & CEO",
    image: "/founders/dominikus.png",
    desc: "Memimpin visi produk, arsitektur platform, pengembangan teknologi, AI, dan arah pertumbuhan BahasaCerdas. BahasaCerdas lahir dari keyakinan bahwa teknologi harus membantu guru bekerja lebih efisien tanpa kehilangan kedalaman manusiawi dalam mengajar.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    initial: "A",
    name: "Alexander Suryanta",
    role: "Co-Founder & Head of Content",
    image: "/founders/alexander.jpg",
    desc: "Menguatkan fondasi konten dan pedagogi BahasaCerdas melalui pengalaman panjang dalam pengajaran Bahasa Indonesia, penulisan buku teks, dan pengembangan materi pembelajaran.",
    color: "from-violet-500 to-purple-600",
  },
  {
    initial: "W",
    name: "Washadi",
    role: "Co-Founder & Head of Community",
    image: "/founders/washadi.png",
    desc: "Menghubungkan BahasaCerdas dengan kebutuhan nyata guru dan komunitas Bahasa Indonesia melalui pengalaman sebagai pendidik, penggerak MGMP, dan pengembang jejaring komunitas.",
    color: "from-amber-500 to-orange-600",
  },
];

const values = [
  {
    icon: GraduationCap,
    title: "Berpihak pada Guru",
    desc: "Setiap fitur dirancang untuk mengurangi beban teknis guru dan memberi lebih banyak ruang untuk mengajar.",
  },
  {
    icon: PenTool,
    title: "Mencintai Bahasa Indonesia",
    desc: "Bahasa Indonesia bukan hanya mata pelajaran, tetapi jembatan berpikir, berbudaya, dan berkomunikasi.",
  },
  {
    icon: BrainCircuit,
    title: "AI yang Membantu, Bukan Menggantikan",
    desc: "Teknologi dipakai untuk mempercepat pekerjaan, sementara arah, makna, dan sentuhan pendidikan tetap berada di tangan guru.",
  },
  {
    icon: Users,
    title: "Tumbuh Bersama Komunitas",
    desc: "BahasaCerdas dibangun untuk berkembang bersama guru, MGMP, sekolah, siswa, dan karya pendidikan Indonesia.",
  },
];

const steps = [
  {
    date: "Maret 2026",
    title: "Gagasan Dimulai",
    desc: "BahasaCerdas direncanakan sebagai respons terhadap kebutuhan nyata guru Bahasa Indonesia: alat yang cepat, relevan, dan memahami konteks lokal.",
  },
  {
    date: "2026",
    title: "Dibangun Secara Marathon",
    desc: "Fondasi platform dikembangkan cepat dan terarah: AI tools, dashboard guru, sistem kredit, pembayaran PRO, toko karya, dan admin panel.",
  },
  {
    date: "Q3 2026",
    title: "Public Launch",
    desc: "Fokus awal adalah menghadirkan platform yang stabil, berguna, dan siap diuji bersama guru-guru pertama.",
  },
  {
    date: "Setelah Launch",
    title: "Bertumbuh Bersama Komunitas",
    desc: "BahasaCerdas akan berkembang melalui masukan guru, komunitas MGMP, sekolah, dan karya pendidikan yang lahir dari pengguna.",
  },
];

export default function TentangPage() {
  return (
    <main className="min-h-screen">
      <PageNavbar />

      {/* Hero — Section 1 */}
      <section className="relative pt-28 pb-16 lg:pb-20 bg-gradient-to-b from-white via-white to-zinc-50 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="section-container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">Tentang BahasaCerdas</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-900 mb-6 max-w-3xl mx-auto leading-[1.15]">
            Membangun Masa Depan{" "}
            <span className="text-primary">Pembelajaran Bahasa Indonesia</span>
          </h1>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed max-w-2xl mx-auto">
            BahasaCerdas lahir dari keyakinan bahwa guru dan siswa Indonesia membutuhkan
            platform yang lebih relevan, lebih cerdas, dan lebih dekat dengan realitas
            pembelajaran Bahasa Indonesia hari ini.
          </p>
        </div>
      </section>

      {/* Mengapa Dibangun — Section 2 */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="section-container">
          <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
            <h2 className="text-2xl lg:text-3xl font-bold text-zinc-900 mb-4">
              Mengapa BahasaCerdas Dibangun
            </h2>
            <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
              Bahasa Indonesia adalah mata pelajaran wajib, tetapi sering kali belum
              diajarkan dengan cara yang cukup relevan dengan dunia siswa hari ini. Di sisi
              lain, guru Bahasa Indonesia menghadapi beban besar: menyiapkan RPP, modul ajar,
              soal, penilaian, presentasi, dan materi kreatif hampir setiap minggu.
            </p>
            <p className="text-base lg:text-lg text-zinc-500 leading-relaxed mt-4">
              BahasaCerdas dibangun untuk menjawab kebutuhan itu. Bukan untuk menggantikan
              guru, tetapi untuk memperkuat peran guru melalui teknologi yang memahami
              konteks Bahasa Indonesia, Kurikulum Merdeka, literasi, dan karya.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
            <div className="p-6 lg:p-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <GraduationCap size={24} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">Untuk Guru</h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Membantu guru menyiapkan materi, soal, presentasi, koreksi, dan penilaian
                lebih cepat tanpa kehilangan kualitas pedagogis.
              </p>
            </div>

            <div className="p-6 lg:p-8 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100">
              <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mb-4">
                <BookOpen size={24} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">Untuk Siswa</h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Mendorong siswa menulis, membaca, berkarya, dan mencintai Bahasa Indonesia
                melalui pengalaman belajar yang lebih aktif dan relevan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Apa yang Kami Bangun — Section 3 */}
      <section className="py-16 lg:py-20 bg-zinc-50">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
            <h2 className="text-2xl lg:text-3xl font-bold text-zinc-900 mb-4">
              Apa yang <span className="text-primary">Kami Bangun</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="p-6 lg:p-8 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-200 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-4">
                <BrainCircuit size={24} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">
                AI untuk Guru Bahasa Indonesia
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Alat AI untuk membantu guru membuat RPP, modul ajar, soal, presentasi,
                koreksi EYD, feedback tulisan, penilaian, dan analisis teks.
              </p>
            </div>

            <div className="p-6 lg:p-8 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-200 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">
                Belajar yang Lebih Menarik
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Pengalaman belajar yang menggabungkan kuis, aktivitas, portofolio karya,
                dan gamifikasi agar Bahasa Indonesia terasa lebih hidup bagi siswa.
              </p>
            </div>

            <div className="p-6 lg:p-8 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-200 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center mb-4">
                <ShoppingBag size={24} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">
                Toko Karya Guru
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Ruang bagi guru untuk berbagi dan menjual karya pendidikan seperti modul,
                RPP, video, ebook, dan materi ajar lainnya.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Visi & Misi — Section 4 */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="section-container">
          <div className="grid md:grid-cols-2 gap-10 lg:gap-16 max-w-4xl mx-auto">
            <div className="p-8 lg:p-10 rounded-2xl bg-gradient-to-br from-zinc-50 to-zinc-100 border border-zinc-200">
              <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-5">
                <Globe size={24} />
              </div>
              <h2 className="text-xl lg:text-2xl font-bold text-zinc-900 mb-4">Visi</h2>
              <p className="text-zinc-600 leading-relaxed text-base lg:text-lg">
                Menjadi ekosistem digital utama bagi guru Bahasa Indonesia untuk mengajar,
                berkarya, dan bertumbuh bersama.
              </p>
            </div>
            <div className="p-8 lg:p-10 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                <Lightbulb size={24} />
              </div>
              <h2 className="text-xl lg:text-2xl font-bold text-primary mb-4">Misi</h2>
              <p className="text-zinc-600 leading-relaxed text-base lg:text-lg">
                Menyediakan platform berbasis AI, komunitas, dan toko karya yang membantu
                guru menghemat waktu, meningkatkan kualitas pembelajaran, dan memperluas
                dampak literasi Indonesia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Langkah Awal — Section 5 */}
      <section className="py-16 lg:py-20 bg-zinc-50">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
            <h2 className="text-2xl lg:text-3xl font-bold text-zinc-900 mb-3">
              Langkah Awal 2026
            </h2>
            <p className="text-zinc-500">
              BahasaCerdas sedang dibangun sebagai fondasi awal menuju ekosistem literasi
              digital Bahasa Indonesia.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <div key={i} className="p-5 lg:p-6 rounded-2xl bg-white border border-zinc-100">
                <span className="inline-block text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full mb-3">
                  {s.date}
                </span>
                <h3 className="text-base font-bold text-zinc-900 mb-2">{s.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Team — Section 6 */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
            <h2 className="text-2xl lg:text-3xl font-bold text-zinc-900 mb-3">
              Tim Pendiri
            </h2>
            <p className="text-zinc-500">
              BahasaCerdas dibangun oleh kombinasi pengalaman pendidikan, teknologi, konten,
              dan komunitas guru.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {founders.map((f) => (
              <div key={f.initial} className="text-center p-6 lg:p-8 rounded-2xl bg-zinc-50 border border-zinc-100">
                <div className="relative w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <Image
                    src={f.image}
                    alt={f.name}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                </div>
                <h3 className="text-lg font-bold text-zinc-900">{f.name}</h3>
                <p className="text-sm font-semibold text-primary mb-3">{f.role}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values — Section 7 */}
      <section className="py-16 lg:py-20 bg-zinc-50">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
            <h2 className="text-2xl lg:text-3xl font-bold text-zinc-900 mb-4">
              Nilai-nilai <span className="text-primary">Kami</span>
            </h2>
            <p className="text-zinc-500">Prinsip yang menuntun setiap langkah kami.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="p-6 lg:p-8 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-200 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-4">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-2">{v.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA — Section 8 */}
      <section className="py-16 lg:py-20 bg-zinc-900 text-center">
        <div className="section-container">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
            Bergabung dalam Langkah Awal BahasaCerdas
          </h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
            Coba Guru Pro Trial 30 hari dan bantu kami membangun platform yang benar-benar
            dibutuhkan guru Bahasa Indonesia.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-zinc-900 bg-white hover:bg-zinc-100 rounded-xl transition-all duration-200 shadow-xl"
          >
            Mulai Gratis 30 Hari
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <PageFooter />
    </main>
  );
}
