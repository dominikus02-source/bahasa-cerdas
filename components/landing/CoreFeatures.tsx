import { Brain, BookOpen, Users, Award, ShoppingBag, TrendingUp } from "lucide-react"

export default function CoreFeatures() {
  const features = [
    {
      icon: Brain,
      title: "Alat AI Super",
      description: "Generator RPP, Korektor EYD, Soal HOTS otomatis. Hemat 10+ jam per minggu.",
      color: "from-red-500 to-pink-600",
      bgColor: "bg-red-50",
      iconColor: "text-red-500",
    },
    {
      icon: BookOpen,
      title: "Kurikulum Merdeka",
      description: "RPP, ATP, Modul siap pakai. Update sesuai kebijakan terbaru Kemendikbud.",
      color: "from-blue-500 to-cyan-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      icon: Users,
      title: "Komunitas MGMP",
      description: "Diskusi regional, webinar rutin, mentoring langsung dari ahli bahasa.",
      color: "from-purple-500 to-violet-600",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-500",
    },
    {
      icon: Award,
      title: "Sertifikasi & Karir",
      description: "Sertifikat UKBI, lencana guru pro, portofolio digital untuk kenaikan pangkat.",
      color: "from-yellow-500 to-orange-600",
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-500",
    },
    {
      icon: ShoppingBag,
      title: "Toko Karya",
      description: "Jual RPP, modul, video. Dapatkan royalti hingga 90% untuk setiap penjualan.",
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-50",
      iconColor: "text-green-500",
    },
    {
      icon: TrendingUp,
      title: "Analitik Kelas",
      description: "Tracking progres siswa, rapor otomatis, insight performa pembelajaran.",
      color: "from-pink-500 to-rose-600",
      bgColor: "bg-pink-50",
      iconColor: "text-pink-500",
    },
  ]

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-b from-white to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl lg:text-5xl font-extrabold text-slate-900 mb-6">
            Mengapa Guru Memilih{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">
              Bahasa Cerdas
            </span>
            ?
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            Platform lengkap yang menggabungkan teknologi AI dengan kekayaan budaya Indonesia untuk mengajar Bahasa Indonesia lebih modern dan efektif.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-100">
              <div className={`w-16 h-16 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-8 h-8 ${feature.iconColor}`} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
