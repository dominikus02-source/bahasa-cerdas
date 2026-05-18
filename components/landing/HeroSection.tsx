"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, LogIn, Sparkles, Users, Star, BookOpen } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import BatikDecoration from "@/components/shared/BatikDecoration"

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden min-h-[85vh] flex items-center bg-gradient-to-br from-red-600 via-red-700 to-blue-900 text-white">
      <BatikDecoration />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-yellow-400/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-500/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mx-auto lg:mx-0">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wide">Platform Guru Bahasa Indonesia</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold leading-tight tracking-tight">
              Platform Terlengkap
              <br />
              Guru Bahasa Indonesia:
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-400">
                MGMP + AI + Toko Karya
              </span>
            </h1>

<p className="text-base sm:text-lg text-red-100 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
              <strong className="text-white">100+ guru</strong> sudah bergabung minggu ini. Rasakan kemudahan AI membuat RPP & Soal <strong className="text-white">10x lebih cepat</strong>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <Link href="/register" className="w-full sm:w-auto">
                <Button className="w-full bg-white text-red-600 hover:bg-red-50 font-bold text-lg px-8 py-6 rounded-xl shadow-xl shadow-black/20 transition-all hover:scale-105 flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Daftar Gratis
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button className="w-full bg-white/10 backdrop-blur-md border-2 border-white/40 text-white hover:bg-white/20 hover:border-white font-semibold text-lg px-8 py-6 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2">
                  <LogIn className="w-5 h-5" />
                  Masuk
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/10">
                <Users className="w-3.5 h-3.5 text-green-300" />
                <span className="text-xs text-green-200 font-medium">100+ guru minggu ini</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/10">
                <Star className="w-3.5 h-3.5 text-yellow-300" />
                <span className="text-xs text-yellow-200 font-medium">Rating 4.8</span>
              </div>
            </div>

            {/* Google / Microsoft login badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-red-200">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Masuk dengan Google
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-red-200">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="#fff" d="M11.37 2.58c.77-.88 1.8-1.38 2.9-1.34.14 1.1-.34 2.2-1.1 3-.73.77-1.8 1.28-2.84 1.23-.14-1.08.36-2.18 1.04-2.9zm5.78 16.24c.76 1.13.5 2.15.27 2.53-.22.38-.88 1.07-1.8 1.07-.91 0-1.2-.59-2.28-.59s-1.36.57-2.26.57c-.91 0-1.52-.65-1.8-1.07-.87-1.4-1.63-3.69-.73-5.3.45-.8 1.27-1.3 2.16-1.31.68 0 1.32.48 1.73.48s1.2-.6 2.05-.51c.35.02 1.32.14 1.95 1.03-.06.04-1.17.68-1.16 2.03 0 1.62 1.42 2.18 1.43 2.2-.02.06-.22.76-.72 1.5z"/></svg>
                Masuk dengan Apple
              </div>
            </div>

            <p className="text-xs text-red-200 mt-1">
              Belum punya akun? <Link href="/register" className="text-white underline hover:text-yellow-300 font-medium">Daftar Gratis</Link>
            </p>
          </div>

          <div className="relative hidden lg:block">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl relative z-10">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-lg">
                    BC
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">Bahasa Cerdas</p>
                    <p className="text-[10px] text-red-200 uppercase tracking-wider">Dashboard AI</p>
                  </div>
                </div>
                <div className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-[10px] font-bold border border-green-500/30">
                  Online
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-white/90 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-red-600" />
                    <span className="font-bold text-slate-800 text-sm">Generate RPP Merdeka</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full w-4/5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/90 rounded-xl p-3 text-center shadow-lg">
                    <p className="text-2xl font-extrabold text-red-600">10x</p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Lebih Cepat</p>
                  </div>
                  <div className="bg-white/90 rounded-xl p-3 text-center shadow-lg">
                    <p className="text-xl font-extrabold text-blue-600">4.9</p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Rating Guru</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -top-6 -right-6 bg-white rounded-xl p-3 shadow-xl animate-bounce border border-slate-100 z-20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-medium">Bergabung Minggu Ini</p>
                  <p className="text-sm font-extrabold text-slate-900">100+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
