"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Camera, Settings, Award, BookOpen, Trophy, Star, MessageCircle, Heart, Image as ImageIcon, MapPin, Calendar, GraduationCap, Mail, ShoppingBag, DollarSign, Users, FileText, Crown } from "lucide-react";
import { levelFromXp } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";
import { RankChip } from "@/components/gamification/RankChip";

interface UserData {
  id: string;
  fullName: string;
  xp: number;
  level: number;
  streak: number;
  league: string;
  avatar?: string;
  bio?: string;
  school?: string;
  isPremium?: boolean;
  isFounder?: boolean;
}

interface Stats {
  totalKarya: number;
  totalSiswa: number;
  totalKuis: number;
  saldo: number;
}

export default function GuruProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<Stats>({ totalKarya: 0, totalSiswa: 0, totalKuis: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/user/me").then(r => r.ok ? r.json() : null),
      fetch("/api/guru/dashboard").then(r => r.json()).catch(() => ({}))
    ]).then(([userData, statsData]) => {
      if (userData?.user) setUser(userData.user);
      if (statsData) setStats(statsData);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  // Rank resmi dari XP — User.league sudah tidak ditulis.
  const rank = rankFromLevel(levelFromXp(user?.xp || 0))
  const leagueColors = { BRONZE: "from-amber-500 to-orange-600", SILVER: "from-gray-300 to-gray-500", GOLD: "from-yellow-400 to-amber-500", DIAMOND: "from-cyan-400 to-blue-500" }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Cover & Avatar */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600" />
        {/* Batik Pattern */}
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: 'url("/batik-header-profile-bc.png")' }} />
        {/* BC Logo */}
        <Link href="/guru/beranda" className="absolute top-4 left-4 hover:opacity-80 transition-opacity">
          <Image src="/BC-logo.png" alt="BC" width={40} height={40} className="object-contain" />
        </Link>
        
        {/* Avatar */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <div className="relative">
            <div className={`w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 p-1 shadow-xl`}>
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-gray-800">{user?.fullName?.charAt(0).toUpperCase() || "G"}</span>
                )}
              </div>
            </div>
            {user?.isPremium || user?.isFounder ? (
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <Crown size={14} className="text-white" />
              </div>
            ) : null}
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              <Camera size={14} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Name & Info */}
      <div className="pt-20 px-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{user?.fullName || "Guru"}</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <RankChip rank={rank} size={18} />
          <span className="text-xs text-gray-400">•</span>
          <span className="text-sm font-semibold text-emerald-600">Level {user?.level || 1}</span>
        </div>
        
        {user?.isFounder && (
          <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
            <Crown size={12} /> Founder
          </span>
        )}
        {user?.isPremium && !user?.isFounder && (
          <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 rounded-full text-xs font-medium border border-amber-200">
            <Star size={12} /> Pro
          </span>
        )}
        
        {user?.bio && (
          <p className="mt-3 text-sm text-gray-600 max-w-md mx-auto">{user.bio}</p>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-4 divide-x divide-gray-100">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{stats.totalKarya}</p>
            <p className="text-xs text-gray-500 mt-1">Karya</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{stats.totalSiswa}</p>
            <p className="text-xs text-gray-500 mt-1">Siswa</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{stats.totalKuis}</p>
            <p className="text-xs text-gray-500 mt-1">Kuis</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-emerald-600">Rp{(stats.saldo || 0).toLocaleString("id")}</p>
            <p className="text-xs text-gray-500 mt-1">Saldo</p>
          </div>
        </div>
      </div>

      {/* Info Chips */}
      {user?.school && (
        <div className="mt-4 mx-4 flex flex-wrap justify-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs text-gray-600 shadow-sm">
            <GraduationCap size={12} />
            {user.school}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 mx-4">
        <Link href="/guru/pengaturan" className="flex items-center justify-center gap-2 py-3 bg-white rounded-xl border border-gray-100 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Settings size={16} />
          Pengaturan
        </Link>
      </div>

      {/* Menu Grid - Guru Specific */}
      <div className="mt-6 mx-4 grid grid-cols-4 gap-3">
        {[
          { icon: FileText, label: "Karya", color: "bg-amber-100 text-amber-600", href: "/guru/toko-karya" },
          { icon: ShoppingBag, label: "Toko", color: "bg-orange-100 text-orange-600", href: "/guru/toko-karya" },
          { icon: DollarSign, label: "Pendapatan", color: "bg-green-100 text-green-600", href: "/guru/pengaturan/saldo" },
          { icon: Users, label: "Siswa", color: "bg-blue-100 text-blue-600", href: "/guru/data-siswa" },
          { icon: Award, label: "Sertifikat", color: "bg-purple-100 text-purple-600", href: "/guru/sertifikat" },
          { icon: Trophy, label: "Kuis", color: "bg-pink-100 text-pink-600", href: "/guru/kuis-game" },
          { icon: Calendar, label: "Kalender", color: "bg-cyan-100 text-cyan-600", href: "/guru/olimpiade/kalender" },
          { icon: Star, label: "Komunitas", color: "bg-violet-100 text-violet-600", href: "/guru/komunitas" },
        ].map((item, idx) => (
          <Link key={idx} href={item.href} className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-50 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center`}>
              <item.icon size={20} />
            </div>
            <span className="text-xs font-medium text-gray-600">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Quick Links */}
      <div className="mt-6 mx-4 space-y-2">
        <Link href="/guru/kelasku" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <BookOpen size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">KelasKu</p>
            <p className="text-xs text-gray-500">Kelola kelas dan tugas</p>
          </div>
          <span className="text-gray-400">›</span>
        </Link>
        
        <Link href="/guru/bank-soal" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
            <FileText size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Bank Soal</p>
            <p className="text-xs text-gray-500">Buat dan kelola soal</p>
          </div>
          <span className="text-gray-400">›</span>
        </Link>
        
        <Link href="/guru/toko-karya" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <ShoppingBag size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Pesanan</p>
            <p className="text-xs text-gray-500">Lihat pesanan karya</p>
          </div>
          <span className="text-gray-400">›</span>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="mt-6 mx-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Aktivitas Terbaru</h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <BookOpen size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">Belum ada aktivitas</p>
          <p className="text-gray-400 text-xs mt-1">Mulai buat konten untuk mengisi aktivitasmu!</p>
        </div>
      </div>
    </div>
  );
}