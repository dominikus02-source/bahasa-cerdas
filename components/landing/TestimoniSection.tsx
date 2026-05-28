import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Ibu Siti Rahmawati",
    role: "Guru Bahasa Indonesia, SMPN 1 Bandung",
    avatar: "SR",
    color: "bg-red-50 text-primary",
    content:
      "BahasaCerdas benar-benar merevolusi cara saya mengajar. AI RPP-nya sangat akurat dan sesuai Kurikulum Merdeka. Saya bisa hemat waktu 10x lipat!",
    rating: 5,
  },
  {
    name: "Bapak Ahmad Fauzi",
    role: "Guru Bahasa Indonesia, SMAN 5 Surabaya",
    avatar: "AF",
    color: "bg-amber-50 text-amber-600",
    content:
      "Toko Karya di BahasaCerdas membantu saya mendapatkan penghasilan tambahan. Modul ajar yang saya jual sudah dibeli 200+ guru. Luar biasa!",
    rating: 5,
  },
  {
    name: "Ibu Dewi Lestari",
    role: "Guru Bahasa Indonesia, SMPN 3 Yogyakarta",
    avatar: "DL",
    color: "bg-emerald-50 text-emerald-600",
    content:
      "Fitur kuis multiplayer-nya sangat efektif. Siswa jadi lebih antusias belajar Bahasa Indonesia. Nilai mereka meningkat signifikan!",
    rating: 5,
  },
  {
    name: "Bapak Rudi Hartono",
    role: "Guru Bahasa Indonesia, MAN 1 Medan",
    avatar: "RH",
    color: "bg-violet-50 text-violet-600",
    content:
      "Generator soal HOTS-nya sangat membantu persiapan asesmen. Soal yang dihasilkan bervariasi dan sesuai level kognitif siswa.",
    rating: 4,
  },
  {
    name: "Ibu Nina Kurniawati",
    role: "Guru Bahasa Indonesia, SMPK 1 BPK Penabur",
    avatar: "NK",
    color: "bg-blue-50 text-blue-600",
    content:
      "Komunitas MGMP di BahasaCerdas sangat aktif. Saya bisa sharing, diskusi, dan belajar dari guru-guru hebat di seluruh Indonesia.",
    rating: 5,
  },
  {
    name: "Bapak Hendra Gunawan",
    role: "Guru Bahasa Indonesia, SMKN 2 Semarang",
    avatar: "HG",
    color: "bg-cyan-50 text-cyan-600",
    content:
      "Fitur koreksi EYD otomatis sangat membantu. Tidak perlu lagi repot-repot memeriksa tulisan siswa satu per satu. Recommended!",
    rating: 5,
  },
];

export default function TestimoniSection() {
  return (
    <section className="relative py-20 lg:py-28 bg-white overflow-hidden">
      {/* Batik Decor */}
      <div
        className="absolute right-0 top-0 w-[350px] h-[350px] opacity-[0.02] pointer-events-none"
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
              Testimoni
            </span>
          </div>
          <h2 className="heading-lg text-zinc-900 mb-5">
            Apa Kata{" "}
            <span className="text-primary">Guru tentang Kami</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            Ribuan guru telah merasakan manfaat BahasaCerdas. Inilah cerita mereka.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="relative p-6 lg:p-8 rounded-2xl bg-zinc-50/80 border border-zinc-100 hover:border-zinc-200 transition-all duration-300"
            >
              {/* Quote Icon */}
              <Quote size={24} className="text-zinc-200 mb-4" />

              {/* Content */}
              <p className="text-sm lg:text-base text-zinc-600 leading-relaxed mb-6">
                &ldquo;{t.content}&rdquo;
              </p>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i < t.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-zinc-200"
                    }
                  />
                ))}
              </div>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${t.color} flex items-center justify-center text-sm font-bold shrink-0`}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {t.name}
                  </p>
                  <p className="text-xs text-zinc-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Overall Rating */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-zinc-50 border border-zinc-100">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className="fill-amber-400 text-amber-400"
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-zinc-700">
              4.8 dari 5 — 1.247 ulasan
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
