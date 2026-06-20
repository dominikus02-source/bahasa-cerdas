import type { Metadata } from "next";
import Link from "next/link";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import { Sparkles, Users, ShoppingBag, Gamepad2, Shield, Award, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description: "BahasaCerdas adalah platform lengkap untuk guru Bahasa Indonesia. AI generator RPP, bank soal, kuis multiplayer, toko karya, dan komunitas MGMP.",
};

const values = [
  {
    icon: Heart,
    title: "Cinta Bahasa Indonesia",
    desc: "Kami percaya Bahasa Indonesia adalah identitas bangsa. Misi kami adalah memperkuat pengajaran bahasa melalui teknologi.",
  },
  {
    icon: Award,
    title: "Kualitas Guru",
    desc: "Setiap fitur dirancang untuk membantu guru mengajar lebih efisien, kreatif, dan berdampak.",
  },
  {
    icon: Shield,
    title: "Aman & Terpercaya",
    desc: "Data dan karya guru dilindungi dengan enkripsi tingkat tinggi. Privasi adalah prioritas kami.",
  },
  {
    icon: Sparkles,
    title: "Inovasi Berkelanjutan",
    desc: "Kami terus mengembangkan fitur baru berbasis AI dan kebutuhan nyata guru di lapangan.",
  },
];

const milestones = [
  { year: "2024", event: "BahasaCerdas didirikan oleh tim pendidik dan teknolog" },
  { year: "Q1 2025", event: "Peluncuran AI Generator RPP dan Bank Soal" },
  { year: "Q2 2025", event: "Toko Karya & Komunitas MGMP diluncurkan" },
  { year: "Q3 2025", event: "10.000+ guru bergabung dari 34 provinsi" },
  { year: "2026", event: "Platform terlengkap untuk guru Bahasa Indonesia" },
];

export default function TentangPage() {
  return (
    <main className="min-h-screen">
      <PageNavbar />

      {/* Hero */}
      <section className="relative pt-28 pb-16 lg:pb-20 bg-gradient-to-b from-white via-white to-zinc-50 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="section-container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">Tentang Kami</span>
          </div>
          <h1 className="heading-lg text-zinc-900 mb-5 max-w-3xl mx-auto">
            Memberdayakan{" "}
            <span className="text-primary">Guru Bahasa Indonesia</span>{" "}
            dengan Teknologi
          </h1>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed max-w-2xl mx-auto">
            BahasaCerdas adalah platform lengkap yang menggabungkan kecerdasan buatan,
            komunitas MGMP, dan toko karya untuk membantu guru Bahasa Indonesia mengajar
            lebih efisien dan berdampak.
          </p>
        </div>
      </section>

      {/* Misi & Visi */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="section-container">
          <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
            <div className="p-8 lg:p-10 rounded-2xl bg-zinc-50 border border-zinc-100">
              <h2 className="heading-md text-zinc-900 mb-4">Visi</h2>
              <p className="text-zinc-500 leading-relaxed text-base lg:text-lg">
                Menjadi ekosistem pendidikan Bahasa Indonesia terbesar dan
                terpercaya di Indonesia, yang memberdayakan setiap guru untuk
                mengajar dengan kreativitas tanpa batas.
              </p>
            </div>
            <div className="p-8 lg:p-10 rounded-2xl bg-primary-light border border-primary/10">
              <h2 className="heading-md text-primary mb-4">Misi</h2>
              <p className="text-zinc-600 leading-relaxed text-base lg:text-lg">
                Menyediakan platform lengkap dengan AI canggih, konten
                berkualitas, dan komunitas yang mendukung guru Bahasa Indonesia
                di seluruh Indonesia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Nilai-nilai */}
      <section className="py-16 lg:py-20 bg-zinc-50">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
            <h2 className="heading-lg text-zinc-900 mb-4">
              Nilai-nilai <span className="text-primary">Kami</span>
            </h2>
            <p className="text-zinc-500">Prinsip yang menuntun setiap langkah kami.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

      {/* Timeline */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
            <h2 className="heading-lg text-zinc-900 mb-4">
              Perjalanan <span className="text-primary">Kami</span>
            </h2>
            <p className="text-zinc-500">Dari ide hingga menjadi platform yang melayani ribuan guru.</p>
          </div>
          <div className="max-w-2xl mx-auto">
            {milestones.map((m, i) => (
              <div key={m.year} className="relative flex gap-6 pb-8 last:pb-0">
                {i < milestones.length - 1 && (
                  <div className="absolute left-[17px] top-10 bottom-0 w-0.5 bg-zinc-200" />
                )}
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md shadow-primary/20">
                  {i + 1}
                </div>
                <div className="pt-1.5">
                  <span className="text-sm font-bold text-primary">{m.year}</span>
                  <p className="text-sm text-zinc-500 mt-0.5">{m.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-zinc-900 text-center">
        <div className="section-container">
          <h2 className="heading-lg text-white mb-4">
            Siap Bergabung dengan{" "}
            <span className="text-gold-400">10.000+ Guru</span>?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
            Mulai perjalanan Anda bersama BahasaCerdas. Gratis 30 hari, tanpa
            kartu kredit.
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
