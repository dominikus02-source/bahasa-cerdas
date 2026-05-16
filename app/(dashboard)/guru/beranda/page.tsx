"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  BookOpen, ShoppingBag, Users, Gamepad2, Wand2,
  TrendingUp, ChevronRight, Star,
  FileText, Video, Presentation, Database,
  Crown, Zap, Flame, FileUp, Upload
} from "lucide-react"
import { useUserStore } from "@/store"

function formatRp(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
}

export default function GuruBerandaPage() {
  const user = useUserStore()
  const [stats, setStats] = useState<any>({
    totalKarya: 0, totalSiswa: 0, totalKuis: 0, totalTerjual: 0,
    terjualBulanIni: 0, saldo: 0, aiUsage: { rpp: 0, soal: 0 },
  })

  useEffect(() => {
    fetch("/api/guru/dashboard").then(r => r.json()).then(d => {
      if (d.totalKarya !== undefined) setStats(d)
    }).catch(() => {})
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 11) return "Selamat pagi"
    if (h < 15) return "Selamat siang"
    if (h < 18) return "Selamat sore"
    return "Selamat malam"
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm text-gray-400">{greeting()},</p>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            {user.fullName}
            {user.isFounder && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                <Crown size={10} /> Founder
              </span>
            )}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Dashboard Guru - BahasaCerdas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/guru/rpp-modul" className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
            <Wand2 size={16} /> Buat RPP
          </Link>
          <Link href="/guru/toko-karya" className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
            <ShoppingBag size={16} /> Upload Karya
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
              <ShoppingBag size={22} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalKarya}</p>
              <p className="text-sm text-gray-500">Total Karya</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-emerald-600 font-medium">+{stats.terjualBulanIni} terjual bulan ini</div>
        </div>

        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-md">
              <Gamepad2 size={22} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalKuis}</p>
              <p className="text-sm text-gray-500">Kuis Aktif</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-violet-600 font-medium">Game multiplayer</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center shadow-md">
              <Users size={22} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSiswa}</p>
              <p className="text-sm text-gray-500">Total Siswa</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-blue-600 font-medium">Terdaftar di kelas</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-md">
              <TrendingUp size={22} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatRp(stats.saldo)}</p>
              <p className="text-sm text-gray-500">Saldo</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-amber-600 font-medium">Dari penjualan karya</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Zap size={18} className="text-violet-500" /> Kuota AI
            </h3>
            {!user.isPremium && !user.isFounder && (
              <Link href="/guru/pengaturan/premium" className="text-xs text-emerald-600 font-semibold hover:underline">
                Upgrade
              </Link>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-600 font-medium">Generator RPP</span>
                <span className="text-gray-400">{stats.aiUsage.rpp} / {(user.isPremium || user.isFounder) ? "Unlimited" : "10"}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full" style={{ width: `${Math.min((stats.aiUsage.rpp / 10) * 100, 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-600 font-medium">Generator Soal</span>
                <span className="text-gray-400">{stats.aiUsage.soal} / {(user.isPremium || user.isFounder) ? "Unlimited" : "20"}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-400 to-violet-500 rounded-full" style={{ width: `${Math.min((stats.aiUsage.soal / 20) * 100, 100)}%` }} />
              </div>
            </div>
          </div>

          {!user.isPremium && !user.isFounder && (
            <Link
              href="/guru/pengaturan/premium"
              className="mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              <Crown size={14} /> Upgrade untuk unlimited AI
            </Link>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Aksi Cepat</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Link href="/guru/rpp-modul" className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Wand2 size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700">Generator RPP</p>
                <p className="text-xs text-gray-500">AI powered</p>
              </div>
            </Link>

            <Link href="/guru/bank-soal" className="flex items-center gap-3 p-4 rounded-xl bg-violet-50 hover:bg-violet-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
                <Database size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">Bank Soal</p>
                <p className="text-xs text-gray-500">Upload and HOTS</p>
              </div>
            </Link>

            <Link href="/guru/kuis-game" className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <Gamepad2 size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">Kuis Game</p>
                <p className="text-xs text-gray-500">Multiplayer</p>
              </div>
            </Link>

            <Link href="/guru/data-siswa" className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                <Users size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-amber-700">Data Siswa</p>
                <p className="text-xs text-gray-500">Monitoring</p>
              </div>
            </Link>

            <Link href="/guru/rpp-modul" className="flex items-center gap-3 p-4 rounded-xl bg-teal-50 hover:bg-teal-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
                <FileUp size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-teal-700">Upload RPP</p>
                <p className="text-xs text-gray-500">DOCX or PDF</p>
              </div>
            </Link>

            <Link href="/guru/toko-karya" className="flex items-center gap-3 p-4 rounded-xl bg-pink-50 hover:bg-pink-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center">
                <Upload size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-pink-700">Upload Karya</p>
                <p className="text-xs text-gray-500">Jual di toko</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Tips</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Star size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Gunakan AI untuk generate soal HOTS</p>
              <p className="text-xs text-gray-500 mt-0.5">Agar pembelajaran lebih menarik dan tantangan.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Publikasikan karya di Toko</p>
              <p className="text-xs text-gray-500 mt-0.5">Dapat income tambahan dari profesi pendidik.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Gamepad2 size={16} className="text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Ajak siswa bermain kuis multiplayer</p>
              <p className="text-xs text-gray-500 mt-0.5">Agar belajar jadi lebih seru dan interaktif!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
