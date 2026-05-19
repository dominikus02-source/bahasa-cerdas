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

export default function MuridBerandaPage() {
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => setUser(d?.user || null))
      .catch(() => {});
  }, []);

  const leagueColors: Record<string, string> = {
    BRONZE: "from-amber-600 to-amber-800",
    SILVER: "from-gray-300 to-gray-500",
    GOLD: "from-yellow-400 to-amber-500",
    DIAMOND: "from-cyan-400 to-blue-500",
  };

  const league = user?.league || "BRONZE";
  const nextLevelXP = (user?.level || 1) * (user?.level || 1) * 100;
  const currentLevelXP = ((user?.level || 1) - 1) * ((user?.level || 1) - 1) * 100;
  const progress = ((user?.xp || 0) - currentLevelXP) / (nextLevelXP - currentLevelXP) * 100;

  return (
    <div>
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Halo, {user?.fullName || "Murid"}! 👋
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
        <Link href="/murid/game" className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="text-2xl mb-2">🎮</div>
          <p className="font-semibold text-gray-900">Gim</p>
          <p className="text-xs text-gray-500">Mainkan & belajar</p>
        </Link>
        <Link href="/murid/tugasku" className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="text-2xl mb-2">📝</div>
          <p className="font-semibold text-gray-900">Tugasku</p>
          <p className="text-xs text-gray-500">Latihan soal</p>
        </Link>
        <Link href="/murid/ukbi" className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="text-2xl mb-2">📚</div>
          <p className="font-semibold text-gray-900">UKBI</p>
          <p className="text-xs text-gray-500">Persiapan ujian</p>
        </Link>
        <Link href="/murid/progresku" className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="text-2xl mb-2">📊</div>
          <p className="font-semibold text-gray-900">Kemajuan</p>
          <p className="text-xs text-gray-500">Lihat progres</p>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-bold text-gray-900 mb-3">Aktivitas Terbaru</h2>
        <p className="text-gray-500 text-sm">Belum ada aktivitas. Mulai belajar sekarang!</p>
      </div>
    </div>
  );
}