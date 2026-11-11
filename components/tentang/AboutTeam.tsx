import Image from "next/image";

type Member = {
  name: string;
  role: string;
  desc: string;
  image?: string;
  initials: string;
};

const coreTeam: Member[] = [
  {
    name: "Dominikus Wahyu Heru Cahyadi",
    role: "Founder & CEO",
    initials: "DW",
    image: "/founders/dominikus.png",
    desc: "Memimpin visi produk, arsitektur platform, pengembangan teknologi, AI, dan arah pertumbuhan BahasaCerdas. Sekaligus pendidik yang memahami pekerjaan guru Bahasa Indonesia dari dalam.",
  },
  {
    name: "Alexander Suryanta",
    role: "Co-Founder & Head of Content",
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
];

const advisors: Member[] = [
  {
    name: "Melany Kusumawati",
    role: "Advisor",
    initials: "MK",
    desc: "Advisor BahasaCerdas.",
  },
  {
    name: "Dr. B. Widharyanto, M.Pd.",
    role: "Advisor",
    initials: "BW",
    desc: "Universitas Sanata Dharma — menelaah validitas akademik materi, kaidah, dan pendekatan pembelajaran Bahasa Indonesia.",
  },
];

function Avatar({ member }: { member: Member }) {
  if (member.image) {
    return (
      <div className="relative mx-auto mb-4 h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-lg">
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
      className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full border-4 border-white text-2xl font-bold text-white shadow-lg"
      style={{ backgroundImage: "var(--bc-grad-brand)" }}
      aria-hidden="true"
    >
      {member.initials}
    </div>
  );
}

function MemberCard({ member }: { member: Member }) {
  return (
    <div className="card-hover rounded-2xl border border-zinc-100 bg-white p-6 text-center lg:p-8">
      <Avatar member={member} />
      <h3 className="text-lg font-bold text-zinc-900">{member.name}</h3>
      <p className="mb-3 text-sm font-semibold text-primary">{member.role}</p>
      <p className="text-sm leading-relaxed text-zinc-500">{member.desc}</p>
    </div>
  );
}

export default function AboutTeam() {
  return (
    <section id="tim" className="scroll-mt-24 bg-zinc-50 py-16 lg:py-20" aria-labelledby="about-tim-heading">
      <div className="section-container">
        <div className="mx-auto mb-12 max-w-3xl text-center lg:mb-16">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary-light px-4 py-1.5">
            <span className="text-xs font-semibold text-primary">Tim</span>
          </div>
          <h2 id="about-tim-heading" className="heading-md mb-4 text-zinc-900">
            Siapa di balik <span className="text-primary">BahasaCerdas</span>
          </h2>
          <p className="text-base leading-relaxed text-zinc-500 lg:text-lg">
            Pendiri dan advisor yang menopang produk dan mutu
            pembelajaran Bahasa Indonesia.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
          {coreTeam.map((m) => (
            <MemberCard key={m.name} member={m} />
          ))}
        </div>

        <div id="advisor" className="mx-auto mt-14 max-w-5xl scroll-mt-24 lg:mt-16">
          <div className="mb-8 text-center">
            <h3 className="text-xl font-bold text-zinc-900 lg:text-2xl">
              Advisor
            </h3>
          </div>
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
            {advisors.map((m) => (
              <MemberCard key={m.name} member={m} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
