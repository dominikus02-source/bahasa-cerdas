"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Plus, Settings, X, Camera, Save, CheckCircle2, AlertCircle, LogOut, Loader2, Crown,
  Bell, User as UserIcon, Award, History, Share2, Pencil, Users,
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
import { getLevelProgress, levelFromXp } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";
import type { PlayerProfileView, XpHistoryEntryView } from "@/lib/gamification/client-types";
import ProfileHero, { type HeroSocial } from "@/components/profile/ProfileHero";
import SocialProofStrip from "@/components/profile/SocialProofStrip";
import { RankChip } from "@/components/gamification/RankChip";
import { BadgeIcon } from "@/components/gamification/BadgeIcon";
import UserAvatar from "@/components/arena/UserAvatar";
import UserName from "@/components/arena/UserName";

interface UserData {
  id: string; fullName: string; nickname?: string | null; xp: number; level: number; streak: number;
  league: string; avatar?: string; coins: number; totalLikes: number; totalViews: number;
  school?: string; city?: string; province?: string; grade?: string; noAbsen?: string; bio?: string; email?: string;
  equippedFrame?: string | null; equippedNameColor?: string | null; equippedBadge?: string | null;
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

// Liga 4 tingkat dihapus — identitas memakai 9 rank resmi (RANK_META).
// Cincin avatar mengikuti warna rank supaya tidak perlu tabel warna kedua.

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
  const [social, setSocial] = useState<HeroSocial | null>(null);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfileView | null>(null);
  const [xpHistory, setXpHistory] = useState<XpHistoryEntryView[]>([]);
  const [karyaFilter, setKaryaFilter] = useState("SEMUA");
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
          const me = meData.user || meData;
          setUser(me);
          // Statistik sosial (pengikut/mengikuti) — best-effort; bila tabel
          // Follow belum dimigrasi, respon 500 diabaikan dan UI tetap hidup.
          try {
            const socRes = await fetch(`/api/user/profile/${me.id}/social`);
            if (socRes.ok) setSocial(await socRes.json());
          } catch {}
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

  // Data pemain + aktivitas (sheet kiri/kanan) — dekoratif, best-effort.
  useEffect(() => {
    Promise.all([
      fetch("/api/player/profile").then(r => r.ok ? r.json() : null),
      fetch("/api/player/xp/history?limit=5").then(r => r.ok ? r.json() : null),
    ]).then(([pp, xh]) => {
      if (pp?.profile) setPlayerProfile(pp.profile);
      if (xh?.entries) setXpHistory(xh.entries);
    }).catch(() => {});
  }, []);

  const [settingsForm, setSettingsForm] = useState({ fullName: "", school: "", city: "", province: "", grade: "", noAbsen: "", bio: "" });
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const openSettings = () => {
    if (!user) return;
    setSettingsForm({ fullName: user.fullName, school: user.school || "", city: user.city || "", province: user.province || "", grade: user.grade || "", noAbsen: user.noAbsen || "", bio: user.bio || "" });
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from("avatars").upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setAvatarSrc(data.publicUrl);
    } catch (error: any) {
      setSettingsMessage({ type: "error", text: error.message || "Gagal upload foto" });
    } finally {
      setUploadingAvatar(false);
    }
  };

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

  const playerLevel = levelFromXp(user.xp || 0);
  const playerRank = rankFromLevel(playerLevel);
  const displayNickname = user.nickname || user.fullName;
  const levelProgress = getLevelProgress(user.xp || 0);
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
        @keyframes profile-badge-pop{0%{transform:scale(0)}70%{transform:scale(1.15)}100%{transform:scale(1)}}
        .profile-flame-live{animation:profile-flame 1.1s ease-in-out infinite}
        .profile-badge-unlocked{animation:profile-badge-pop .4s ease}
      `}</style>

      {/* PLAYER CARD — hero premium: identitas (avatar + nama + gelar) di
          kiri, rank crest BESAR di kanan, XP bar + aksi di bawah. */}
      <ProfileHero
        persona={{
          id: user.id,
          displayName: displayNickname,
          fullName: user.fullName,
          nickname: user.nickname,
          avatar: user.avatar,
          equippedFrame: user.equippedFrame,
          equippedNameColor: user.equippedNameColor,
          equippedBadge: user.equippedBadge,
          bio: user.bio ?? null,
          level: playerLevel,
          xp: user.xp || 0,
          levelProgress,
          streak: user.streak ?? 0,
          gelar: meta?.gelar ?? null,
          memberNumber: meta?.memberNumber ?? null,
        }}
        rank={playerRank}
        social={social}
        isOwn
        onEditProfile={openSettings}
      />

      {/* Social proof strip — statistik ringkas di atas konten */}
      <section
        className="mb-6 rounded-[24px] p-4 sm:p-5 shadow-lg"
        style={{ background: "linear-gradient(140deg, #141230 0%, #231a52 60%, #34166e 100%)" }}
      >
        <SocialProofStrip
          grid="grid-cols-3 md:grid-cols-6"
          stats={[
            { key: "level", label: "Level", value: playerLevel, icon: "trophy", href: "/arena/player" },
            { key: "xp", label: "XP", value: user.xp || 0, icon: "sparkles", href: "/arena/player" },
            { key: "koin", label: "Koin", value: user.coins || 0, icon: "sparkles", href: "/arena/player" },
            { key: "streak", label: "Streak", value: user.streak || 0, icon: "flame", href: "/arena/player" },
            { key: "karya", label: "Karya", value: meta?.stats.karyaCount ?? karyaList.length, icon: "book", href: "/murid/karya" },
            { key: "apresiasi", label: "Apresiasi", value: user.totalLikes || 0, icon: "heart", href: "/murid/karya" },
          ]}
        />
      </section>

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
                    <BadgeIcon
                      icon={l.icon}
                      alt={l.name}
                      size={40}
                      className={`object-contain ${l.unlocked ? "" : "grayscale opacity-30"}`}
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

          {/* Komunitas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-sm">
                  <Users size={12} className="text-white" />
                </span>
                Komunitas
              </h3>
              <Link href="/arena/player/leaderboard" className="text-[11px] font-bold text-violet-600 hover:underline">
                Papan Peringkat →
              </Link>
            </div>

            {social ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <div className="flex -space-x-2 mb-1.5">
                      {(social.followers ?? []).slice(0, 4).map(f => (
                        <Link key={f.id} href={`/profile/${f.id}`} title={f.displayName}>
                          <UserAvatar size={28} avatar={f.avatar} initials={f.displayName[0]} className="ring-2 ring-white" />
                        </Link>
                      ))}
                      {social.followers?.length === 0 && <p className="text-[10px] text-gray-400">Belum ada</p>}
                    </div>
                    <p className="text-[11px] font-semibold text-gray-700">
                      {social.followerCount} Pengikut
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <div className="flex -space-x-2 mb-1.5">
                      {(social.following ?? []).slice(0, 4).map(f => (
                        <Link key={f.id} href={`/profile/${f.id}`} title={f.displayName}>
                          <UserAvatar size={28} avatar={f.avatar} initials={f.displayName[0]} className="ring-2 ring-white" />
                        </Link>
                      ))}
                      {social.following?.length === 0 && <p className="text-[10px] text-gray-400">Belum ada</p>}
                    </div>
                    <p className="text-[11px] font-semibold text-gray-700">
                      {social.followingCount} Mengikuti
                    </p>
                  </div>
                </div>
                {social.profileLikeCount > 0 && (
                  <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1">
                    <IconHeart size={11} /> Profilmu disukai {social.profileLikeCount} murid
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Ikuti murid lain dan temukan teman menulis. Fitur aktif setelah
                migrasi tabel Follow dijalankan.
              </p>
            )}

            {playerProfile && (
              <div className="flex items-center justify-between mt-3 rounded-xl bg-violet-50 border border-violet-100 px-3 py-2">
                <p className="text-[11px] font-semibold text-violet-700">
                  {playerProfile.weeklyXp.toLocaleString("id-ID")} XP minggu ini
                </p>
                <span className="text-[10px] text-violet-400">{playerProfile.weeklyLabel}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right - Karya */}
        <div className="md:col-span-2 space-y-4">
          {/* Aktivitas terbaru */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <History size={12} className="text-white" />
                </span>
                Aktivitas
              </h3>
              <Link href="/arena/player/history?tab=xp" className="text-[11px] font-bold text-violet-600 hover:underline">
                Riwayat XP →
              </Link>
            </div>

            {xpHistory.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-3">
                Belum ada aktivitas. Ayo main jalur cerdas atau tulis karya!
              </p>
            ) : (
              <div className="space-y-2">
                {xpHistory.slice(0, 5).map(h => (
                  <div key={h.id} className="flex items-center gap-2.5 text-xs">
                    <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black shrink-0">
                      +{h.amount}
                    </span>
                    <span className="text-gray-700 font-medium truncate">{h.sourceLabel}</span>
                    <span className="ml-auto text-gray-400 shrink-0">{waktuLalu(h.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

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

          {/* Filter jenis karya */}
          {karyaList.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {["SEMUA", ...Array.from(new Set(karyaList.map(k => k.type)))].map(t => (
                <button
                  key={t}
                  onClick={() => setKaryaFilter(t)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    karyaFilter === t
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {t === "SEMUA" ? "Semua" : TYPE_META[t]?.label || t}
                </button>
              ))}
            </div>
          )}

          {karyaList.length === 0 ? (
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-8 text-center border border-violet-100">
              <IconPen size={32} className="mx-auto text-violet-300 mb-2" />
              <p className="text-sm text-gray-500">Belum ada karya. Mulai menulis!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {karyaList.filter(k => karyaFilter === "SEMUA" || k.type === karyaFilter).map(k => {
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

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-violet-200 text-violet-700 hover:border-violet-400 hover:bg-violet-50 transition-all text-sm font-medium disabled:opacity-50"
                >
                  {uploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                  {uploadingAvatar ? "Mengupload..." : "Upload Foto Sendiri"}
                </button>
                <input
                  ref={avatarFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                {avatarSrc && !avatarSrc.includes("dicebear") && (
                  <button
                    type="button"
                    onClick={() => setAvatarSrc(null)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Hapus
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 -mt-1">Klik untuk upload dari galeri HP atau file laptop</p>

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
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. Absensi</label>
                  <Input value={settingsForm.noAbsen} onChange={e => setSettingsForm(p => ({ ...p, noAbsen: e.target.value }))} placeholder="cth: 17" className="h-11 rounded-xl" />
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
