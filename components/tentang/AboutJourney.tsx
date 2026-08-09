import { Rocket, Sprout, TrendingUp, CalendarDays } from "lucide-react";

const timeline = [
  {
    icon: Rocket,
    date: "April 2026",
    title: "Awal Perjalanan",
    desc: "Pengembangan BahasaCerdas dimulai — gagasan ekosistem pembelajaran Bahasa Indonesia dirancang dan dibangun.",
    active: false,
  },
  {
    icon: Sprout,
    date: "2026",
    title: "Ekosistem Bertumbuh",
    desc: "Belajar, berlatih, berkarya, berinteraksi, dan berkompetisi hadir dalam satu platform yang terus berkembang.",
    active: false,
  },
  {
    icon: TrendingUp,
    date: "2026",
    title: "Berkembang Bersama Komunitas",
    desc: "Masukan guru, komunitas MGMP, sekolah, dan karya yang lahir dari pengguna menjadi arah pengembangan berikutnya.",
    active: false,
  },
  {
    icon: CalendarDays,
    date: "Hari Ini",
    title: "Terus Belajar & Bertumbuh",
    desc: "BahasaCerdas berkembang setiap hari — bersama guru, murid, sekolah, dan komunitas Bahasa Indonesia.",
    active: true,
  },
];

export default function AboutJourney() {
  return (
    <section className="py-16 lg:py-20 bg-zinc-50" aria-labelledby="about-journey-heading">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">Perjalanan</span>
          </div>
          <h2 id="about-journey-heading" className="heading-md text-zinc-900 mb-4">
            Dari April 2026, tumbuh <span className="text-primary">setiap hari.</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            BahasaCerdas dibangun secara bertahap — dan setiap tahap
            menghadirkan ekosistem yang lebih lengkap.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {timeline.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.title}
                className="p-5 lg:p-6 rounded-2xl bg-white border border-zinc-100 card-hover relative"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-4">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <span className="inline-block text-[11px] font-bold text-primary bg-primary-light px-3 py-1 rounded-full mb-3">
                  {t.date}
                </span>
                <h3 className="text-base font-bold text-zinc-900 mb-2">{t.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{t.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}