import type { Metadata } from "next";
import Link from "next/link";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import {
  Sparkles,
  FileText,
  ScrollText,
  Star,
  ShoppingBag,
  Users,
  Gamepad2,
  BookOpen,
  BarChart3,
  Shield,
  ChevronRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Fitur Lengkap",
  description: "Jelajahi semua fitur BahasaCerdas: AI generator RPP, bank soal, kuis multiplayer, toko karya, komunitas MGMP, dan masih banyak lagi.",
};

const features = [
  {
    icon: Sparkles,
    title: "AI Generator RPP",
    desc: "Hasilkan RPP lengkap dengan tujuan pembelajaran, kegiatan inti, asesmen, dan lampiran sesuai Kurikulum Merdeka dalam 30 detik.",
    color: "bg-red-50 text-primary",
    href: "/guru/ai-tools",
  },
  {
    icon: ScrollText,
    title: "Generator Soal HOTS",
    desc: "Buat soal HOTS + kisi-kisi + rubrik penilaian otomatis. Tinggal masukkan topik, AI kerjakan sisanya.",
    color: "bg-amber-50 text-amber-600",
    href: "/guru/ai-tools",
  },
  {
    icon: Star,
    title: "Pemeriksa Otomatis",
    desc: "Nilai tugas esai, karangan, dan jawaban terbuka siswa secara otomatis dengan analisis bahasa cerdas.",
    color: "bg-emerald-50 text-emerald-600",
    href: "/guru/ai-tools/grading",
  },
  {
    icon: ShoppingBag,
    title: "Toko Karya Guru",
    desc: "Jual RPP, modul, PPT, soal, dan video pembelajaran. Dapatkan 80% komisi dari setiap penjualan.",
    color: "bg-violet-50 text-violet-600",
    href: "/marketplace",
  },
  {
    icon: Gamepad2,
    title: "Kuis Multiplayer",
    desc: "Buat kuis interaktif, siswa bermain secara real-time. Tebak kata, susun kata, dan berbagai mode game seru.",
    color: "bg-cyan-50 text-cyan-600",
    href: "/guru/game/lobby",
  },
  {
    icon: Users,
    title: "Komunitas MGMP",
    desc: "Forum diskusi, webinar, dan sharing session dengan sesama guru Bahasa Indonesia dari seluruh Indonesia.",
    color: "bg-blue-50 text-blue-600",
    href: "/guru/komunitas",
  },
  {
    icon: BookOpen,
    title: "Bank Soal & UKBI",
    desc: "Akses ribuan soal siap pakai, simulasi UKBI, dan TKA untuk persiapan asesmen siswa.",
    color: "bg-rose-50 text-rose-600",
    href: "/guru/bank-soal",
  },
  {
    icon: BarChart3,
    title: "Analisis & Laporkan",
    desc: "Pantau progres siswa, hasil kuis, dan kinerja kelas secara real-time dengan dashboard visual.",
    color: "bg-indigo-50 text-indigo-600",
    href: "/guru/beranda",
  },
  {
    icon: Shield,
    title: "Keamanan Data",
    desc: "Enkripsi SSL 256-bit, server aman, dan privasi data terjamin. Karya Anda dilindungi hak cipta.",
    color: "bg-green-50 text-green-600",
    href: "/",
  },
];

export default function FiturPage() {
  return (
    <main className="min-h-screen">
      <PageNavbar />

      <section className="relative pt-28 pb-16 lg:pb-20 bg-gradient-to-b from-white via-white to-zinc-50 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="section-container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <Sparkles size={12} className="text-primary" />
            <span className="text-xs font-semibold text-primary">Fitur Lengkap</span>
          </div>
          <h1 className="heading-lg text-zinc-900 mb-5 max-w-3xl mx-auto">
            Semua yang Anda Butuhkan dalam{" "}
            <span className="text-primary">Satu Platform</span>
          </h1>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed max-w-2xl mx-auto">
            BahasaCerdas menyediakan 9 fitur unggulan yang dirancang khusus untuk
            mempermudah guru Bahasa Indonesia dalam mengajar, berbagi, dan berkembang.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-white">
        <div className="section-container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <Link
                  key={f.title}
                  href={f.href}
                  className="group p-6 lg:p-8 rounded-2xl bg-zinc-50/80 border border-zinc-100 hover:border-zinc-200 card-hover"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-2.5 group-hover:text-primary transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed mb-4">
                    {f.desc}
                  </p>
                  <div className="flex items-center gap-1 text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Pelajari <ChevronRight size={16} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-zinc-900 text-center">
        <div className="section-container">
          <h2 className="heading-lg text-white mb-4">
            Siap Mencoba Semua Fitur?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
            Gratis 30 hari, akses semua fitur premium, batalkan kapan saja.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-zinc-900 bg-white hover:bg-zinc-100 rounded-xl transition-all duration-200 shadow-xl"
          >
            Mulai Gratis Sekarang
          </Link>
        </div>
      </section>

      <PageFooter />
    </main>
  );
}
