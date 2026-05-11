import { Star, Quote } from "lucide-react"

export default function Testimonials() {
  const testimonials = [
    {
      name: "Dra. Siti Nurhasanah",
      role: "SMA Negeri 1 Jakarta",
      text: "Dulu bikin RPP bisa 4 jam, sekarang dengan AI di Bahasa Cerdas cuma 10 menit! Saya jadi punya waktu lebih buat istirahat.",
      rating: 5,
      stats: { label: "Waktu Hemat", value: "10+ Jam/Minggu" },
      image: "👩‍🏫",
    },
    {
      name: "Ahmad Fauzi, S.Pd",
      role: "Guru & Kontributor",
      text: "Marketplace-nya nyata! Bulan lalu saya upload modul bahasa, hasilnya dapat Rp 1.5 juta pasif income. Sangat membantu.",
      rating: 5,
      stats: { label: "Penghasilan", value: "Rp 1.5 Juta/Bulan" },
      image: "👨‍🏫",
    },
    {
      name: "Budi Santoso",
      role: "SMA Negeri 3 Yogyakarta",
      text: "Latihan UKBI-nya sangat mirip aslinya. Skor saya naik dari 450 ke 620 dalam 2 bulan latihan rutin di sini.",
      rating: 5,
      stats: { label: "Skor UKBI", value: "+170 Poin" },
      image: "👨‍🎓",
    },
  ]

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
            Ribuan guru dari seluruh Indonesia sudah merasakan manfaat Bahasa Cerdas. Ini cerita mereka.
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

              <p className="text-slate-700 leading-relaxed mb-6">"{testimonial.text}"</p>

              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{testimonial.stats.label}</span>
                  <span className="text-lg font-bold text-red-600">{testimonial.stats.value}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center text-2xl">
                  {testimonial.image}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{testimonial.name}</p>
                  <p className="text-sm text-slate-500">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
