import { Brain, FileText, Sparkles, CheckCircle2, Zap, Target } from "lucide-react"

export default function AIFeatures() {
  const features = [
    {
      icon: FileText,
      title: "Generator RPP Otomatis",
      description: "Buat RPP Kurikulum Merdeka dalam 30 detik. AI menganalisis kompetensi, tujuan pembelajaran, dan menghasilkan RPP lengkap dengan ATP & Modul Ajar.",
      gradient: "from-red-500 to-pink-600",
      features: ["Template Kurikulum Merdeka", "Auto-generate ATP", "Integrasi Profil Pelajar Pancasila", "Export ke Word/PDF"],
    },
    {
      icon: Brain,
      title: "Korektor EYD & Tata Bahasa",
      description: "Koreksi otomatis EYD, PUEBI, dan tata bahasa Indonesia. Dapatkan saran perbaikan real-time untuk dokumen akademik Anda.",
      gradient: "from-blue-500 to-cyan-600",
      features: ["Koreksi EYD V", "Pemeriksaan PUEBI", "Saran Kalimat Efektif", "Deteksi Plagiasi"],
    },
    {
      icon: Zap,
      title: "Pembuat Soal HOTS",
      description: "Generate soal Higher Order Thinking Skills (HOTS) otomatis untuk berbagai level kognitif. Lengkap dengan kunci jawaban & pembahasan.",
      gradient: "from-yellow-500 to-orange-600",
      features: ["Soal Pilihan Ganda & Essay", "Level Kognitif C1-C6", "Pembahasan Otomatis", "Bank Soal 1000+"],
    },
    {
      icon: Target,
      title: "Penilaian Otomatis",
      description: "Sistem penilaian otomatis untuk tugas & ujian. AI menganalisis jawaban siswa dan memberikan nilai objektif dengan rubrik yang sesuai.",
      gradient: "from-purple-500 to-violet-600",
      features: ["Auto-grading Essay", "Rubrik Penilaian", "Analisis Butir Soal", "Rapor Otomatis"],
    },
    {
      icon: Sparkles,
      title: "Ringkasan Teks & Sastra",
      description: "Ringkas teks panjang, analisis unsur intrinsik sastra, dan identifikasi gaya bahasa secara otomatis dengan AI canggih.",
      gradient: "from-green-500 to-emerald-600",
      features: ["Auto-summarization", "Analisis Puisi & Cerpen", "Deteksi Majas", "Struktur Teks"],
    },
    {
      icon: CheckCircle2,
      title: "Feedback Personal Siswa",
      description: "Berikan feedback otomatis dan personal untuk setiap siswa berdasarkan performa mereka. Tingkatkan motivasi & hasil belajar.",
      gradient: "from-pink-500 to-rose-600",
      features: ["Analisis Individual", "Saran Perbaikan", "Tracking Progress", "Laporan Orang Tua"],
    },
  ]

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-b from-red-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4" />
            Teknologi AI Canggih
          </div>

          <h2 className="text-3xl lg:text-5xl font-extrabold text-slate-900 mb-6">
            AI Tools untuk Mengajar Lebih{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-600">
              Efisien & Efektif
            </span>
          </h2>

          <p className="text-lg text-slate-600 leading-relaxed">
            Hemat puluhan jam setiap minggu dengan AI yang dirancang khusus untuk guru Bahasa Indonesia. Dari RPP hingga penilaian, semua otomatis.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-100 overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

              <div className="relative z-10">
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed mb-6">{feature.description}</p>

                <ul className="space-y-2">
                  {feature.features.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl text-white shadow-xl">
            <Brain className="w-6 h-6" />
            <span className="font-bold text-lg">50+ AI Tools Tersedia</span>
          </div>
          <p className="text-slate-500 mt-4">Dan masih banyak lagi yang terus dikembangkan!</p>
        </div>
      </div>
    </section>
  )
}
