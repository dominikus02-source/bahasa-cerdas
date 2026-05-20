import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight } from "lucide-react"
import Link from "next/link"
import BatikDecoration from "@/components/shared/BatikDecoration"

export default function FinalCTA() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-slate-900 via-blue-900 to-red-900 text-white relative overflow-hidden">
      <BatikDecoration />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-8">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span className="text-sm font-medium">Siap Mengubah Cara Mengajar Anda?</span>
        </div>

        <h2 className="text-3xl lg:text-6xl font-extrabold mb-6 leading-tight">
          Bergabung dengan Ribuan Guru yang Sudah Lebih Produktif
        </h2>

        <p className="text-xl text-slate-300 mb-10 leading-relaxed">
          Mulai perjalanan mengajar Anda hari ini. Hemat waktu, tingkatkan kualitas, dan raih karir yang lebih baik bersama Bahasa Cerdas.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link href="/register">
            <Button className="w-full sm:w-auto bg-white text-red-600 hover:bg-slate-100 font-extrabold text-lg px-8 py-7 rounded-2xl shadow-xl transition-all hover:scale-105 group">
              Mulai Sekarang
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/login">
            <Button className="w-full sm:w-auto bg-white/10 backdrop-blur-md border-2 border-white/40 text-white hover:bg-white/20 font-extrabold text-lg px-8 py-7 rounded-2xl shadow-xl transition-all hover:scale-105">
              Masuk
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">✓</div>
            <span>Gratis 14 Hari</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">✓</div>
            <span>Tanpa Kartu Kredit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">✓</div>
            <span>Garansi 7 Hari</span>
          </div>
        </div>

        <p className="mt-8 text-sm text-slate-400">
          Ada pertanyaan? Hubungi kami di <a href="mailto:halo@bahasacerdas.com" className="text-white hover:underline">halo@bahasacerdas.com</a>
        </p>
      </div>
    </section>
  )
}
