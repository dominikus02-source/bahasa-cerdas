"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus, Settings, X, Camera, Save, CheckCircle2, AlertCircle, LogOut, Loader2, Crown,
  Bell, User as UserIcon, Award, History, Share2, Pencil,
} from "lucide-react";
import {
  IconBolt, IconFlame, IconCoin, IconTarget, IconSchool, IconLocation, IconPen, IconHeart, IconEye, IconClock,
} from "@/lib/icons";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarPicker } from "@/components/murid/AvatarPicker";
import { createClient } from "@/lib/supabase/client";
import { validateNicknameFormat, defaultNicknameFromFullName, NICKNAME_MAX_LENGTH } from "@/lib/nickname";
import { calcLevelProgress } from "@/lib/xp";

interface UserData {
  id: string; fullName: string; nickname?: string | null; xp: number; level: number; streak: number;
  league: string; avatar?: string; coins: number; totalLikes: number; totalViews: number;
  school?: string; city?: string; province?: string; grade?: string; bio?: string; email?: string;
}

interface KaryaItem {
  id: string; title: string; type: string; likesCount: number; viewsCount: number;
  excerpt?: string; content?: string; createdAt: string; isFeatured?: boolean;
}

interface LencanaItem {
  id: string; icon: string; name: string; unlocked: boolean; progress: number; target: number; rarityLabel: string;
}

interface ProfileMeta {
  memberNumber: string;
  gelar: string;
  stats: { karyaCount: number; totalLikes: number; totalViews: number; wordCount: number; xp: number; coins: number };
  kebunKata: { date: string; level: 0 | 1 | 2 | 3 | 4 }[];
  lencana: LencanaItem[];
  nickname: { value: string | null; updatedAt: string | null; daysLeftForChange: number };
}

interface NicknameHistoryRow {
  id: string; oldNickname: string | null; newNickname: string | null; changedAt: string;
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
  SILVER: { label: "Perak", gradient: "from-slate-400 to-slate-600", ring: "ring-slate-300", glow: "shadow-slate-200" },
  GOLD: { label: "Emas", gradient: "from-yellow-400 to-amber-500", ring: "ring-yellow-400", glow: "shadow-yellow-200" },
  DIAMOND: { label: "Berlian", gradient: "from-cyan-400 to-blue-500", ring: "ring-cyan-400", glow: "shadow-cyan-200" },
};

function initials(name: string) {
  return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "M";
}

function waktuLalu(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j`;
  return `${Math.floor(h / 24)}h`;
}

const KEBUN_LEVELS = [
  { level: 0, label: "Tidak menulis", color: "bg-gray-100" },
  { level: 1, label: "1 kata", color: "bg-emerald-200" },
  { level: 2, label: "2 kata", color: "bg-emerald-300" },
  { level: 3, label: "3-4 kata", color: "bg-emerald-400" },
  { level: 4, label: "5+ kata", color: "bg-emerald-500" },
];

// Deret hari beruntun ("kebun" aktif hari ini + kemarin) — dipakai untuk
// membuat flame di hero berdenyut saat streak sedang hidup.
function isStreakLive(kebunKata: { date: string; level: 0 | 1 | 2 | 3 | 4 }[] | undefined) {
  if (!kebunKata || kebunKata.length === 0) return false;
  const last = kebunKata[kebunKata.length - 1];
  const lastDate = new Date(last.date);
  const today = new Date();
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - lastDate.setHours(0, 0, 0, 0)) / 86400000);
  return last.level > 0 && diffDays <= 1;
}

export default function MuridProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [karyaList, setKaryaList] = useState<KaryaItem[]>([]);
  const [meta, setMeta] = useState<ProfileMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showNicknameHistory, setShowNicknameHistory] = useState(false);
  const [nicknameHistory, setNicknameHistory] = useState<NicknameHistoryRow[]>([]);
  const [savingNickname, setSavingNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      try {
        const [meRes, karyaRes, metaRes] = await Promise.all([
          fetch("/api/user/me"),
          fetch("/api/siswa/user/karya"),
          fetch("/api/murid/profile-meta"),
        ]);
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user || meData);
        }
        if (karyaRes.ok) {
          const kData = await karyaRes.json();
          setKaryaList(kData.karya || []);
        }
        if (metaRes.ok) {
          const mData = await metaRes.json();
          setMeta(mData);
        }
      } catch (e) {
        console.error("Gagal load profil", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const [settingsForm, setSettingsForm] = useState({ fullName: "", school: "", city: "", province: "", grade: "", bio: "" });
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const openSettings = () => {
    if (!user) return;
    setSettingsForm({ fullName: user.fullName, school: user.school || "", city: user.city || "", province: user.province || "", grade: user.grade || "", bio: user.bio || "" });
    setAvatarSrc(user.avatar || null);
    setSettingsMessage(null);
    // Selalu isi ulang dari nickname yang tersimpan — draft ini sebelumnya
    // tidak pernah diisi sama sekali, jadi kotaknya selalu kosong meski
    // murid sudah punya nama panggilan. Klik simpan tanpa mengetik apa-apa
    // akan mengosongkan nickname mereka secara diam-diam.
    setNicknameDraft(user.nickname || "");
    setNicknameError(null);
    setShowSettings(true);
  };

  const handleSettingsSave = async () => {
    setSavingSettings(true);
    setSettingsMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settingsForm, avatar: avatarSrc }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan");
      }
      setSettingsMessage({ type: "success", text: "Profil berhasil diperbarui!" });
      setUser(prev => prev ? { ...prev, ...settingsForm, avatar: avatarSrc || undefined } : prev);
    } catch (e: any) {
      setSettingsMessage({ type: "error", text: e.message || "Gagal menyimpan" });
    } finally {
      setSavingSettings(false);
    }
  };

  const [nicknameDraft, setNicknameDraft] = useState("");

  const handleSaveNickname = async () => {
    const raw = nicknameDraft.trim();
    if (raw === (user?.nickname || "")) return;
    setSavingNickname(true);
    setNicknameError(null);
    try {
      const res = await fetch("/api/murid/nickname", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: raw || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan");
      }
      const data = await res.json();
      setUser(prev => prev ? { ...prev, nickname: data.nickname } : prev);
      setMeta(prev => prev ? { ...prev, nickname: { ...prev.nickname, value: data.nickname, updatedAt: data.nicknameUpdatedAt, daysLeftForChange: 30 } } : prev);
    } catch (e: any) {
      setNicknameError(e.message);
    } finally {
      setSavingNickname(false);
    }
  };

  const loadNicknameHistory = async () => {
    try {
      const res = await fetch("/api/murid/nickname");
      if (res.ok) {
        const data = await res.json();
        setNicknameHistory(data.history || []);
      }
    } catch {}
    setShowNicknameHistory(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleDeleteKarya = async (id: string) => {
    if (!confirm("Yakin ingin menghapus karya ini?")) return;
    const res = await fetch(`/api/siswa/karya/${id}`, { method: "DELETE" });
    if (res.ok) {
      setKaryaList(prev => prev.filter(k => k.id !== id));
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" /></div>;
  }

  if (!user) {
    return <div className="text-center py-20 text-gray-500">Gagal memuat profil. Silakan refresh.</div>;
  }

  const league = LEAGUE_META[user.league] || LEAGUE_META.BRONZE;
  const displayNickname = user.nickname || user.fullName;
  const levelProgress = calcLevelProgress(user.xp || 0, user.level || 1);
  const streakLive = isStreakLive(meta?.kebunKata);

  // Lencana paling dekat dibuka (progress tertinggi di antara yang belum
  // terbuka) — dipakai sebagai teaser "tinggal X lagi" ala Duolingo.
  const nextBadge = meta?.lencana
    .filter(l => !l.unlocked)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)[0];

  return (
    <div className="max-w-3xl mx-auto">
      <style>{`
        @keyframes profile-flame{0%,100%{transform:scale(1) rotate(-2deg)}50%{transform:scale(1.12) rotate(2deg)}}
        @keyframes profile-ring{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.45)}50%{box-shadow:0 0 0 8px rgba(255,255,255,0)}}
        @keyframes profile-shine{0%{transform:translateX(-120%) rotate(20deg)}100%{transform:translateX(220%) rotate(20deg)}}
        @keyframes profile-badge-pop{0%{transform:scale(0)}70%{transform:scale(1.15)}100%{transform:scale(1)}}
        .profile-flame-live{animation:profile-flame 1.1s ease-in-out infinite}
        .profile-avatar-ring{animation:profile-ring 2.2s ease-in-out infinite}
        .profile-badge-unlocked{animation:profile-badge-pop .4s ease}
      `}</style>

      {/* Hero — gradasi ungu tua tetap (bukan warna liga) supaya kontras teks
          selalu tinggi; liga Perak dulu memakai abu-abu datar sebagai LATAR
          PENUH, jadi tulisan putih nyaris tak kebaca. Warna liga sekarang
          cuma aksen kecil (chip + ring avatar). */}
      <div className="relative overflow-hidden rounded-[24px] p-6 md:p-8 text-white mb-6 shadow-2xl" style={{ background: "linear-gradient(135deg, #1B1035 0%, #3B1878 55%, #6D28D9 100%)" }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.35), transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(236,72,153,0.18), transparent 70%)" }} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-1/4 h-[250%] bg-white/10" style={{ animation: "profile-shine 3.5s ease-in-out infinite", transform: "skewX(-20deg)" }} />
        </div>
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`profile-avatar-ring w-20 h-20 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-3xl font-bold border-4 border-white/20 shadow-lg shrink-0 overflow-hidden ring-4 ${league.ring}`}>
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials(displayNickname)
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{displayNickname}</h1>
                {user.nickname && <p className="text-sm text-white/60">{user.fullName}</p>}
                {meta?.gelar && <p className="text-sm text-amber-300 font-semibold mt-1">{meta.gelar}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`bg-gradient-to-r ${league.gradient} rounded-full px-3 py-1 text-xs font-bold shadow-sm`}>{league.label}</span>
                </div>
              </div>
            </div>
            <button onClick={openSettings} className="bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl p-2.5 transition-all border border-white/10">
              <Settings size={20} />
            </button>
          </div>

          {/* Level progress bar — jarak ke level berikutnya selalu terlihat */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="bg-white/10 backdrop-blur rounded-full px-2.5 py-0.5 border border-white/10">Level {user.level}</span>
              <span className="text-white/60">{levelProgress.current} / {levelProgress.needed} XP menuju Level {(user.level || 1) + 1}</span>
            </div>
            <div className="h-3 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-300 to-amber-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${levelProgress.pct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-5">
            <div className={`flex items-center gap-2 backdrop-blur rounded-2xl pl-2 pr-3.5 py-1.5 text-sm font-bold border border-white/10 ${streakLive ? "bg-orange-400/20" : "bg-white/5"}`}>
              <span className={`w-6 h-6 rounded-lg bg-orange-400/20 flex items-center justify-center text-orange-300 ${streakLive ? "profile-flame-live" : ""}`}><IconFlame size={13} /></span> {user.streak || 0}
            </div>
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur rounded-2xl pl-2 pr-3.5 py-1.5 text-sm font-bold border border-white/10">
              <span className="w-6 h-6 rounded-lg bg-amber-400/20 flex items-center justify-center text-amber-300"><IconBolt size={13} /></span> {user.xp?.toLocaleString() || 0}
            </div>
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur rounded-2xl pl-2 pr-3.5 py-1.5 text-sm font-bold border border-white/10">
              <span className="w-6 h-6 rounded-lg bg-yellow-400/20 flex items-center justify-center text-yellow-300"><IconCoin size={13} /></span> {user.coins || 0}
            </div>
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur rounded-2xl pl-2 pr-3.5 py-1.5 text-sm font-bold border border-white/10">
              <span className="w-6 h-6 rounded-lg bg-rose-400/20 flex items-center justify-center text-rose-300"><IconHeart size={13} /></span> {user.totalLikes || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left - Info + Badges */}
        <div className="space-y-4">
          {/* Lencana */}
          {meta && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                    <Award size={13} className="text-white" />
                  </span>
                  Lencana
                </h3>
                <span className="text-[11px] font-semibold text-gray-400">
                  {meta.lencana.filter(l => l.unlocked).length}/{meta.lencana.length}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {meta.lencana.map(l => (
                  <div
                    key={l.id}
                    title={l.unlocked ? l.name : `${l.name} — ${l.progress}/${l.target}`}
                    className={`relative flex flex-col items-center gap-1 p-2.5 rounded-xl text-center transition-transform ${
                      l.unlocked
                        ? "profile-badge-unlocked bg-gradient-to-b from-amber-50 to-amber-100 ring-1 ring-amber-200 hover:scale-105"
                        : "bg-gray-50"
                    }`}
                  >
                    <Image
                      src={l.icon}
                      alt={l.name}
                      width={40}
                      height={40}
                      className={`w-10 h-10 object-contain ${l.unlocked ? "" : "grayscale opacity-30"}`}
                    />
                    <span className={`text-[10px] font-semibold leading-tight ${l.unlocked ? "text-amber-700" : "text-gray-400"}`}>{l.name}</span>
                    {!l.unlocked && (
                      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mt-0.5">
                        <div className="h-full bg-violet-400 rounded-full" style={{ width: `${Math.min(100, (l.progress / l.target) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {nextBadge && (
                <p className="text-[11px] text-violet-600 font-semibold mt-3 flex items-center gap-1 bg-violet-50 rounded-lg px-2.5 py-2">
                  <Award size={12} /> {nextBadge.target - nextBadge.progress} lagi untuk buka &ldquo;{nextBadge.name}&rdquo;!
                </p>
              )}
            </div>
          )}

          {/* Kebun Kata */}
          {meta && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
                    <IconPen size={12} className="text-white" />
                  </span>
                  Kebun Kata
                </h3>
                {streakLive && user.streak > 0 && (
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <IconFlame size={10} /> {user.streak} hari beruntun
                  </span>
                )}
              </div>
              <div className="grid grid-cols-10 gap-1">
                {meta.kebunKata.slice(-30).map((d, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-[3px] ${KEBUN_LEVELS[d.level].color} hover:ring-2 hover:ring-emerald-300 transition-all`}
                    title={`${new Date(d.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} — ${KEBUN_LEVELS[d.level].label}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
                <span>Sedikit</span>
                {KEBUN_LEVELS.map(k => (
                  <span key={k.level} className={`w-2.5 h-2.5 rounded-[2px] ${k.color} inline-block`} />
                ))}
                <span>Banyak</span>
              </div>
            </div>
          )}
        </div>

        {/* Right - Karya */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <IconPen size={15} className="text-white" />
              </span>
              Karyaku
              {meta && <span className="text-sm font-normal text-gray-400">({meta.stats.karyaCount})</span>}
            </h2>
            <Link href="/murid/karya/tulis" className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-full text-xs font-bold hover:bg-violet-700 transition-all shadow-sm">
              <Plus size={14} /> Tulis
            </Link>
          </div>

          {karyaList.length === 0 ? (
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-8 text-center border border-violet-100">
              <IconPen size={32} className="mx-auto text-violet-300 mb-2" />
              <p className="text-sm text-gray-500">Belum ada karya. Mulai menulis!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {karyaList.map(k => {
                const meta = TYPE_META[k.type] || { label: k.type, badge: "bg-gray-100 text-gray-700" };
                return (
                  <div key={k.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between">
                      <Link href={`/murid/karya/${k.id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.badge}`}>{meta.label}</span>
                          {k.isFeatured && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Pilihan</span>}
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm">{k.title}</h3>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{k.excerpt || k.content?.slice(0, 100)}</p>
                      </Link>
                      <button onClick={() => handleDeleteKarya(k.id)} className="text-gray-300 hover:text-red-500 p-1 transition-colors shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><IconHeart size={11} className="text-red-400" /> {k.likesCount || 0}</span>
                      <span className="flex items-center gap-1"><IconEye size={11} /> {k.viewsCount || 0}</span>
                      <span className="ml-auto">{waktuLalu(k.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-12 md:pt-20 px-4 overflow-y-auto" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Settings size={18} className="text-violet-600" />
                Pengaturan Profil
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {settingsMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                  settingsMessage.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  {settingsMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {settingsMessage.text}
                </div>
              )}

              {/* Avatar */}
              <AvatarPicker value={avatarSrc} onChange={setAvatarSrc} />

              <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-3.5">
                <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <Pencil size={14} className="text-violet-500" /> Nama Panggilan
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={nicknameDraft}
                    onChange={e => setNicknameDraft(e.target.value)}
                    placeholder={defaultNicknameFromFullName(user.fullName)}
                    maxLength={NICKNAME_MAX_LENGTH}
                    className="h-10 text-sm rounded-xl bg-white"
                  />
                  <button
                    onClick={handleSaveNickname}
                    disabled={savingNickname || nicknameDraft.trim() === (user.nickname || "")}
                    className="px-3 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 text-sm shrink-0"
                  >
                    {savingNickname ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  </button>
                </div>
                {nicknameError && <p className="text-xs text-red-500 mt-1">{nicknameError}</p>}
                {meta && meta.nickname.daysLeftForChange > 0 && (
                  <p className="text-xs text-gray-400 mt-1">Ganti lagi dalam {meta.nickname.daysLeftForChange} hari</p>
                )}
                {user.nickname && (
                  <button onClick={loadNicknameHistory} className="text-xs text-violet-600 hover:text-violet-700 mt-2 flex items-center gap-1">
                    <History size={12} /> Riwayat perubahan
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <Input value={settingsForm.fullName} onChange={e => setSettingsForm(p => ({ ...p, fullName: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sekolah</label>
                  <Input value={settingsForm.school} onChange={e => setSettingsForm(p => ({ ...p, school: e.target.value }))} className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
                  <Input value={settingsForm.grade} onChange={e => setSettingsForm(p => ({ ...p, grade: e.target.value }))} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kota</label>
                  <Input value={settingsForm.city} onChange={e => setSettingsForm(p => ({ ...p, city: e.target.value }))} className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
                  <Input value={settingsForm.province} onChange={e => setSettingsForm(p => ({ ...p, province: e.target.value }))} className="h-11 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea value={settingsForm.bio} onChange={e => setSettingsForm(p => ({ ...p, bio: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
              </div>
              <Button onClick={handleSettingsSave} disabled={savingSettings} className="w-full bg-violet-600 hover:bg-violet-700 text-white h-11 rounded-xl font-bold">
                {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Simpan Perubahan
              </Button>
            </div>
            <div className="border-t border-gray-100 p-5 space-y-2">
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium">
                <LogOut size={16} /> Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nickname History Modal */}
      {showNicknameHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-12 md:pt-20 px-4 overflow-y-auto" onClick={() => setShowNicknameHistory(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <History size={18} className="text-violet-600" />
                Riwayat Nama Panggilan
              </h2>
              <button onClick={() => setShowNicknameHistory(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 max-h-80 overflow-y-auto">
              {nicknameHistory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Belum ada riwayat perubahan.</p>
              ) : (
                <div className="space-y-3">
                  {nicknameHistory.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-400 line-through">{r.oldNickname || "(kosong)"}</span>
                        <span className="mx-2 text-gray-300">→</span>
                        <span className="font-semibold text-gray-900">{r.newNickname || "(direset)"}</span>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(r.changedAt).toLocaleDateString("id-ID")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
