import Link from "next/link";
import { ArrowRight, Handshake, MessageCircleQuestion } from "lucide-react";

export default function AboutInvestorFaq() {
  return (
    <section className="py-16 lg:py-20 bg-white" aria-labelledby="about-investor-heading">
      <div className="section-container">
        <div className="rounded-3xl overflow-hidden bg-zinc-900 relative">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none select-none"
            style={{
              backgroundImage: "url('/batik bg bc.png')",
              backgroundSize: "400px",
              backgroundRepeat: "repeat",
            }}
            aria-hidden="true"
          />
          <div className="relative z-10 grid lg:grid-cols-2 gap-10 items-center p-8 lg:p-14">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 mb-5">
                <span className="text-xs font-semibold text-amber-400">Kemitraan & Investasi</span>
              </div>
              <h2 id="about-investor-heading" className="heading-md text-white mb-4">
                Bertumbuh bersama —{" "}
                <span className="text-amber-400">benih ekosistem yang terbuka.</span>
              </h2>
              <p className="text-base text-zinc-400 leading-relaxed mb-6">
                BahasaCerdas terbuka untuk kemitraan dengan sekolah, MGMP,
                penerbit, komunitas, dan pihak yang ingin membantu literasi
                Bahasa Indonesia bertumbuh — termasuk investor yang melihat
                nilai jangka panjang ekosistem ini.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="mailto:halo@bahasacerdas.com?subject=Kemitraan%20BahasaCerdas"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl focus-ring"
                >
                  <Handshake size={16} aria-hidden="true" />
                  Bicarakan Kemitraan
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </a>
                <Link
                  href="/faq"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all duration-200 focus-ring"
                >
                  <MessageCircleQuestion size={16} aria-hidden="true" />
                  Pertanyaan Umum
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              {[
                "Jalur komunikasi langsung dengan tim pendiri",
                "Informasi legalitas dan status pencatatan terbuka",
                "Terbuka untuk kolaborasi konten, distribusi, dan sekolah",
                "Visi jangka panjang: ekosistem literasi Bahasa Indonesia",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 px-5 py-4"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
                  <p className="text-sm text-zinc-300 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}