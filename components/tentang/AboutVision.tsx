import { Globe, Lightbulb } from "lucide-react";

export default function AboutVision() {
  return (
    <section className="py-16 lg:py-20 bg-white" aria-labelledby="about-visi-heading">
      <div className="section-container">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 max-w-4xl mx-auto">
          <div className="p-8 lg:p-10 rounded-2xl bg-gradient-to-br from-zinc-50 to-zinc-100 border border-zinc-200 card-hover">
            <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-5">
              <Globe size={24} aria-hidden="true" />
            </div>
            <h2 id="about-visi-heading" className="text-xl lg:text-2xl font-bold text-zinc-900 mb-4">
              Visi
            </h2>
            <p className="text-zinc-600 leading-relaxed text-base lg:text-lg">
              Menjadikan Bahasa Indonesia lebih dekat, hidup, dan relevan —
              melalui ekosistem yang menghubungkan guru, murid, sekolah, dan
              komunitas dalam satu perjalanan belajar.
            </p>
          </div>
          <div className="p-8 lg:p-10 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 card-hover">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
              <Lightbulb size={24} aria-hidden="true" />
            </div>
            <h2 className="text-xl lg:text-2xl font-bold text-primary mb-4">Misi</h2>
            <ul className="space-y-3">
              {[
                "Menyediakan ekosistem belajar, latihan, berkarya, dan berkompetisi Bahasa Indonesia dalam satu platform.",
                "Memperkuat guru dengan alat bantu yang membebaskan waktu untuk mengajar — bukan menggantikan peran guru.",
                "Menumbuhkan budaya menulis, membaca, dan berbahasa Indonesia yang baik pada murid.",
                "Bertumbuh bersama guru, MGMP, sekolah, dan komunitas melalui produk yang lahir dari kebutuhan nyata.",
              ].map((m) => (
                <li key={m} className="flex items-start gap-2 text-sm text-zinc-600 leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}