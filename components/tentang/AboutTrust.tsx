import { ShieldCheck, EyeOff, Scale, Handshake } from "lucide-react";

const trustPoints = [
  {
    icon: EyeOff,
    title: "Kunci Jawaban Dikunci Server",
    desc: "Sistem mencegah kebocoran jawaban: soal dikirim tanpa kunci, validasi dilakukan di server.",
  },
  {
    icon: ShieldCheck,
    title: "Dokumen Keahlian yang Jujur",
    desc: "Hasil latihan disajikan sebagai dokumen perkembangan — bukan klaim sertifikat resmi UKBI/TKA.",
  },
  {
    icon: Scale,
    title: "Legalitas Terbuka",
    desc: "Badan usaha, NIB, dan pencatatan hak cipta dipublikasikan secara transparan di halaman ini.",
  },
  {
    icon: Handshake,
    title: "Prinsip Kemitraan yang Jelas",
    desc: "Komisi bagi hasil, syarat, dan ketentuan marketplace dan kemitraan ditampilkan terbuka.",
  },
];

export default function AboutTrust() {
  return (
    <section className="py-16 lg:py-20 bg-zinc-50" aria-labelledby="about-trust-heading">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">Kepercayaan</span>
          </div>
          <h2 id="about-trust-heading" className="heading-md text-zinc-900 mb-4">
            Prinsip yang <span className="text-primary">kami pegang.</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            Setiap keputusan produk mempertimbangkan kepercayaan guru, murid,
            sekolah, dan komunitas.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {trustPoints.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.title}
                className="p-6 lg:p-8 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-200 card-hover"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-4">
                  <Icon size={24} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 mb-2">{t.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{t.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}