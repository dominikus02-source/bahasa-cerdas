import Link from "next/link";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";

export default function AboutHero() {
  return (
    <section className="relative pt-28 pb-16 lg:pb-20 bg-gradient-to-b from-white via-white to-zinc-50 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" aria-hidden="true" />
      <div className="section-container relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
          <span className="text-xs font-semibold text-primary">Tentang BahasaCerdas</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-900 mb-6 max-w-3xl mx-auto leading-[1.15]">
          BahasaCerdas dibangun untuk membuat Bahasa Indonesia lebih dekat,{" "}
          <span className="text-primary">hidup, dan relevan</span>.
        </h1>
        <p className="text-base lg:text-lg text-zinc-500 leading-relaxed max-w-2xl mx-auto mb-8">
          Satu ekosistem yang menghubungkan guru, murid, pembelajaran, latihan,
          karya, dan komunitas Bahasa Indonesia — dengan AI membantu guru, dan
          guru tetap memutuskan.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="#ekosistem"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl focus-ring"
          >
            <ArrowRight size={16} className="rotate-90" aria-hidden="true" />
            Kenali Ekosistem
          </Link>
          <Link
            href="#tim"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl transition-all duration-200 focus-ring"
          >
            <Users size={16} aria-hidden="true" />
            Kenali Tim
          </Link>
        </div>
        <p className="mt-8 text-xs text-zinc-400 max-w-xl mx-auto leading-relaxed">
          <ShieldCheck size={12} className="inline-block mr-1 text-primary" aria-hidden="true" />
          BahasaCerdas dikembangkan oleh CV Obah Mamah (nama dagang Teras Kata),
          badan usaha berkedudukan di Tangerang, Banten.
        </p>
      </div>
    </section>
  );
}