import { GraduationCap, Lightbulb, BookOpen, Users, Newspaper } from "lucide-react";

const whyTeam = [
  {
    icon: GraduationCap,
    title: "Pengalaman Pendidikan",
    desc: "Dimulai dari ruang kelas — pemahaman praktik mengajar Bahasa Indonesia sehari-hari, bukan sekadar teori.",
  },
  {
    icon: Lightbulb,
    title: "Teknologi",
    desc: "Fondasi produk dan AI dibangun dengan prinsip yang membantu, bukan menggantikan, peran guru.",
  },
  {
    icon: BookOpen,
    title: "Konten",
    desc: "Pengalaman panjang dalam pengajaran, penulisan buku teks, dan pengembangan materi pembelajaran.",
  },
  {
    icon: Users,
    title: "Komunitas",
    desc: "Keterhubungan langsung dengan guru, MGMP, dan komunitas Bahasa Indonesia di berbagai daerah.",
  },
  {
    icon: Newspaper,
    title: "Akademik",
    desc: "Validasi dari dunia akademik dan kepemimpinan sekolah memastikan arah tetap berpijak pada praktik.",
  },
];

export default function AboutWhyTeam() {
  return (
    <section className="py-16 lg:py-20 bg-white" aria-labelledby="about-mengapa-tim">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">Mengapa Tim Ini</span>
          </div>
          <h2 id="about-mengapa-tim" className="heading-md text-zinc-900 mb-4">
            Ekosistem dibangun oleh{" "}
            <span className="text-primary">perpaduan keahlian.</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            Pendidikan, teknologi, konten, komunitas, dan akademik — kelima
            unsur ini hadir dalam tim di balik BahasaCerdas.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
          {whyTeam.map((w) => {
            const Icon = w.icon;
            return (
              <div
                key={w.title}
                className="p-5 lg:p-6 rounded-2xl bg-zinc-50 border border-zinc-100 card-hover"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-4">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 mb-2">{w.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{w.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}