"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Camera, Settings, Award, BookOpen, Trophy, Star, MessageCircle, Heart, Image, MapPin, Calendar, GraduationCap, Mail } from "lucide-react";

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
  grade?: string;
}

export default function MuridProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => setUser(d?.user || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const leagueEmoji = { BRONZE: "🥉", SILVER: "🥈", GOLD: "🥇", DIAMOND: "💎" }[user?.league || "BRONZE"] || "🥉"
  const leagueLabel = { BRONZE: "Perunggu", SILVER: "Perak", GOLD: "Emas", DIAMOND: "Berlian" }[user?.league || "BRONZE"] || "Perunggu"
  const leagueColors = { BRONZE: "from-amber-500 to-orange-600", SILVER: "from-gray-300 to-gray-500", GOLD: "from-yellow-400 to-amber-500", DIAMOND: "from-cyan-400 to-blue-500" }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Cover & Avatar */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0ySDIwdjJoMTZWMTBoMnYyaDEydjJoMTJ2MTBoMTZ2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        {/* BC Logo */}
        <div className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
          <span className="text-white font-bold text-lg">BC</span>
        </div>
        
        {/* Avatar */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <div className="relative">
            <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${leagueColors[user?.league as keyof typeof leagueColors] || "from-violet-500 to-purple-600"} p-1 shadow-xl`}>
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-gray-800">{user?.fullName?.charAt(0).toUpperCase() || "M"}</span>
                )}
              </div>
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              <Camera size={14} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Name & Info */}
      <div className="pt-20 px-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{user?.fullName || "Murid"}</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-lg">{leagueEmoji}</span>
          <span className="text-sm font-medium text-gray-600">{leagueLabel}</span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-sm font-semibold text-violet-600">Level {user?.level || 1}</span>
        </div>
        
        {user?.bio && (
          <p className="mt-3 text-sm text-gray-600 max-w-md mx-auto">{user.bio}</p>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-4 divide-x divide-gray-100">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{user?.xp?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500 mt-1">XP</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{user?.streak || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Streak</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-500 mt-1">Sertifikat</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-500 mt-1">Achievement</p>
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
          {user.grade && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs text-gray-600 shadow-sm">
              <BookOpen size={12} />
              {user.grade}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 mx-4">
        <Link href="/murid/pengaturan" className="flex items-center justify-center gap-2 py-3 bg-white rounded-xl border border-gray-100 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Settings size={16} />
          Pengaturan
        </Link>
      </div>

      {/* Menu Grid */}
      <div className="mt-6 mx-4 grid grid-cols-4 gap-3">
        {[
          { icon: Award, label: "Sertifikat", color: "bg-amber-100 text-amber-600", href: "/murid/sertifikat" },
          { icon: Trophy, label: "Achievement", color: "bg-orange-100 text-orange-600", href: "#" },
          { icon: BookOpen, label: "UKBI", color: "bg-blue-100 text-blue-600", href: "/murid/ukbi" },
          { icon: Star, label: "Favorit", color: "bg-pink-100 text-pink-600", href: "#" },
          { icon: Image, label: "Media", color: "bg-emerald-100 text-emerald-600", href: "#" },
          { icon: MapPin, label: "Aktivitas", color: "bg-violet-100 text-violet-600", href: "#" },
          { icon: Heart, label: "Disukai", color: "bg-red-100 text-red-600", href: "#" },
          { icon: Calendar, label: "Kalender", color: "bg-cyan-100 text-cyan-600", href: "/murid/olimpiade/kalender" },
        ].map((item, idx) => (
          <Link key={idx} href={item.href} className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-50 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center`}>
              <item.icon size={20} />
            </div>
            <span className="text-xs font-medium text-gray-600">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-6 mx-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Aktivitas Terbaru</h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <BookOpen size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">Belum ada aktivitas</p>
          <p className="text-gray-400 text-xs mt-1">Mulai belajar untuk mengisi aktivitasmu!</p>
        </div>
      </div>
    </div>
  );
}