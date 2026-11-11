import { Building2, Copyright, FileText, Landmark, ListChecks, Mail, Users } from "lucide-react";

const legalCards = [
  {
    icon: Building2,
    title: "Badan Usaha",
    lines: [
      "PT Bahasa Cerdas Indonesia",
      "Kedudukan: Jakarta Selatan, DKI Jakarta",
      "CFX Tower, Jl. Gatot Subroto No. Kav. 35-36, Kel. Kuningan Timur, Kec. Setiabudi, Kota Jakarta Selatan 12950",
      "NIB 0911260094193 tanggal 9 November 2026 (usaha mikro)",
    ],
  },
  {
    icon: Landmark,
    title: "Akta & Pengesahan",
    lines: [
      "Akta Pendirian No. 27 tanggal 5 November 2026",
      "Notaris Siti Aminah, S.H., M.Kn., Kabupaten Purwakarta",
      "SK Kemenkumham AHU-0089503.AH.01.01.TAHUN 2026 tanggal 7 November 2026",
    ],
  },
  {
    icon: Users,
    title: "Pengurus",
    lines: [
      "Direktur: Dominikus Wahyu Heru Cahyadi",
      "Komisaris Utama: Melany Kusumawati",
      "Komisaris: Alexander Suryanta",
    ],
  },
  {
    icon: ListChecks,
    title: "Kegiatan Usaha (KBLI)",
    lines: [
      "Pendidikan dan jasa tutor (85610, 85699, 85593, 85599)",
      "Perangkat lunak, pemrograman, dan kecerdasan buatan (62194, 62199, 62209)",
      "Penerbitan dan perdagangan terbitan (58110, 58190, 46452)",
      "Distribusi konten (60390), konvensi dan pameran (82300), serta konsultasi manajemen dan bisnis (70209)",
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
      "Pemegang Hak Cipta: PT Bahasa Cerdas Indonesia",
      "Pertama kali diumumkan: 3 Maret 2026",
      "Tempat: Kabupaten Tangerang · Status: Tercatat",
    ],
  },
];

export default function AboutLegal() {
  return (
    <section
      id="legalitas"
      className="py-16 lg:py-20 bg-white scroll-mt-24"
      aria-labelledby="about-legal-heading"
    >
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">Legalitas & Transparansi</span>
          </div>
          <h2 id="about-legal-heading" className="heading-md text-zinc-900 mb-4">
            Dikelola secara <span className="text-primary">terbuka dan tercatat.</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            BahasaCerdas dikembangkan oleh PT Bahasa Cerdas Indonesia, badan
            hukum yang sah, dengan pencatatan kekayaan intelektual atas platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-5xl mx-auto mb-10">
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
                    <li key={line} className="flex min-w-0 items-start gap-2 break-words text-sm leading-relaxed text-zinc-600">
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
            className="mt-4 inline-flex max-w-full min-w-0 items-center gap-2 break-all px-3 py-2 text-sm font-semibold text-primary transition-colors hover:text-primary-dark focus-ring rounded-lg"
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
