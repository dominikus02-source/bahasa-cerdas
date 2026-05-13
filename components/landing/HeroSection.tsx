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
              <span className="text-xs font-bold text-white uppercase tracking-wide">Platform Guru #1 di Indonesia</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold leading-tight tracking-tight">
              Platform All-in-One
              <br />
              Guru Bahasa Indonesia:
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-400">
                MGMP + AI + Marketplace
              </span>
            </h1>

            <p className="text-base sm:text-lg text-red-100 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
              Bergabung dengan <strong className="text-white">10.000+ guru</strong> & rasakan AI yang bikin membuat RPP & Soal <strong className="text-white">10x lebih cepat</strong>.
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

            <p className="text-xs text-red-200 mt-2">
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
                    <p className="text-[10px] text-red-200 uppercase tracking-wider">AI Dashboard</p>
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
                  <p className="text-[10px] text-slate-500 font-medium">Guru Aktif</p>
                  <p className="text-sm font-extrabold text-slate-900">10K+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
