"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Crown, ShieldCheck } from "lucide-react"
import Link from "next/link"
import BatikDecoration from "@/components/shared/BatikDecoration"

export default function PricingTable() {
  const [isYearly, setIsYearly] = useState(true)

  return (
    <section className="py-20 lg:py-32 bg-slate-50 relative overflow-hidden" id="pricing">
      <BatikDecoration />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl lg:text-5xl font-extrabold text-slate-900 mb-6">
            Investasi Terbaik untuk{" "}
            <span className="text-red-600">Karir Guru</span>
          </h2>
          <p className="text-lg text-slate-600 mb-8">Pilih paket yang sesuai. Upgrade atau downgrade kapan saja.</p>

          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm font-bold ${!isYearly ? "text-slate-900" : "text-slate-500"}`}>Bulanan</span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-14 h-8 bg-red-600 rounded-full transition-colors focus:outline-none"
            >
              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${isYearly ? "translate-x-6" : "translate-x-0"}`} />
            </button>
            <span className={`text-sm font-bold ${isYearly ? "text-slate-900" : "text-slate-500"}`}>
              Tahunan{" "}
              <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded-full text-xs ml-1">HEMAT 32%</span>
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
          <Card className="border-2 border-slate-200 rounded-2xl hover:border-slate-300 transition-all">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold text-slate-900">Gratis</h3>
              <p className="text-slate-500 text-sm mt-2 mb-6">Untuk pemula yang baru bergabung</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-extrabold text-slate-900">Rp 0</span>
                <span className="text-slate-500">/selamanya</span>
              </div>
              <ul className="space-y-4 mb-8">
                {["Akses Komunitas (Baca)", "3 RPP/bulan", "Soal HOTS Terbatas", "Tanpa Download"].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <Check className="w-5 h-5 text-slate-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block">
                <Button variant="outline" className="w-full py-6 rounded-xl font-bold border-slate-300 text-slate-700 hover:bg-slate-50">
                  Mulai Gratis
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-600 rounded-2xl shadow-2xl relative scale-105 z-10 bg-white">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-red-600 to-orange-600 text-white border-0 px-4 py-1.5 text-sm font-bold shadow-lg">
                <Crown className="w-4 h-4 mr-1" />
                PALING POPULER
              </Badge>
            </div>
            <CardContent className="p-8">
              <h3 className="text-xl font-bold text-slate-900">Premium Tahunan</h3>
              <p className="text-slate-500 text-sm mt-2 mb-6">Akses penuh & hemat banyak</p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-extrabold text-red-600">Rp 399rb</span>
                <span className="text-slate-500">/tahun</span>
              </div>
              <p className="text-xs text-slate-400 line-through mb-6">Normal: Rp 588.000</p>

              <ul className="space-y-4 mb-8">
                {[
                  "AI Generator Tanpa Batas",
                  "Download RPP & Video (1080p)",
                  "Akses Penuh Komunitas + Webinar",
                  "Upload & Jual Karya di Toko Karya",
                  "Sertifikat Digital UKBI",
                  "Dukungan Prioritas",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-800">
                    <Check className="w-5 h-5 text-red-600 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/register?plan=yearly" className="block">
                <Button className="w-full py-6 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30">
                  Langganan Sekarang
                </Button>
              </Link>
              <p className="text-center text-xs text-slate-500 mt-4 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Garansi 7 Hari Uang Kembali
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200 rounded-2xl hover:border-slate-300 transition-all">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold text-slate-900">Premium Bulanan</h3>
              <p className="text-slate-500 text-sm mt-2 mb-6">Fleksibel tanpa komitmen panjang</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-extrabold text-slate-900">Rp 49rb</span>
                <span className="text-slate-500">/bulan</span>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  "Semua Fitur Premium",
                  "Batal Kapan Saja",
                  "Cocok untuk Masa Percobaan",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <Check className="w-5 h-5 text-slate-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/register?plan=monthly" className="block">
                <Button variant="outline" className="w-full py-6 rounded-xl font-bold border-slate-300 text-slate-700 hover:bg-slate-50">
                  Coba 30 Hari Gratis
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
