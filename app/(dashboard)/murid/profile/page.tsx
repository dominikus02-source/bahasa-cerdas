"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Camera, Settings, Heart, Eye, BookOpen, Plus } from "lucide-react";

interface UserData {
  id: string; fullName: string; xp: number; level: number; streak: number;
  league: string; avatar?: string; coins: number; totalLikes: number; totalViews: number;
  school?: string; city?: string; bio?: string;
}

interface KaryaItem {
  id: string; title: string; type: string; likesCount: number; viewsCount: number;
  excerpt?: string; createdAt: string;
}

const TYPE_COLORS: Record<string, string> = { PUISI: "border-rose-200 bg-rose-50", CERPEN: "border-blue-200 bg-blue-50", ARTIKEL: "border-amber-200 bg-amber-50", ANEKDOT: "border-orange-200 bg-orange-50", PANTUN: "border-teal-200 bg-teal-50", OPINI: "border-violet-200 bg-violet-50" };

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

  const leagueLabel = { BRONZE: "Perunggu", SILVER: "Perak", GOLD: "Emas", DIAMOND: "Berlian" }[user?.league || "BRONZE"] || "Perunggu";
  const leagueColors = { BRONZE: "from-amber-500 to-orange-600", SILVER: "from-gray-300 to-gray-500", GOLD: "from-yellow-400 to-amber-500", DIAMOND: "from-cyan-400 to-blue-500" };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Cover */}
      <div className="relative h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 mb-16">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: 'url("/batik-header-profile-bc.png")' }} />
      </div>

      {/* Avatar */}
      <div className="relative -mt-24 mb-6 flex flex-col items-center">
        <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${user ? leagueColors[user.league as keyof typeof leagueColors] || "from-violet-500 to-purple-600" : "from-violet-500 to-purple-600"} p-1 shadow-xl -mt-8`}>
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
            {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl font-bold text-gray-800">{user?.fullName?.charAt(0).toUpperCase() || "M"}</span>}
          </div>
        </div>
        <button className="absolute top-0 right-1/2 -mr-14 mt-1 w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center shadow border-2 border-white">
          <Camera size={12} className="text-white" />
        </button>

        <h1 className="text-xl font-bold text-gray-900 mt-3">{user?.fullName}</h1>

        {/* School & City — langsung di bawah nama */}
        {(user?.school || user?.city) && (
          <p className="text-sm text-gray-500 mt-1">
            {user?.school}{user?.school && user?.city ? " · " : ""}{user?.city}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-sm text-gray-500">{leagueLabel}</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-sm font-semibold text-violet-600">Level {user?.level || 1}</span>
        </div>

        {user?.bio && <p className="text-sm text-gray-500 mt-2 text-center max-w-sm">{user.bio}</p>}
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-5 divide-x divide-gray-100 text-center">
          <div className="px-2"><p className="text-lg font-bold text-gray-900">{karyaList.length}</p><p className="text-[10px] text-gray-500">Karya</p></div>
          <div className="px-2"><p className="text-lg font-bold text-gray-900">{user?.totalLikes || 0}</p><p className="text-[10px] text-gray-500">Disukai</p></div>
          <div className="px-2"><p className="text-lg font-bold text-gray-900">{user?.totalViews || 0}</p><p className="text-[10px] text-gray-500">Dilihat</p></div>
          <div className="px-2"><p className="text-lg font-bold text-gray-900">{user?.xp?.toLocaleString() || 0}</p><p className="text-[10px] text-gray-500">XP</p></div>
          <div className="px-2"><p className="text-lg font-bold text-amber-500">{user?.coins || 0}</p><p className="text-[10px] text-gray-500">Koin</p></div>
        </div>
      </div>

      {/* Streak */}
      <div className="flex items-center justify-center gap-6 mb-6 text-sm">
        <span className="flex items-center gap-1.5 text-orange-500 font-medium">Streak {user?.streak || 0} hari</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-8">
        <Link href="/murid/karya/tulis" className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-violet-200">
          <Plus size={16} /> Tulis Karya Baru
        </Link>
        <Link href="/murid/pengaturan" className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all">
          <Settings size={18} />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        <button onClick={() => setActiveTab("karya")} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "karya" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>Karya</button>
        <button onClick={() => setActiveTab("prestasi")} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "prestasi" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>Prestasi</button>
      </div>

      {/* Karya Grid */}
      {activeTab === "karya" && (
        karyaList.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
              <BookOpen size={24} className="text-violet-500" />
            </div>
            <p className="text-gray-500 font-medium">Belum ada karya</p>
            <p className="text-gray-400 text-sm mt-1">Tulis karya pertamamu!</p>
            <Link href="/murid/karya/tulis" className="inline-block mt-4 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
              Mulai Menulis
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {karyaList.map(k => (
              <Link key={k.id} href={`/murid/karya/${k.id}`} className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all ${TYPE_COLORS[k.type] || "border-gray-100"}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-semibold text-gray-500">{k.type}</span>
                </div>
                <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug mb-2">{k.title}</h3>
                <p className="text-[11px] text-gray-400 line-clamp-2 mb-3">{k.excerpt?.slice(0, 80)}</p>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><Heart size={10} />{k.likesCount}</span>
                  <span className="flex items-center gap-1"><Eye size={10} />{k.viewsCount}</span>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* Prestasi Tab */}
      {activeTab === "prestasi" && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-amber-500">!</span>
          </div>
          <p className="text-gray-500 font-medium">Belum ada prestasi</p>
          <p className="text-gray-400 text-sm mt-1">Terus berkarya dan raih prestasi!</p>
        </div>
      )}
    </div>
  );
}
