import { Sparkles, Users, ShoppingBag, Gamepad2 } from "lucide-react";

const reasons = [
  {
    icon: Sparkles,
    title: "AI Canggih untuk Guru",
    description:
      "Hasilkan RPP, soal HOTS, dan materi ajar dalam hitungan detik dengan AI yang dilatih khusus untuk kurikulum Bahasa Indonesia.",
    color: "bg-red-50 text-primary",
    gradient: "from-red-50 to-rose-50",
  },
  {
    icon: Users,
    title: "Komunitas MGMP Terbesar",
    description:
      "Bergabung dengan ribuan guru Bahasa Indonesia, diskusi, kolaborasi, dan dapatkan inspirasi dari sesama guru di seluruh Indonesia.",
    color: "bg-amber-50 text-amber-600",
    gradient: "from-amber-50 to-yellow-50",
  },
  {
    icon: ShoppingBag,
    title: "Toko Karya Guru",
    description:
      "Jual RPP, modul, dan materi ajar Anda. Dapatkan penghasilan tambahan sambil berbagi karya terbaik dengan sesama guru.",
    color: "bg-emerald-50 text-emerald-600",
    gradient: "from-emerald-50 to-teal-50",
  },
  {
    icon: Gamepad2,
    title: "Belajar Jadi Seru",
    description:
      "Kuis multiplayer, tebak kata, dan game edukasi interaktif yang membuat siswa antusias belajar Bahasa Indonesia.",
    color: "bg-violet-50 text-violet-600",
    gradient: "from-violet-50 to-purple-50",
  },
];

export default function MengapaSection() {
  return (
    <section className="relative py-20 lg:py-28 bg-zinc-50">
      {/* Subtle batik accent */}
      <div
        className="absolute right-0 top-0 w-[300px] h-[300px] lg:w-[500px] lg:h-[500px] opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: "url('/batik bg bc.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="section-container relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">
              Mengapa BahasaCerdas?
            </span>
          </div>
          <h2 className="heading-lg text-zinc-900 mb-5">
            Platform All-in-One untuk{" "}
            <span className="text-primary">Guru Bahasa Indonesia</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            Semua yang Anda butuhkan dalam satu platform. Dari persiapan mengajar
            hingga pengembangan karir.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {reasons.map((reason, i) => {
            const Icon = reason.icon;
            return (
              <div
                key={reason.title}
                className="group relative p-8 lg:p-10 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-200 card-hover"
              >
                <div className={`w-14 h-14 rounded-2xl ${reason.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={28} />
                </div>
                <h3 className="text-xl lg:text-2xl font-display font-bold text-zinc-900 mb-3">
                  {reason.title}
                </h3>
                <p className="text-base text-zinc-500 leading-relaxed">
                  {reason.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
