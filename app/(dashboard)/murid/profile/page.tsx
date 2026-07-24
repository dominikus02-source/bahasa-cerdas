"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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

interface UserData {
  id: string; fullName: string; nickname?: string | null; xp: number; level: number; streak: number;
  league: string; avatar?: string; coins: number; totalLikes: number; totalViews: number;
  school?: string; city?: string; province?: string; grade?: string; bio?: string; email?: string;
}

interface KaryaItem {
  id: string; title: string; type: string; likesCount: number; viewsCount: number;
  excerpt?: string; createdAt: string; isFeatured?: boolean;
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
  SILVER: { label: "Perak", gradient: "from-gray-300 to-gray-500", ring: "ring-gray-300", glow: "shadow-gray-200" },
  GOLD: { label: "Emas", gradient: "from-yellow-400 to-amber-500", ring: "ring-yellow-400", glow: "shadow-yellow-200" },
  DIAMOND: { label: "Berlian", gradient: "from-cyan-400 to-blue-500", ring: "ring-cyan-400", glow: "shadow-cyan-200" },
};

const KEBUN_LEVEL_BG: Record<number, string> = {
  0: "bg-gray-100",
  1: "bg-violet-200",
  2: "bg-violet-400",
  3: "bg-violet-600",
  4: "bg-fuchsia-600",
};

export default function MuridProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [karyaList, setKaryaList] = useState<KaryaItem[]>([]);
  const [meta, setMeta] = useState<ProfileMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"etalase" | "lencana">("etalase");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  // Settings modal (Pengaturan merged into Profil, opened via gear icon)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    fullName: "", email: "", bio: "", avatarUrl: "", school: "", city: "", province: "", grade: "",
  });

  // Nama panggilan (nickname) editor
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameMsg, setNicknameMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<NicknameHistoryRow[]>([]);

  const supabase = createClient();

  const fetchProfile = async () => {
    const res = await fetch("/api/user/me");
    const d = await res.json();
    if (d?.user) {
      setUser(d.user);
      setForm({
        fullName: d.user.fullName || "",
        email: d.user.email || "",
        bio: d.user.bio || "",
        avatarUrl: d.user.avatar || "",
        school: d.user.school || "",
        city: d.user.city || "",
        province: d.user.province || "",
        grade: d.user.grade || "",
      });
      if (d.user.email === "dominikus.wahyu@lajoex.com") setIsPremium(true);

      const userId = d.user.userId || d.user.id;
      if (userId) {
        const [kRes, mRes] = await Promise.all([
          fetch(`/api/siswa/user/${userId}/karya?limit=24`),
          fetch("/api/murid/profile-meta"),
        ]);
        const kData = await kRes.json();
        const mData = await mRes.json();
        setKaryaList(kData.karya || []);
        if (!mData?.error) {
          setMeta(mData);
          setNicknameDraft(mData.nickname?.value || "");
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchProfile(); }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/murid/nickname");
      const d = await res.json();
      setHistory(d.history || []);
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && history.length === 0) loadHistory();
  };

  const handleSaveNickname = async () => {
    setNicknameSaving(true);
    setNicknameMsg(null);
    try {
      const res = await fetch("/api/murid/nickname", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nicknameDraft }),
      });
      const d = await res.json();
      if (!res.ok) {
        setNicknameMsg({ type: "error", text: d.error || "Gagal menyimpan nama panggilan." });
      } else {
        setNicknameMsg({ type: "success", text: "Nama panggilan disimpan." });
        setMeta((prev) => prev ? { ...prev, nickname: { value: d.nickname, updatedAt: d.nicknameUpdatedAt, daysLeftForChange: 30 } } : prev);
        setUser((prev) => prev ? { ...prev, nickname: d.nickname } : prev);
        setHistory([]);
      }
    } catch {
      setNicknameMsg({ type: "error", text: "Terjadi kesalahan. Coba lagi." });
    } finally {
      setNicknameSaving(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMsg(null);
    try {
      const result = await supabase.auth.updateUser({
        data: {
          full_name: form.fullName, bio: form.bio, avatar_url: form.avatarUrl,
          school: form.school, city: form.city, province: form.province, grade: form.grade,
        },
      });
      if (result.error) throw result.error;

      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName, avatar: form.avatarUrl || null, bio: form.bio,
          school: form.school, city: form.city, province: form.province, grade: form.grade,
        }),
      });

      setUser((prev) => prev ? { ...prev, ...form, avatar: form.avatarUrl } : prev);
      setSettingsMsg({ type: "success", text: "Profil berhasil diperbarui!" });
    } catch (error: any) {
      setSettingsMsg({ type: "error", text: error.message || "Gagal menyimpan." });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSettingsLoading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const uploadResult = await supabase.storage.from("avatars").upload(fileName, file);
      if (uploadResult.error) throw uploadResult.error;
      const urlResult = supabase.storage.from("avatars").getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, avatarUrl: urlResult.data.publicUrl }));
      setSettingsMsg({ type: "success", text: "Foto berhasil diupload!" });
    } catch (error: any) {
      setSettingsMsg({ type: "error", text: error.message });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleShare = async () => {
    if (!user) return;
    const url = `${window.location.origin}/profile/${user.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Kartu Penulis — ${user.fullName}`, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setSettingsMsg({ type: "success", text: "Tautan profil disalin!" });
    }
  };

  const league = LEAGUE_META[user?.league as keyof typeof LEAGUE_META] || LEAGUE_META.BRONZE;
  const nicknameLivePreview = nicknameDraft.trim() ? validateNicknameFormat(nicknameDraft) : null;
  const daysLeft = meta?.nickname?.daysLeftForChange ?? 0;
  const effectiveNickname = meta?.nickname?.value?.trim() || (user ? defaultNicknameFromFullName(user.fullName) : "");

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
          {!!user?.streak && (
            <span className="absolute -right-1 -bottom-1 flex items-center gap-0.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow">
              🔥{user.streak}
            </span>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900 mt-3">{user?.fullName}</h1>

        {/* Gelar + Member number */}
        <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
            {meta?.gelar || "Penulis Pemula"}
          </span>
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-mono font-semibold bg-gray-50 text-gray-500 border border-gray-200">
            Penulis {meta?.memberNumber || ""}
          </span>
        </div>

        {/* Nama panggilan */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-violet-600 transition-colors"
        >
          Dikenal teman sekelas sebagai <span className="font-semibold text-gray-600">{effectiveNickname}</span>
          <Pencil size={11} />
        </button>

        {/* School + City */}
        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
          {user?.school && (
            <span className="flex items-center gap-1"><IconSchool size={14} className="text-violet-400" />{user.school}</span>
          )}
          {user?.city && (
            <span className="flex items-center gap-1"><IconLocation size={14} className="text-violet-400" />{user.city}</span>
          )}
        </div>

        {/* League + Level */}
        <div className="flex items-center gap-2 mt-2">
          <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r ${league.gradient} text-white`}>
            <IconTarget size={12} />{league.label}
          </span>
          <span className="text-xs text-gray-300">·</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-600">
            Level {user?.level || 1}
          </span>
        </div>

        {user?.bio && (
          <p className="text-sm text-gray-500 mt-3 text-center max-w-md leading-relaxed">{user.bio}</p>
        )}
      </div>

      {/* ═══ STATS BAR ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-y-3 divide-x divide-gray-100 sm:divide-x">
          {[
            { value: meta?.stats.karyaCount ?? karyaList.length, label: "Karya", icon: <IconPen size={16} className="text-violet-500" /> },
            { value: meta?.stats.totalLikes ?? user?.totalLikes ?? 0, label: "Disukai", icon: <IconHeart size={16} className="text-violet-500" /> },
            { value: meta?.stats.totalViews ?? user?.totalViews ?? 0, label: "Dilihat", icon: <IconEye size={16} className="text-violet-500" /> },
            { value: meta?.stats.wordCount?.toLocaleString() ?? 0, label: "Kata", icon: <span className="text-sm">📝</span> },
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
        <button onClick={() => setSettingsOpen(true)} className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all">
          <Settings size={18} />
        </button>
      </div>

      {/* ═══ KEBUN KATA ═══ */}
      {meta && (
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-900">Kebun Kata</h2>
            <span className="text-[11px] text-gray-400">91 hari terakhir</span>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-[3px]">
              {meta.kebunKata.map((cell) => (
                <div key={cell.date} title={cell.date} className={`aspect-square rounded-sm ${KEBUN_LEVEL_BG[cell.level]}`} />
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-[10px] text-gray-400">
              <span>Sepi</span>
              {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`w-2.5 h-2.5 rounded-sm ${KEBUN_LEVEL_BG[l]}`} />)}
              <span>Subur</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TABS ═══ */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        <button onClick={() => setActiveTab("etalase")} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "etalase" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
          <IconPen size={14} /> Etalase
        </button>
        <button onClick={() => setActiveTab("lencana")} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "lencana" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
          <Award size={14} /> Lencana
        </button>
      </div>

      {/* ═══ ETALASE ═══ */}
      {activeTab === "etalase" && (
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

              const handleDelete = async (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (!confirm(`Hapus "${k.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
                setDeletingId(k.id);
                const res = await fetch(`/api/siswa/karya/${k.id}`, { method: "DELETE" });
                if (res.ok) {
                  setKaryaList(prev => prev.filter(item => item.id !== k.id));
                } else {
                  alert("Gagal menghapus karya.");
                }
                setDeletingId(null);
              };

              return (
                <div key={k.id} className="relative group bg-white rounded-xl border border-gray-100 hover:shadow-lg hover:border-violet-200 transition-all overflow-hidden">
                  <Link href={`/murid/karya/${k.id}`} className="block p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.badge}`}>{m.label}</span>
                      {k.isFeatured && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">★ Pilihan</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug group-hover:text-violet-700 transition-colors mb-2">
                      {k.title}
                    </h3>
                    <p className="text-[11px] text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                      {k.excerpt?.slice(0, 80)}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-2 border-t border-gray-50">
                      <span className="flex items-center gap-1"><IconHeart size={10} />{k.likesCount}</span>
                      <span className="flex items-center gap-1"><IconEye size={10} />{k.viewsCount}</span>
                      <span className="flex items-center gap-1 ml-auto"><IconClock size={10} />{new Date(k.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                    </div>
                  </Link>
                  <button onClick={handleDelete} disabled={deletingId === k.id}
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-100"
                  >
                    {deletingId === k.id ? (
                      <div className="animate-spin w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full" />
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ))}

      {/* ═══ LENCANA ═══ */}
      {activeTab === "lencana" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(meta?.lencana || []).map((b) => (
            <div key={b.id} className={`rounded-2xl border p-3 text-center ${b.unlocked ? "bg-white border-gray-100 shadow-sm" : "bg-gray-50 border-gray-100"}`}>
              <div className={`text-2xl leading-none ${b.unlocked ? "" : "grayscale opacity-40"}`}>{b.icon}</div>
              <p className={`text-[10px] font-semibold mt-1.5 leading-tight ${b.unlocked ? "text-gray-800" : "text-gray-400"}`}>{b.name}</p>
              {b.unlocked ? (
                <p className="text-[9px] text-amber-500 mt-1 font-semibold">{b.rarityLabel}</p>
              ) : (
                <>
                  <div className="h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-violet-400" style={{ width: `${Math.min(100, (b.progress / b.target) * 100)}%` }} />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">{b.progress.toLocaleString()} / {b.target.toLocaleString()}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ SHARE ═══ */}
      <button onClick={handleShare} className="w-full mt-8 mb-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
        <Share2 size={15} /> Bagikan Kartu Penulis
      </button>

      {/* ═══ SETTINGS MODAL (Pengaturan, merged) ═══ */}
      <Modal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title="Pengaturan Akun" className="max-w-xl max-h-[85vh] overflow-y-auto">
        {settingsMsg && (
          <div className={`mb-4 flex items-center gap-3 p-4 rounded-xl border ${settingsMsg.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
            {settingsMsg.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="font-medium text-sm">{settingsMsg.text}</span>
          </div>
        )}

        {/* Nama Panggilan */}
        <div className="mb-6 p-4 rounded-xl border border-violet-100 bg-violet-50/50">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-1">
            <UserIcon className="w-4 h-4 text-violet-600" /> Nama Panggilan
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Nama ini yang dilihat teman sekelas & papan sekolah. Guru, rapor, dan dokumen tetap memakai nama aslimu.
          </p>

          <Input
            value={nicknameDraft}
            onChange={(e) => setNicknameDraft(e.target.value)}
            maxLength={NICKNAME_MAX_LENGTH}
            placeholder={defaultNicknameFromFullName(form.fullName || user?.fullName || "")}
            disabled={daysLeft > 0}
            className="h-11 rounded-xl bg-white"
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-gray-400">{nicknameDraft.length}/{NICKNAME_MAX_LENGTH} · kosongkan untuk pakai default</span>
          </div>

          {nicknameLivePreview && !nicknameLivePreview.ok && (
            <p className="text-xs text-red-500 mt-1">{nicknameLivePreview.reason}</p>
          )}
          {nicknameMsg && (
            <p className={`text-xs mt-1 ${nicknameMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>{nicknameMsg.text}</p>
          )}
          {daysLeft > 0 && (
            <p className="text-xs text-amber-600 mt-1">Bisa diganti lagi dalam {daysLeft} hari.</p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <Button type="button" size="sm" onClick={handleSaveNickname} disabled={nicknameSaving || daysLeft > 0} className="bg-violet-600 hover:bg-violet-700">
              {nicknameSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Simpan Nama Panggilan"}
            </Button>
            <button type="button" onClick={toggleHistory} className="text-xs text-gray-500 hover:text-violet-600 flex items-center gap-1">
              <History size={12} /> Riwayat
            </button>
          </div>

          {historyOpen && (
            <div className="mt-3 pt-3 border-t border-violet-100">
              {historyLoading ? (
                <p className="text-xs text-gray-400">Memuat...</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-gray-400">Belum pernah diganti.</p>
              ) : (
                <ul className="space-y-1">
                  {history.map((h) => (
                    <li key={h.id} className="text-[11px] text-gray-500">
                      {new Date(h.changedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}: {h.oldNickname || "(default)"} → {h.newNickname || "(default)"}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-violet-600" /> Profil
            </h2>

            <div className="flex items-center gap-6 mb-6">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden border-4 border-white shadow-md">
                  {form.avatarUrl ? (
                    <img src={form.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <UserIcon className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-violet-700 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </div>
              <div className="text-sm text-gray-500">
                <p>JPG, PNG. Maks 2MB</p>
                <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => fileInputRef.current?.click()}>Unggah Foto</Button>
              </div>
            </div>

            <div className="mb-6 pt-5 border-t border-gray-100">
              <AvatarPicker value={form.avatarUrl || null} onChange={(src) => setForm((prev) => ({ ...prev, avatarUrl: src }))} />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Lengkap</label>
                <Input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} className="h-11 rounded-xl" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} type="email" className="h-11 rounded-xl bg-slate-50" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Sekolah</label>
                  <Input value={form.school} onChange={(e) => setForm((p) => ({ ...p, school: e.target.value }))} placeholder="Nama sekolah" className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Kelas</label>
                  <Input value={form.grade} onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))} placeholder="Contoh: X IPA 1" className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Kota/Kabupaten</label>
                  <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Jakarta" className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Provinsi</label>
                  <Input value={form.province} onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))} placeholder="DKI Jakarta" className="h-11 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio Singkat</label>
                <textarea rows={3} value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder="Ceritakan sedikit tentang dirimu..." />
              </div>
            </div>

            <Button type="submit" disabled={settingsLoading} className="w-full mt-6 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl">
              {settingsLoading ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</span>
              ) : (
                <span className="flex items-center gap-2"><Save className="w-4 h-4" />Simpan Perubahan</span>
              )}
            </Button>
          </div>
        </form>

        <div className="space-y-3 mt-6 pt-6 border-t border-gray-100">
          <div className="p-4 flex items-center gap-4 rounded-xl border border-gray-100 cursor-pointer hover:bg-slate-50">
            <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center"><Bell className="h-6 w-6 text-violet-600" /></div>
            <div className="flex-1"><h3 className="font-semibold text-sm">Notifikasi</h3><p className="text-xs text-gray-500">Pengaturan notifikasi push</p></div>
            <span className="text-gray-400">›</span>
          </div>

          {!isPremium && (
            <div className="p-4 flex items-center gap-4 rounded-xl border-2 border-amber-200 bg-amber-50 cursor-pointer hover:bg-amber-100">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center"><Crown className="h-6 w-6 text-white" /></div>
              <div className="flex-1"><h3 className="font-semibold text-sm text-amber-900">Upgrade Premium</h3><p className="text-xs text-amber-700">Akses AI, unlimited video & fitur eksklusif</p></div>
              <span className="text-amber-600">›</span>
            </div>
          )}

          <div onClick={handleLogout} className="p-4 flex items-center gap-4 rounded-xl border-2 border-transparent cursor-pointer hover:bg-red-50 hover:border-red-200">
            <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center"><LogOut className="h-6 w-6 text-red-600" /></div>
            <div className="flex-1"><h3 className="font-semibold text-sm text-red-600">Keluar</h3><p className="text-xs text-gray-500">Log out dari akun</p></div>
            <span className="text-gray-400">›</span>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-200">
            <h3 className="font-semibold text-sm text-violet-700">Ingin membuat kuis dan RPP?</h3>
            <p className="text-xs text-gray-600 mt-1">Daftarkan akun sebagai Guru untuk akses fitur pembuatan konten!</p>
            <Button className="mt-3 bg-emerald-600 hover:bg-emerald-700" size="sm">Daftar sebagai Guru</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
