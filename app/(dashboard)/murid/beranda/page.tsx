"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface UserData {
  id: string;
  fullName: string;
  xp: number;
  level: number;
  streak: number;
  league: string;
  avatar?: string;
}

const GameIcon = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const TaskIcon = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const UJIIcon = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ProgressIcon = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ChatIcon = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ProfileIcon = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SparklesIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" strokeLinecap="round" strokeLinejoin="round"/></svg>;

export default function MuridBerandaPage() {
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => setUser(d?.user || null))
      .catch(() => {});
  }, []);

  const leagueEmoji = { BRONZE: "🥉", SILVER: "🥈", GOLD: "🥇", DIAMOND: "💎" }[user?.league || "BRONZE"] || "🥉"
  const leagueLabel = { BRONZE: "Perunggu", SILVER: "Perak", GOLD: "Emas", DIAMOND: "Berlian" }[user?.league || "BRONZE"] || "Perunggu"
  
  const nextLevelXP = (user?.level || 1) * (user?.level || 1) * 100;
  const currentLevelXP = ((user?.level || 1) - 1) * ((user?.level || 1) - 1) * 100;
  const progress = ((user?.xp || 0) - currentLevelXP) / (nextLevelXP - currentLevelXP) * 100;

  return (
    <div>
      {/* Profile Card */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-2xl border border-white/30 shadow-lg">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              user?.fullName?.charAt(0).toUpperCase() || "M"
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Halo, {user?.fullName || "Murid"}!</h1>
            <p className="text-violet-200 text-sm">Selamat datang di BahasaCerdas</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm">{leagueEmoji}</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{leagueLabel}</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Level {user?.level || 1}</span>
            </div>
          </div>
          <Link href="/murid/pengaturan" className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
        
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{user?.level || 1}</p>
            <p className="text-xs text-violet-200">Tingkat</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{user?.streak || 0}</p>
            <p className="text-xs text-violet-200">Streak Hari</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{user?.xp?.toLocaleString() || 0}</p>
            <p className="text-xs text-violet-200">XP</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-violet-200 mb-1">
            <span>Level {user?.level || 1}</span>
            <span>Level {(user?.level || 1) + 1}</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Link href="/murid/ai" className="bg-gradient-to-br from-violet-500 to-purple-600 p-5 rounded-xl text-white hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <SparklesIcon />
          </div>
          <p className="font-bold">AI Tutor</p>
          <p className="text-xs text-violet-200 mt-1">Belajar dengan AI</p>
        </Link>
        <Link href="/murid/game" className="bg-white p-5 rounded-xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
            <GameIcon />
          </div>
          <p className="font-bold text-gray-900">Gim</p>
          <p className="text-xs text-gray-500 mt-1">Mainkan & belajar</p>
        </Link>
        <Link href="/murid/tugasku" className="bg-white p-5 rounded-xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
            <TaskIcon />
          </div>
          <p className="font-bold text-gray-900">Tugasku</p>
          <p className="text-xs text-gray-500 mt-1">Latihan soal</p>
        </Link>
        <Link href="/murid/ukbi" className="bg-white p-5 rounded-xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
            <UJIIcon />
          </div>
          <p className="font-bold text-gray-900">UKBI</p>
          <p className="text-xs text-gray-500 mt-1">Persiapan ujian</p>
        </Link>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Link href="/murid/progresku" className="bg-white p-5 rounded-xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mb-3 shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform">
            <ProgressIcon />
          </div>
          <p className="font-bold text-gray-900">Kemajuan</p>
          <p className="text-xs text-gray-500 mt-1">Lihat progres</p>
        </Link>
        <Link href="/murid/pengaturan" className="bg-white p-5 rounded-xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-3 shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
            <ProfileIcon />
          </div>
          <p className="font-bold text-gray-900">Profil</p>
          <p className="text-xs text-gray-500 mt-1">Kelola akun</p>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-3">Aktivitas Terbaru</h2>
        <p className="text-gray-500 text-sm">Belum ada aktivitas. Mulai belajar sekarang!</p>
      </div>
    </div>
  );
}