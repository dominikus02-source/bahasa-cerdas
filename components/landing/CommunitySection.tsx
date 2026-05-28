import { Users, MessageSquare, Video, Award, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function CommunitySection() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-red-600 via-red-700 to-blue-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <Users className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-medium">Komunitas Terbesar</span>
            </div>

            <h2 className="text-3xl lg:text-5xl font-extrabold leading-tight">
              Komunitas MGMP untuk Guru Bahasa Indonesia
            </h2>

            <p className="text-lg text-red-100 leading-relaxed">
              Bergabung dengan 10.000+ guru dari seluruh Indonesia. Diskusi kurikulum, sharing RPP, webinar rutin, dan mentoring langsung dari ahli bahasa.
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                  <MessageSquare className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Forum Diskusi Regional</h3>
                  <p className="text-red-100 text-sm">Jabodetabek, Jawa, Sumatera, dan lainnya</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                  <Video className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Webinar Mingguan</h3>
                  <p className="text-red-100 text-sm">Dengan praktisi & akademisi</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Bimbingan Personal</h3>
                  <p className="text-red-100 text-sm">Untuk guru pemula</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Sharing RPP</h3>
                  <p className="text-red-100 text-sm">Kurikulum Merdeka</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button className="w-full sm:w-auto bg-white text-red-600 hover:bg-red-50 font-extrabold text-lg px-8 py-7 rounded-2xl shadow-xl transition-all hover:scale-105 group">
                  Gabung Komunitas Gratis
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button className="w-full sm:w-auto bg-white/10 backdrop-blur-md border-2 border-white/40 text-white hover:bg-white/20 font-extrabold text-lg px-8 py-7 rounded-2xl transition-all hover:scale-105">
                Lihat Jadwal Webinar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
              <p className="text-5xl font-extrabold mb-2">500+</p>
              <p className="text-red-100">Diskusi Aktif</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center mt-12">
              <p className="text-5xl font-extrabold mb-2">50+</p>
              <p className="text-red-100">Webinar/Tahun</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
              <p className="text-5xl font-extrabold mb-2">1,200+</p>
              <p className="text-red-100">RPP Dishare</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center mt-12">
              <p className="text-5xl font-extrabold mb-2">95%</p>
              <p className="text-red-100">Member Puas</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
