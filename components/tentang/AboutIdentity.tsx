import { GraduationCap, PenTool, Building2 } from "lucide-react";

const pillars = [
  {
    icon: GraduationCap,
    title: "Untuk Guru",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    desc: "Ruang mengajar yang membantu menyiapkan materi, soal, penilaian, dan presentasi lebih cepat — tanpa kehilangan kualitas pedagogis.",
  },
  {
    icon: PenTool,
    title: "Untuk Murid",
    color: "bg-violet-50 text-violet-600 border-violet-100",
    desc: "Perjalanan belajar yang aktif: membaca, menulis, berkarya, dan bermain sambil bertumbuh dalam literasi Bahasa Indonesia.",
  },
  {
    icon: Building2,
    title: "Untuk Sekolah & Ekosistem",
    color: "bg-amber-50 text-amber-600 border-amber-100",
    desc: "Materi, penugasan, penilaian, dan komunitas yang saling terhubung — dari ruang kelas hingga MGMP dan sekolah.",
  },
];

export default function AboutIdentity() {
  return (
    <section className="py-16 lg:py-20 bg-white" aria-labelledby="about-siapa-kami">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">Siapa Kami</span>
          </div>
          <h2 id="about-siapa-kami" className="heading-md text-zinc-900 mb-4">
            Lebih dari platform belajar.{" "}
            <span className="text-primary">Kami adalah ekosistem.</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            BahasaCerdas menghubungkan cara guru mengajar, cara murid belajar,
            dan cara komunitas bertumbuh — dalam satu tempat yang dirancang
            untuk Bahasa Indonesia.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="p-6 lg:p-8 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-200 card-hover"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-4 ${p.color}`}
                >
                  <Icon size={24} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 mb-2">{p.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}