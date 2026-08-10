import Image from "next/image";
import { GraduationCap, Landmark } from "lucide-react";

const founders = [
  {
    name: "Dominikus Wahyu",
    role: "Founder & CEO",
    image: "/founders/dominikus.png",
    desc: "Memimpin visi produk, arsitektur platform, pengembangan teknologi, AI, dan arah pertumbuhan BahasaCerdas. Sekaligus pendidik yang memahami pekerjaan guru Bahasa Indonesia dari dalam.",
    tag: "Pendidikan · Teknologi · Produk",
  },
  {
    name: "Alexander Suryanta",
    role: "Co-Founder & Head of Content",
    image: "/founders/alexander.jpg",
    desc: "Menguatkan fondasi konten dan pedagogi BahasaCerdas melalui pengalaman panjang dalam pengajaran Bahasa Indonesia, penulisan buku teks, dan pengembangan materi pembelajaran.",
    tag: "Konten · Buku Teks · Pedagogi",
  },
  {
    name: "Washadi, S.Pd., M.M.",
    role: "Co-Founder & Head of Community",
    image: "/founders/washadi.png",
    desc: "Menghubungkan BahasaCerdas dengan kebutuhan nyata guru dan komunitas Bahasa Indonesia melalui pengalaman sebagai pendidik, penggerak MGMP, dan pengembang jejaring komunitas.",
    tag: "Komunitas · MGMP · Pendidik",
  },
];

const advisors = [
  {
    initial: "MG",
    name: "Melany Kusumawati Gigir, S.Pd., M.S.",
    role: "Dewan Penasihat",
    desc: "Praktisi Pendidikan — memberikan perspektif praktik pendidikan terhadap arah dan penggunaan BahasaCerdas di lapangan.",
  },
  {
    initial: "BW",
    name: "Dr. B. Widharyanto, M.Pd.",
    role: "Validator Akademik",
    desc: "Universitas Sanata Dharma — menelaah validitas akademik materi, kaidah, dan pendekatan pembelajaran Bahasa Indonesia.",
  },
];

export default function AboutTeam() {
  return (
    <section id="tim" className="py-16 lg:py-20 bg-zinc-50 scroll-mt-24" aria-labelledby="about-tim-heading">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">Tim Pendiri</span>
          </div>
          <h2 id="about-tim-heading" className="heading-md text-zinc-900 mb-4">
            Siapa di balik <span className="text-primary">BahasaCerdas</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            Tiga pendiri dengan perpaduan pengalaman pendidikan, teknologi,
            konten, dan komunitas guru.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto mb-16">
          {founders.map((f) => (
            <div key={f.name} className="text-center p-6 lg:p-8 rounded-2xl bg-white border border-zinc-100 card-hover">
              <div className="relative w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <Image
                  src={f.image}
                  alt={f.name}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">{f.name}</h3>
              <p className="text-sm font-semibold text-primary mb-3">{f.role}</p>
              <p className="text-sm text-zinc-500 leading-relaxed mb-4">{f.desc}</p>
              <span className="inline-block text-[11px] font-semibold text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full">
                {f.tag}
              </span>
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-xl lg:text-2xl font-bold text-zinc-900 mb-2">
              Dewan Penasihat & Validasi Akademik
            </h3>
            <p className="text-sm text-zinc-500">
              Kepemimpinan sekolah dan dunia akademik ikut memastikan arah
              BahasaCerdas tetap berpijak pada praktik.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {advisors.map((a) => (
              <div key={a.name} className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-zinc-100 card-hover">
                <div className="w-14 h-14 shrink-0 rounded-full bg-primary-light text-primary flex items-center justify-center">
                  <span className="text-sm font-bold">{a.initial}</span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-zinc-900">{a.name}</h4>
                  <p className="text-sm font-semibold text-primary mb-2">{a.role}</p>
                  <p className="text-sm text-zinc-500 leading-relaxed">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-8 text-xs text-zinc-400">
            <GraduationCap size={14} aria-hidden="true" />
            <span>Dunia akademik</span>
            <Landmark size={14} aria-hidden="true" />
            <span>Sekolah & komunitas</span>
          </div>
        </div>
      </div>
    </section>
  );
}