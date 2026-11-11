import Image from "next/image";

type Member = {
  name: string;
  role: string;
  desc: string;
  image?: string;
  initials: string;
};

const team: Member[] = [
  {
    name: "Dominikus Wahyu Heru Cahyadi",
    role: "Founder & CEO (Direktur)",
    initials: "DW",
    image: "/founders/dominikus.png",
    desc: "Memimpin visi produk, arsitektur platform, pengembangan teknologi, AI, dan arah pertumbuhan BahasaCerdas. Sekaligus pendidik yang memahami pekerjaan guru Bahasa Indonesia dari dalam.",
  },
  {
    name: "Melany Kusumawati",
    role: "Komisaris Utama",
    initials: "MK",
    desc: "Komisaris Utama PT Bahasa Cerdas Indonesia.",
  },
  {
    name: "Alexander Suryanta",
    role: "Co-Founder, Komisaris & Head of Content",
    initials: "AS",
    image: "/founders/alexander.jpg",
    desc: "Menguatkan fondasi konten dan pedagogi BahasaCerdas melalui pengalaman panjang dalam pengajaran Bahasa Indonesia, penulisan buku teks, dan pengembangan materi pembelajaran.",
  },
  {
    name: "Sugeng Riyanto",
    role: "Co-Founder & CTO",
    initials: "SR",
    desc: "Co-Founder dan Chief Technology Officer BahasaCerdas.",
  },
  {
    name: "Soleh Ahmad Nugraha",
    role: "Co-Founder & CBO",
    initials: "SA",
    desc: "Co-Founder dan Chief Business Officer BahasaCerdas.",
  },
  {
    name: "Dr. B. Widharyanto, M.Pd.",
    role: "Validator Akademik",
    initials: "BW",
    desc: "Universitas Sanata Dharma — menelaah validitas akademik materi, kaidah, dan pendekatan pembelajaran Bahasa Indonesia.",
  },
];

function Avatar({ member }: { member: Member }) {
  if (member.image) {
    return (
      <div className="relative w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-lg">
        <Image
          src={member.image}
          alt={member.name}
          fill
          className="object-cover"
          sizes="112px"
        />
      </div>
    );
  }
  return (
    <div
      className="w-28 h-28 mx-auto mb-4 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white text-2xl font-bold"
      style={{ backgroundImage: "var(--bc-grad-brand)" }}
      aria-hidden="true"
    >
      {member.initials}
    </div>
  );
}

export default function AboutTeam() {
  return (
    <section id="tim" className="py-16 lg:py-20 bg-zinc-50 scroll-mt-24" aria-labelledby="about-tim-heading">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">Tim</span>
          </div>
          <h2 id="about-tim-heading" className="heading-md text-zinc-900 mb-4">
            Siapa di balik <span className="text-primary">BahasaCerdas</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            Pendiri, pengurus, dan validator akademik yang menopang produk,
            tata kelola, dan mutu pembelajaran Bahasa Indonesia.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {team.map((m) => (
            <div key={m.name} className="text-center p-6 lg:p-8 rounded-2xl bg-white border border-zinc-100 card-hover">
              <Avatar member={m} />
              <h3 className="text-lg font-bold text-zinc-900">{m.name}</h3>
              <p className="text-sm font-semibold text-primary mb-3">{m.role}</p>
              <p className="text-sm text-zinc-500 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
