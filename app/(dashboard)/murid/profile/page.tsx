"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Settings, X, Camera, Save, CheckCircle2, AlertCircle, LogOut, Loader2,
  Award, History, Pencil, BookOpen, ChevronRight, TrendingUp,
} from "lucide-react";
import "@/app/arena/player-theme.css";
import { IconFlame, IconPen } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarPicker } from "@/components/murid/AvatarPicker";
import { createClient } from "@/lib/supabase/client";
import { defaultNicknameFromFullName, NICKNAME_MAX_LENGTH } from "@/lib/nickname";
import { getLevelProgress, levelFromXp } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";
import type { PlayerProfileView, XpHistoryEntryView, BadgeView } from "@/lib/gamification/client-types";
import type { LearnerSkillState } from "@/lib/learner-state/types";
import ProfileHero, { type HeroSocial } from "@/components/profile/ProfileHero";
import PlayerStatusBar from "@/components/profile/PlayerStatusBar";
import PlayerStatsGrid from "@/components/profile/PlayerStatsGrid";
import ActivityFeed, { type FeedEvent } from "@/components/profile/ActivityFeed";
import AchievementShowcase from "@/components/profile/AchievementShowcase";
import FeaturedWorksGallery from "@/components/profile/FeaturedWorksGallery";
import SocialConnections from "@/components/profile/SocialConnections";
import BadgeShowcasePanel from "@/components/profile/BadgeShowcasePanel";
import ActivityChart, { type ChartDay } from "@/components/profile/ActivityChart";
import SkillRadar from "@/components/arena/player/SkillRadar";

interface UserData {
  id: string; fullName: string; nickname?: string | null; xp: number; level: number; streak: number;
  league: string; avatar?: string; coins: number; totalLikes: number; totalViews: number;
  school?: string; city?: string; province?: string; grade?: string; noAbsen?: string; bio?: string; email?: string;
  equippedFrame?: string | null; equippedNameColor?: string | null; equippedBadge?: string | null;
  equippedBackground?: string | null; equippedNameplate?: string | null;
  createdAt?: string;
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

interface JourneyEntry {
  id: string;
  dayKey: string;
  createdAt: string;
  title?: string | null;
}

const WIB_OFFSET_MS = 7 * 3600 * 1000;

function wibKey(d: Date): string {
  return new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

// Label waktu singkat (relatif) untuk baris perjalanan belajar — data nyata.
function waktuLaluLite(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "baru saja";
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d === 1) return "kemarin";
  if (d < 30) return `${d} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(iso));
}

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

const KEBUN_LEVELS = [
  { level: 0, label: "Tidak menulis", color: "bg-emerald-100" },
  { level: 1, label: "1 kata", color: "bg-emerald-200" },
  { level: 2, label: "2 kata", color: "bg-emerald-300" },
  { level: 3, label: "3-4 kata", color: "bg-emerald-500" },
  { level: 4, label: "5+ kata", color: "bg-emerald-600" },
];

// 30 hari terakhir (zona WIB): preferensi aktivitas belajar (journey),
// fallback karya per hari. Selalu berisi kunci nyata, tanpa angka karangan.
function buildChartDays(journey: JourneyEntry[], karyaList: KaryaItem[]): { days: ChartDay[]; mode: "AKTIVITAS" | "KARYA" } {
  const keys: string[] = [];
  for (let i = 29; i >= 0; i--) keys.push(wibKey(new Date(Date.now() - i * 86400000)));
  const days: ChartDay[] = keys.map((dayKey) => ({ dayKey, count: 0 }));

  const usableJourney = journey.length > 0;
  if (usableJourney) {
    for (const e of journey) {
      const hit = days.find((d) => d.dayKey === e.dayKey);
      if (hit) hit.count += 1;
    }
  } else {
    for (const k of karyaList) {
      const hit = days.find((d) => d.dayKey === k.createdAt.slice(0, 10));
      if (hit) hit.count += 1;
    }
  }
  return { days, mode: usableJourney ? "AKTIVITAS" : "KARYA" };
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
  const [showcaseBadges, setShowcaseBadges] = useState<BadgeView[] | null>(null);
  const [journey, setJourney] = useState<JourneyEntry[]>([]);
  const [skills, setSkills] = useState<LearnerSkillState[] | null>(null);
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
          // Statistik sosial (pengikut/mengikuti/like profil) — best-effort,
          // UI tetap hidup bila tabel belum migrasi, TAPI kegagalan tidak
          // disamarkan sebagai data valid: di-log agar "0" yang tampil jelas
          // berasal dari request gagal, bukan nol asli dari database.
          try {
            const socRes = await fetch(`/api/user/profile/${me.id}/social`);
            if (socRes.ok) {
              setSocial(await socRes.json());
            } else {
              console.warn(
                `Statistik sosial gagal (HTTP ${socRes.status}) untuk profil ${me.id} — jalankan migrasi 2026-08-10_profile_follow.sql bila tabel Follow/ProfileLike belum ada`
              );
            }
          } catch (e) {
            console.error("Gagal memuat statistik sosial", e);
          }
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

  // Data pemain + aktivitas + lencana showcase + perjalanan belajar + skill — best-effort.
  useEffect(() => {
    Promise.all([
      fetch("/api/player/profile").then(r => r.ok ? r.json() : null),
      fetch("/api/player/xp/history?limit=5").then(r => r.ok ? r.json() : null),
      fetch("/api/player/badges").then(r => r.ok ? r.json() : null),
      fetch("/api/player/journey?limit=100").then(r => r.ok ? r.json() : null),
      fetch("/api/player/skills").then(r => r.ok ? r.json() : null),
    ]).then(([pp, xh, bd, jr, sk]) => {
      if (pp?.profile) setPlayerProfile(pp.profile);
      if (xh?.entries) setXpHistory(xh.entries);
      if (bd?.badges) setShowcaseBadges(bd.badges);
      if (jr?.entries) setJourney(jr.entries);
      if (sk?.skills) setSkills(sk.skills);
    }).catch(() => {});
  }, []);

  const [settingsForm, setSettingsForm] = useState({ fullName: "", school: "", city: "", province: "", grade: "", noAbsen: "", bio: "" });
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");

  const openSettings = () => {
    if (!user) return;
    setSettingsForm({ fullName: user.fullName, school: user.school || "", city: user.city || "", province: user.province || "", grade: user.grade || "", noAbsen: user.noAbsen || "", bio: user.bio || "" });
    setAvatarSrc(user.avatar || null);
    setSettingsMessage(null);
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
    return <div className="text-center py-20 text-gray-500 dark:text-slate-400">Gagal memuat profil. Silakan refresh.</div>;
  }

  const playerLevel = levelFromXp(user.xp || 0);
  const playerRank = rankFromLevel(playerLevel);
  const displayNickname = user.nickname || user.fullName;
  const levelProgress = getLevelProgress(user.xp || 0);
  const streakLive = isStreakLive(meta?.kebunKata);

  const nextBadge = meta?.lencana
    .filter(l => !l.unlocked)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)[0];

  const unlockedBadges = (showcaseBadges ?? []).filter(b => b.unlocked);

  const events: FeedEvent[] = [
    ...xpHistory.map(h => ({
      id: `xp-${h.id}`,
      kind: "XP" as const,
      title: h.sourceLabel,
      amount: h.amount,
      xp: true,
      createdAt: h.createdAt,
    })),
    ...karyaList.slice(0, 3).map(k => ({
      id: `karya-${k.id}`,
      kind: "KARYA" as const,
      title: "Menerbitkan karya baru",
      detail: k.title,
      createdAt: k.createdAt,
    })),
  ];

  const { days: chartDays, mode: chartMode } = buildChartDays(journey, karyaList);
  const jalurEntries = journey.slice(0, 5);
  const totalKarya30 = karyaList.filter(k => {
    const key = k.createdAt.slice(0, 10);
    return chartDays.length > 0 && key >= chartDays[0].dayKey;
  }).length;
  const totalAktivitas30 = chartDays.reduce((sum, d) => sum + d.count, 0);

  const sosialProps = social
    ? {
        followerCount: social.followerCount,
        followingCount: social.followingCount,
        followers: (social.followers ?? []).map(f => ({ id: f.id, displayName: f.displayName, avatar: f.avatar })),
        following: (social.following ?? []).map(f => ({ id: f.id, displayName: f.displayName, avatar: f.avatar })),
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 md:px-6 lg:px-8">
      <style>{`
        @keyframes profile-flame{0%,100%{transform:scale(1) rotate(-2deg)}50%{transform:scale(1.12) rotate(2deg)}}
        @keyframes profile-badge-pop{0%{transform:scale(0)}70%{transform:scale(1.15)}100%{transform:scale(1)}}
        .profile-flame-live{animation:profile-flame 1.1s ease-in-out infinite}
        .profile-badge-unlocked{animation:profile-badge-pop .4s ease}
      `}</style>

      {/* PLAYER CARD — hero premium: identitas + rank crest + XP + aksi.
          Kartu Total Like menyatu bila data tersedia. */}
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
          equippedNameplate: user.equippedNameplate,
          equippedBackground: user.equippedBackground,
          bio: user.bio ?? null,
          level: playerLevel,
          xp: user.xp || 0,
          levelProgress,
          streak: user.streak ?? 0,
          gelar: meta?.gelar ?? null,
          memberNumber: meta?.memberNumber ?? null,
          joinedAt: user.createdAt ?? null,
        }}
        rank={playerRank}
        // Statistik sosial (pengikut/mengikuti) dan Total Like tampil di
        // PlayerStatsGrid — satu sumber angka, hero tetap ringkas.
        social={null}
        isOwn
        onEditProfile={openSettings}
        likeSummary={null}
      />

      {/* HUD status pemain — Level/XP/Koin/Streak/Rank + strip lencana */}
      <PlayerStatusBar
        level={playerLevel}
        xp={user.xp || 0}
        coins={user.coins || 0}
        streak={user.streak ?? 0}
        rank={playerRank}
        badges={unlockedBadges}
        totalUnlocked={unlockedBadges.length}
        badgesHref="/arena/player/badges"
      />

      {/* PERKEMBANGANMU — skill bahasa + perjalanan belajar (data nyata) */}
      <section aria-label="Perkembanganmu" className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-violet-600 dark:text-violet-300" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white/90">Perkembanganmu</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Kemampuan bahasa — dari /api/player/skills (reuse SkillRadar beranda) */}
          <div className="bc-card-premium overflow-hidden rounded-2xl ring-1 ring-slate-900/10 dark:ring-white/10">
            <SkillRadar skills={skills} className="h-full" />
          </div>

          {/* Jalur Cerdas — aktivitas belajar terbaru dari journey + CTA */}
          <div className="bc-card-premium flex flex-col rounded-2xl p-5 ring-1 ring-slate-900/10 dark:ring-white/10">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white/90 inline-flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-sm">
                  <BookOpen size={13} className="text-white" />
                </span>
                Jalur Cerdas
              </h3>
              <Link href="/arena/jalur-cerdas" className="text-[11px] font-semibold text-slate-900/55 dark:text-white/55 hover:text-slate-900 dark:text-white transition-colors">
                Buka →
              </Link>
            </div>
            {jalurEntries.length > 0 ? (
              <ul className="min-w-0 flex-1 divide-y divide-slate-900/[0.06] dark:divide-white/[0.06]">
                {jalurEntries.map((e) => (
                  <li key={e.id} className="flex items-center gap-2.5 py-1.5">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500/60" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-900/85 dark:text-white/85">
                      {e.title || "Belajar"}
                    </span>
                    <time className="shrink-0 text-[10px] text-slate-900/50 dark:text-white/40">
                      {waktuLaluLite(e.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex-1 text-xs leading-relaxed text-slate-900/60 dark:text-white/45">
                Mulai belajar di Jalur Cerdas agar langkah belajarmu tercatat di sini.
              </p>
            )}
            <Link
              href="/arena/jalur-cerdas"
              className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 text-[13px] font-bold text-white shadow-md transition-all hover:shadow-lg"
            >
              Lanjutkan Belajar <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Pencapaian terbaru — lencana asli (dari /api/player/badges, best-effort) */}
      {showcaseBadges !== null && (
        <section
          className="bc-card-premium mb-6 rounded-2xl p-5 ring-1 ring-slate-900/10 dark:ring-white/10"

        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white/90 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                <Award size={13} className="text-slate-900 dark:text-white" />
              </span>
              Pencapaian Terkini
            </h3>
            <Link href="/arena/player/badges" className="text-[11px] font-semibold text-slate-900/55 dark:text-white/55 hover:text-slate-900 dark:text-white transition-colors">
              Lihat Semua →
            </Link>
          </div>
          {showcaseBadges.some((b) => b.unlocked) ? (
            <AchievementShowcase badges={showcaseBadges} max={6} />
          ) : (
            <p className="text-[13px] text-slate-900/60 dark:text-white/55 leading-relaxed">
              Belum ada lencana. Selesaikan latihan di Jalur Cerdas, ikuti tantangan di Arena,
              dan kumpulkan karya untuk membuka lencana pertamamu.
            </p>
          )}
        </section>
      )}

      {/* GRID DESKTOP 2 KOLOM — main konten + sidebar identitas (≥1024px) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* MAIN — statistik, aktivitas, grafik, galeri karya */}
        <div className="space-y-6 min-w-0 md:col-span-2 lg:col-span-1">
          <PlayerStatsGrid
            stats={[
              { key: "karya", label: "Karya", value: meta?.stats.karyaCount ?? karyaList.length, icon: "book", href: "/murid/karya" },
              // LIKE = like PROFIL (ProfileLike targetId = user), konsisten
              // dengan tombol Suka di profil publik & likeNote pada
              // SocialConnections. Fallback legacy `user.totalLikes` (like
              // karya) hanya dipakai saat request sosial gagal; kegagalan
              // sudah di-log di load() sehingga tidak disamarkan sebagai 0.
              { key: "like", label: "Like", value: social ? social.profileLikeCount : user.totalLikes || 0, icon: "heart", href: "/murid/karya" },
              { key: "follower", label: "Pengikut", value: social?.followerCount ?? 0, icon: "users" },
              { key: "following", label: "Mengikuti", value: social?.followingCount ?? 0, icon: "user" },
            ]}
          />

          {/* Aktivitas terbaru (lebar penuh) */}
          <ActivityFeed
            events={events}
            allHref="/arena/player/history?tab=xp"
            emptyText="Belum ada aktivitas. Ayo main Jalur Cerdas atau tulis karya!"
          />

          {/* Aktivitas 30 hari — grafik nyata (journey / karya per hari) */}
          <ActivityChart
            days={chartDays}
            mode={chartMode}
            totalKarya30={totalKarya30}
            totalAktivitas30={totalAktivitas30}
          />

          {/* Galeri karya unggulan */}
          <FeaturedWorksGallery
            karyaList={karyaList}
            filter={karyaFilter}
            onFilterChange={setKaryaFilter}
            onDelete={handleDeleteKarya}
            titleHref="/murid/karya"
            tulisHref="/murid/karya/tulis"
            emptyText="Belum ada karya. Mulai menulis!"
          />
        </div>

        {/* SIDEBAR — kebun kata, komunitas, lencana (sticky di desktop) */}
        <div className="space-y-6 min-w-0 md:col-span-2 lg:col-span-1 lg:sticky lg:top-6">
          {/* Kebun Kata — naik ke atas sidebar (glance social widget) */}
          {meta && (
            <div
              className="bc-card-premium rounded-2xl p-4 ring-1 ring-slate-900/10 dark:ring-white/10"

            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white/90 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
                    <IconPen size={12} className="text-slate-900 dark:text-white" />
                  </span>
                  Kebun Kata
                </h3>
                {streakLive && user.streak > 0 && (
                  <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300 bg-orange-400/10 rounded-full px-2 py-0.5 flex items-center gap-1 ring-1 ring-orange-300/20">
                    <IconFlame size={10} className="profile-flame-live" /> {user.streak} hari beruntun
                  </span>
                )}
              </div>
              <div className="grid grid-cols-10 gap-1">
                {meta.kebunKata.slice(-30).map((d, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-[3px] ${KEBUN_LEVELS[d.level].color} opacity-80 hover:opacity-100 hover:ring-2 hover:ring-emerald-300 transition-all`}
                    title={`${new Date(d.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} — ${KEBUN_LEVELS[d.level].label}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-900/55 dark:text-white/40">
                <span>Sedikit</span>
                {KEBUN_LEVELS.map(k => (
                  <span key={k.level} className={`w-2.5 h-2.5 rounded-[2px] ${k.color} inline-block`} />
                ))}
                <span>Banyak</span>
              </div>
            </div>
          )}

          {/* Komunitas — pengikut & yang diikuti + XP mingguan */}
          {sosialProps ? (
            <SocialConnections
              {...sosialProps}
              onView={(p) => { window.location.href = `/profile/${p.id}`; }}
              weeklyXp={playerProfile?.weeklyXp ?? undefined}
              weeklyLabel={playerProfile?.weeklyLabel}
              leaderboardHref="/arena/player/leaderboard"
              likeNote={
                social && social.profileLikeCount > 0
                  ? `Profilmu disukai ${social.profileLikeCount} murid`
                  : null
              }
            />
          ) : (
            <div
              className="bc-card-premium rounded-2xl p-5 ring-1 ring-slate-900/10 dark:ring-white/10"

            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white/90 mb-1.5">Komunitas</h3>
              <p className="text-xs text-slate-900/60 dark:text-white/45 leading-relaxed">
                Ikuti murid lain dan temukan teman menulis. Fitur aktif setelah
                migrasi tabel Follow dijalankan.
              </p>
            </div>
          )}

          {/* Lencana — progres nyata (dari profile-meta), maks 9 tampil + perluas */}
          {meta && (
            <div
              className="bc-card-premium rounded-2xl p-4 ring-1 ring-slate-900/10 dark:ring-white/10"

            >
              <BadgeShowcasePanel lencana={meta.lencana} nextBadge={nextBadge} />
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-12 md:pt-20 px-4 overflow-y-auto" onClick={() => setShowSettings(false)}>
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <h2 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <Settings size={18} className="text-violet-600 dark:text-violet-400" />
                Pengaturan Profil
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 dark:text-slate-300 p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {settingsMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                  settingsMessage.type === "success" ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300" : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
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
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-violet-200 text-violet-700 dark:text-violet-300 hover:border-violet-400 hover:bg-violet-50 transition-all text-sm font-medium disabled:opacity-50"
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
                    className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:text-red-300"
                  >
                    Hapus
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">Klik untuk upload dari galeri HP atau file laptop</p>

              <div className="bg-violet-50 dark:bg-violet-950/60 border border-violet-100 dark:border-violet-900 rounded-xl p-3.5">
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Pencil size={14} className="text-violet-500 dark:text-violet-400" /> Nama Panggilan
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={nicknameDraft}
                    onChange={e => setNicknameDraft(e.target.value)}
                    placeholder={defaultNicknameFromFullName(user.fullName)}
                    maxLength={NICKNAME_MAX_LENGTH}
                    className="h-10 text-sm rounded-xl bg-white dark:bg-slate-800/90"
                  />
                  <button
                    onClick={handleSaveNickname}
                    disabled={savingNickname || nicknameDraft.trim() === (user.nickname || "")}
                    className="px-3 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 text-sm shrink-0"
                  >
                    {savingNickname ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  </button>
                </div>
                {nicknameError && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{nicknameError}</p>}
                {meta && meta.nickname.daysLeftForChange > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ganti lagi dalam {meta.nickname.daysLeftForChange} hari</p>
                )}
                {user.nickname && (
                  <button onClick={loadNicknameHistory} className="text-xs text-violet-600 hover:text-violet-700 dark:text-violet-300 mt-2 flex items-center gap-1">
                    <History size={12} /> Riwayat perubahan
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                <Input value={settingsForm.fullName} onChange={e => setSettingsForm(p => ({ ...p, fullName: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Sekolah</label>
                  <Input value={settingsForm.school} onChange={e => setSettingsForm(p => ({ ...p, school: e.target.value }))} className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Kelas</label>
                  <Input value={settingsForm.grade} onChange={e => setSettingsForm(p => ({ ...p, grade: e.target.value }))} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">No. Absensi</label>
                  <Input value={settingsForm.noAbsen} onChange={e => setSettingsForm(p => ({ ...p, noAbsen: e.target.value }))} placeholder="cth: 17" className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Provinsi</label>
                  <Input value={settingsForm.province} onChange={e => setSettingsForm(p => ({ ...p, province: e.target.value }))} className="h-11 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Bio</label>
                <textarea value={settingsForm.bio} onChange={e => setSettingsForm(p => ({ ...p, bio: e.target.value }))} rows={3} className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
              </div>
              <Button onClick={handleSettingsSave} disabled={savingSettings} className="w-full bg-violet-600 hover:bg-violet-700 text-white h-11 rounded-xl font-bold">
                {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Simpan Perubahan
              </Button>
            </div>
            <div className="border-t border-gray-100 dark:border-slate-800 p-5 space-y-2">
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-300 font-medium">
                <LogOut size={16} /> Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nickname History Modal */}
      {showNicknameHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-12 md:pt-20 px-4 overflow-y-auto" onClick={() => setShowNicknameHistory(false)}>
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <h2 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <History size={18} className="text-violet-600 dark:text-violet-400" />
                Riwayat Nama Panggilan
              </h2>
              <button onClick={() => setShowNicknameHistory(false)} className="text-gray-400 hover:text-gray-600 dark:text-slate-300 p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 max-h-80 overflow-y-auto">
              {nicknameHistory.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Belum ada riwayat perubahan.</p>
              ) : (
                <div className="space-y-3">
                  {nicknameHistory.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 line-through">{r.oldNickname || "(kosong)"}</span>
                        <span className="mx-2 text-gray-300">→</span>
                        <span className="font-semibold text-gray-900 dark:text-slate-100">{r.newNickname || "(direset)"}</span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(r.changedAt).toLocaleDateString("id-ID")}</span>
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