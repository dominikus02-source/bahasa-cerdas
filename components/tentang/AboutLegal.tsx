import { Building2, Copyright, Globe, FileText, Mail } from "lucide-react";

const legalCards = [
  {
    icon: Building2,
    title: "Badan Usaha",
    lines: [
      "CV Obah Mamah",
      "Nama dagang: Teras Kata",
      "Kedudukan: Tangerang, Banten",
      "NIB 1217000151443",
    ],
  },
  {
    icon: Copyright,
    title: "Pencatatan Hak Cipta",
    lines: [
      "Judul: BahasaCerdas — Platform Pembelajaran Bahasa Indonesia Berbasis Kecerdasan Buatan",
      "Jenis: Program Komputer",
      "Nomor Pencatatan: 001326318",
      "Nomor Permohonan: EC002026106361 (6 Juli 2026)",
    ],
  },
  {
    icon: FileText,
    title: "Pencipta & Pemegang Hak Cipta",
    lines: [
      "Pencipta: Dominikus Wahyu Heru Cahyadi",
      "Pemegang Hak Cipta: CV Obah Mamah",
      "Pertama kali diumumkan: 3 Maret 2026",
      "Tempat: Kabupaten Tangerang · Status: Tercatat",
    ],
  },
  {
    icon: Globe,
    title: "Layanan Resmi",
    lines: [
      "bahasacerdas.com — ekosistem utama",
      "bahasacerdas.site — BIGT (Tes Global Bahasa Indonesia)",
      "Aplikasi Android: BahasaCerdas",
      "Tersedia untuk guru, murid, dan sekolah",
    ],
  },
];

export default function AboutLegal() {
  return (
    <section className="py-16 lg:py-20 bg-white" aria-labelledby="about-legal-heading">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">Legalitas & Transparansi</span>
          </div>
          <h2 id="about-legal-heading" className="heading-md text-zinc-900 mb-4">
            Dikelola secara <span className="text-primary">terbuka dan tercatat.</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            BahasaCerdas dikembangkan oleh badan usaha yang sah, dengan
            pencatatan kekayaan intelektual atas platform.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-5xl mx-auto mb-10">
          {legalCards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className="p-6 lg:p-8 rounded-2xl bg-zinc-50 border border-zinc-100 card-hover"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-4">
                  <Icon size={24} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 mb-3">{c.title}</h3>
                <ul className="space-y-2">
                  {c.lines.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-sm text-zinc-600 leading-relaxed">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="max-w-3xl mx-auto rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 p-6 lg:p-8 text-center">
          <p className="text-sm text-zinc-600 leading-relaxed">
            Butuh salinan dokumen pencatatan, informasi kerja sama, atau
            pertanyaan legalitas lainnya? Tim BahasaCerdas dapat dihubungi
            melalui email resmi.
          </p>
          <a
            href="mailto:halo@bahasacerdas.com"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark transition-colors focus-ring rounded-lg px-3 py-2"
            aria-label="Kirim email ke halo@bahasacerdas.com"
          >
            <Mail size={16} aria-hidden="true" />
            halo@bahasacerdas.com
          </a>
        </div>
      </div>
    </section>
  );
}