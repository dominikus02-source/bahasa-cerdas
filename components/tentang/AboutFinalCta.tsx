import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function AboutFinalCta() {
  return (
    <section className="py-16 lg:py-20 bg-zinc-50 text-center" aria-labelledby="about-cta-heading">
      <div className="section-container">
        <h2 id="about-cta-heading" className="heading-md text-zinc-900 mb-4 max-w-2xl mx-auto">
          Bahasa Indonesia sedang bertumbuh.{" "}
          <span className="text-primary">Mari tumbuh bersama.</span>
        </h2>
        <p className="text-base text-zinc-500 leading-relaxed max-w-xl mx-auto mb-8">
          Daftar gratis dan mulai menjelajahi ekosistem belajar Bahasa
          Indonesia — untuk guru, murid, dan sekolah.
        </p>
        <Link
          href="/register"
          className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl focus-ring"
        >
          Mulai Gratis Sekarang
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}