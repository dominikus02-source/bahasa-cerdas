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
}

const GameIcon = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const TaskIcon = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const UJIIcon = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ProgressIcon = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round"/></svg>;

export default function MuridBerandaPage() {
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => setUser(d?.user || null))
      .catch(() => {});
  }, []);

  const league = user?.league || "BRONZE";
  const nextLevelXP = (user?.level || 1) * (user?.level || 1) * 100;
  const currentLevelXP = ((user?.level || 1) - 1) * ((user?.level || 1) - 1) * 100;
  const progress = ((user?.xp || 0) - currentLevelXP) / (nextLevelXP - currentLevelXP) * 100;

  return (
    <div>
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Halo, {user?.fullName || "Murid"}!
        </h1>
        <p className="text-violet-100">Selamat datang di BahasaCerdas</p>
        
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Link href="/murid/game" className="bg-white p-5 rounded-xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform">
            <GameIcon />
          </div>
          <p className="font-bold text-gray-900">Gim</p>
          <p className="text-xs text-gray-500 mt-1">Mainkan & belajar</p>
        </Link>
        <Link href="/murid/tugasku" className="bg-white p-5 rounded-xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
            <TaskIcon />
          </div>
          <p className="font-bold text-gray-900">Tugasku</p>
          <p className="text-xs text-gray-500 mt-1">Latihan soal</p>
        </Link>
        <Link href="/murid/ukbi" className="bg-white p-5 rounded-xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
            <UJIIcon />
          </div>
          <p className="font-bold text-gray-900">UKBI</p>
          <p className="text-xs text-gray-500 mt-1">Persiapan ujian</p>
        </Link>
        <Link href="/murid/progresku" className="bg-white p-5 rounded-xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
            <ProgressIcon />
          </div>
          <p className="font-bold text-gray-900">Kemajuan</p>
          <p className="text-xs text-gray-500 mt-1">Lihat progres</p>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-3">Aktivitas Terbaru</h2>
        <p className="text-gray-500 text-sm">Belum ada aktivitas. Mulai belajar sekarang!</p>
      </div>
    </div>
  );
}