import { Star, Quote } from "lucide-react"

const initials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()

const colors = [
  "from-red-500 to-pink-600",
  "from-blue-600 to-indigo-600",
  "from-emerald-500 to-teal-600",
]

const testimonials = [
  {
    name: "Dra. Siti Nurhasanah",
    school: "SMA Negeri 1 Jakarta",
    role: "Guru Bahasa Indonesia",
    text: "Dulu bikin RPP bisa 4 jam, sekarang dengan AI di Bahasa Cerdas cuma 10 menit! Saya jadi punya waktu lebih buat istirahat dan koreksi tugas siswa.",
    rating: 5,
    stats: { label: "Waktu Hemat", value: "10+ Jam/Minggu" },
    initial: "SN",
  },
  {
    name: "Ahmad Fauzi, S.Pd",
    school: "SMP Negeri 2 Bandung",
    role: "Guru & Kontributor",
    text: "Toko Karya-nya nyata! Bulan lalu saya upload modul bahasa, hasilnya dapat Rp 1.5 juta pasif income. Sangat membantu penghasilan tambahan.",
    rating: 5,
    stats: { label: "Penghasilan", value: "Rp 1,5 Juta/Bulan" },
    initial: "AF",
  },
  {
    name: "Budi Santoso",
    school: "SMA Negeri 3 Yogyakarta",
    role: "Kepala Program Bahasa",
    text: "Latihan UKBI-nya sangat mirip aslinya. Skor saya naik dari 450 ke 620 dalam 2 bulan latihan rutin di sini. Sangat recommended!",
    rating: 5,
    stats: { label: "Skor UKBI", value: "+170 Poin" },
    initial: "BS",
  },
]

export default function Testimonials() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-b from-white to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold mb-6">
            <Quote className="w-4 h-4" />
            Testimoni Guru
          </div>

          <h2 className="text-3xl lg:text-5xl font-extrabold text-slate-900 mb-6">
            Apa Kata Mereka yang{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-600">Bergabung?</span>
          </h2>

          <p className="text-lg text-slate-600 leading-relaxed">
            Guru dari berbagai sekolah sudah merasakan manfaat Bahasa Cerdas. Ini cerita mereka.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-100 relative">
              <div className="absolute top-6 right-6 text-red-200">
                <Quote className="w-8 h-8" />
              </div>

              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>

              <p className="text-slate-700 leading-relaxed mb-6">&ldquo;{testimonial.text}&rdquo;</p>

              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{testimonial.stats.label}</span>
                  <span className="text-lg font-bold text-red-600">{testimonial.stats.value}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${colors[index]} rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0`}>
                  {testimonial.initial}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{testimonial.name}</p>
                  <p className="text-xs text-slate-500 truncate">{testimonial.school}</p>
                  <p className="text-[11px] text-slate-400">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
