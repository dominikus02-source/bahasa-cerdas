"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import { IconBolt, IconFlame, IconCoin, IconTarget, IconSchool, IconLocation, IconPen, IconChat, IconHeart, IconEye, IconClock } from "@/lib/icons";

interface UserData {
  id: string; fullName: string; xp: number; level: number; streak: number;
  league: string; avatar?: string; coins: number; totalLikes: number; totalViews: number;
  school?: string; city?: string; bio?: string;
}

interface KaryaItem {
  id: string; title: string; type: string; likesCount: number; viewsCount: number;
  excerpt?: string; createdAt: string;
}

const TYPE_META: Record<string, { label: string; badge: string }> = {
  PUISI: { label: "Puisi", badge: "bg-rose-100 text-rose-600" },
  CERPEN: { label: "Cerpen", badge: "bg-blue-100 text-blue-600" },
  ARTIKEL: { label: "Artikel", badge: "bg-amber-100 text-amber-600" },
  ANEKDOT: { label: "Anekdot", badge: "bg-orange-100 text-orange-600" },
  PANTUN: { label: "Pantun", badge: "bg-teal-100 text-teal-600" },
  OPINI: { label: "Opini", badge: "bg-violet-100 text-violet-600" },
};

const LEAGUE_META: Record<string, { label: string; gradient: string; ring: string; glow: string }> = {
  BRONZE: { label: "Perunggu", gradient: "from-amber-500 to-orange-600", ring: "ring-amber-400", glow: "shadow-amber-200" },
  SILVER: { label: "Perak", gradient: "from-gray-300 to-gray-500", ring: "ring-gray-300", glow: "shadow-gray-200" },
  GOLD: { label: "Emas", gradient: "from-yellow-400 to-amber-500", ring: "ring-yellow-400", glow: "shadow-yellow-200" },
  DIAMOND: { label: "Berlian", gradient: "from-cyan-400 to-blue-500", ring: "ring-cyan-400", glow: "shadow-cyan-200" },
};

export default function MuridProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [karyaList, setKaryaList] = useState<KaryaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("karya");

  const fetchProfile = async () => {
    const res = await fetch("/api/user/me");
    const d = await res.json();
    if (d?.user) {
      setUser(d.user);
      const userId = d.user.userId || d.user.id;
      if (userId) {
        const kRes = await fetch(`/api/siswa/user/${userId}/karya?limit=20`);
        const kData = await kRes.json();
        setKaryaList(kData.karya || []);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchProfile(); }, []);

  const league = LEAGUE_META[user?.league as keyof typeof LEAGUE_META] || LEAGUE_META.BRONZE;

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      {/* ═══ COVER ═══ */}
      <div className="relative h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 mb-16">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: 'url("/batik-header-profile-bc.png")' }} />
      </div>

      {/* ═══ AVATAR + INFO ═══ */}
      <div className="relative -mt-24 mb-6 flex flex-col items-center">
        <div className={`relative w-28 h-28 rounded-full bg-gradient-to-br ${league.gradient} p-1 shadow-xl ring-4 ${league.ring} ${league.glow} -mt-6`}>
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-gray-800">
                {user?.fullName?.charAt(0).toUpperCase() || "M"}
              </span>
            )}
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mt-3">{user?.fullName}</h1>

        {/* School + City with icons */}
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
          {user?.school && (
            <span className="flex items-center gap-1">
              <IconSchool size={14} className="text-violet-400" />
              {user.school}
            </span>
          )}
          {user?.city && (
            <span className="flex items-center gap-1">
              <IconLocation size={14} className="text-violet-400" />
              {user.city}
            </span>
          )}
        </div>

        {/* League + Level */}
        <div className="flex items-center gap-2 mt-2">
          <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r ${league.gradient} text-white`}>
            <IconTarget size={12} />
            {league.label}
          </span>
          <span className="text-xs text-gray-300">·</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-600">
            Level {user?.level || 1}
          </span>
        </div>

        {/* Streak */}
        {user && user.streak > 0 && (
          <div className="flex items-center gap-1 mt-2 text-sm text-orange-500 font-medium">
            <IconFlame size={16} />
            Streak {user.streak} hari
          </div>
        )}

        {/* Bio */}
        {user?.bio && (
          <p className="text-sm text-gray-500 mt-3 text-center max-w-md leading-relaxed">
            {user.bio}
          </p>
        )}
      </div>

      {/* ═══ STATS BAR ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-5 divide-x divide-gray-100">
          {[
            { value: karyaList.length, label: "Karya", icon: <IconPen size={16} className="text-violet-500" /> },
            { value: user?.totalLikes || 0, label: "Disukai", icon: <IconHeart size={16} className="text-violet-500" /> },
            { value: user?.totalViews || 0, label: "Dilihat", icon: <IconEye size={16} className="text-violet-500" /> },
            { value: user?.xp?.toLocaleString() || 0, label: "XP", icon: <IconBolt size={16} className="text-yellow-500" /> },
            { value: user?.coins || 0, label: "Koin", icon: <IconCoin size={16} className="text-yellow-500" /> },
          ].map((s, i) => (
            <div key={i} className="text-center px-1">
              <div className="flex justify-center mb-1">{s.icon}</div>
              <p className="text-lg font-bold text-gray-900 leading-tight">{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ACTIONS ═══ */}
      <div className="flex gap-3 mb-8">
        <Link href="/murid/karya/tulis" className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-violet-200">
          <Plus size={16} /> Tulis Karya Baru
        </Link>
        <Link href="/murid/pengaturan" className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all">
          <Settings size={18} />
        </Link>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        <button onClick={() => setActiveTab("karya")} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "karya" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
          <IconPen size={14} /> Karya
        </button>
        <button onClick={() => setActiveTab("prestasi")} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "prestasi" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
          <IconTarget size={14} /> Prestasi
        </button>
      </div>

      {/* ═══ KARYA GRID ═══ */}
      {activeTab === "karya" && (
        karyaList.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
              <IconPen size={24} className="text-violet-500" />
            </div>
            <p className="text-gray-500 font-medium">Belum ada karya</p>
            <p className="text-gray-400 text-sm mt-1">Tulis karya pertamamu!</p>
            <Link href="/murid/karya/tulis" className="inline-block mt-4 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
              Mulai Menulis
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {karyaList.map(k => {
              const m = TYPE_META[k.type] || TYPE_META.OPINI;
              return (
                <Link key={k.id} href={`/murid/karya/${k.id}`} className="group bg-white rounded-xl border border-gray-100 hover:shadow-lg hover:border-violet-200 transition-all overflow-hidden">
                  <div className="p-4">
                    {/* Type Badge */}
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${m.badge}`}>
                      {m.label}
                    </span>
                    {/* Title */}
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug group-hover:text-violet-700 transition-colors mb-2">
                      {k.title}
                    </h3>
                    {/* Excerpt */}
                    <p className="text-[11px] text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                      {k.excerpt?.slice(0, 80)}
                    </p>
                    {/* Stats */}
                    <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-2 border-t border-gray-50">
                      <span className="flex items-center gap-1"><IconHeart size={10} />{k.likesCount}</span>
                      <span className="flex items-center gap-1"><IconEye size={10} />{k.viewsCount}</span>
                      <span className="flex items-center gap-1 ml-auto"><IconClock size={10} />{new Date(k.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      )}

      {/* ═══ PRESTASI ═══ */}
      {activeTab === "prestasi" && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <IconTarget size={24} className="text-amber-500" />
          </div>
          <p className="text-gray-500 font-medium">Belum ada prestasi</p>
          <p className="text-gray-400 text-sm mt-1">Terus berkarya dan raih prestasi!</p>
        </div>
      )}
    </div>
  );
}
