import Link from "next/link";
import { BookOpen, Dumbbell, Feather, Users, Trophy, ArrowRight } from "lucide-react";

const ecosystems = [
  {
    icon: BookOpen,
    label: "BELAJAR",
    title: "Belajar",
    desc: "Materi, latihan, dan kuis per unit — dari jalur cerdas untuk semua usia hingga buku panduan per jenjang.",
  },
  {
    icon: Dumbbell,
    label: "BERLATIH & BERMAIN",
    title: "Berlatih & Bermain",
    desc: "Latihan soal, permainan kata, XP, dan koin yang membuat murid terus bergerak dan bertumbuh.",
  },
  {
    icon: Feather,
    label: "BERKARYA",
    title: "Berkarya",
    desc: "Murid menulis karya; guru menjual karya pendidikan — portofolio dan toko karya dalam satu ekosistem.",
  },
  {
    icon: Users,
    label: "BERINTERAKSI",
    title: "Berinteraksi",
    desc: "Kelas, komunitas, MGMP, apresiasi karya, dan umpan balik yang menghubungkan semua pemangku ekosistem.",
  },
  {
    icon: Trophy,
    label: "BERKOMPETISI",
    title: "Berkompetisi",
    desc: "Liga mingguan, papan peringkat, dan simulasi UKBI/TKA yang mengukur perkembangan secara terukur.",
  },
];

export default function AboutEcosystem() {
  return (
    <section id="ekosistem" className="py-16 lg:py-20 bg-zinc-50 scroll-mt-24" aria-labelledby="about-ekosistem-heading">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">Ekosistem</span>
          </div>
          <h2 id="about-ekosistem-heading" className="heading-md text-zinc-900 mb-4">
            Satu ekosistem,{" "}
            <span className="text-primary">lima pilar kegiatan.</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            Belajar tidak berhenti ketika soal selesai — setiap pilar terhubung
            ke langkah berikutnya.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
          {ecosystems.map((e) => {
            const Icon = e.icon;
            return (
              <div
                key={e.label}
                className="p-5 lg:p-6 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-200 card-hover flex flex-col"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-4">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <span className="text-[10px] font-bold tracking-wider text-primary mb-1">{e.label}</span>
                <h3 className="text-base font-bold text-zinc-900 mb-2">{e.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed flex-1">{e.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/arena"
            className="group inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl focus-ring"
          >
            Jelajahi Ekosistem
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}