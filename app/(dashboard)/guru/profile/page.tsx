"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Camera,
  Save,
  X,
  Loader2,
  GraduationCap,
  MapPin,
  BookOpen,
  Award,
  Edit3,
  User,
  Briefcase,
  FileText,
  CheckCircle2,
  Heart,
  Trophy,
  Flame,
  Star,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { levelFromXp } from "@/lib/gamification/levels";
import { rankFromLevel, RANK_META } from "@/lib/gamification/ranks";
import { RankChip } from "@/components/gamification/RankChip";
import { useUserStore } from "@/store";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProfileData {
  id: string;
  fullName: string;
  nickname: string | null;
  email: string;
  avatar: string | null;
  bio: string | null;
  nip: string | null;
  nuptk: string | null;
  school: string | null;
  city: string | null;
  province: string | null;
  subject: string | null;
  grade: string | null;
  xp: number;
  level: number;
  streak: number;
  isPremium: boolean;
  isFounder: boolean;
}

interface Stats {
  totalKarya: number;
  totalSiswa: number;
  totalKuis: number;
  saldo: number;
}

interface FormState {
  fullName: string;
  nickname: string;
  bio: string;
  nip: string;
  nuptk: string;
  school: string;
  city: string;
  province: string;
  subject: string;
  grade: string;
}

const EMPTY_FORM: FormState = {
  fullName: "",
  nickname: "",
  bio: "",
  nip: "",
  nuptk: "",
  school: "",
  city: "",
  province: "",
  subject: "",
  grade: "",
};

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/* Completeness fields (11 total — must match old pengaturan Profile tab) */
const COMPLETENESS_FIELDS: { key: keyof FormState; label: string }[] = [
  { key: "fullName", label: "Nama Lengkap" },
  { key: "nickname", label: "Nama Panggilan" },
  { key: "school", label: "Sekolah" },
  { key: "subject", label: "Mata Pelajaran" },
  { key: "grade", label: "Jenjang" },
  { key: "bio", label: "Bio" },
  { key: "city", label: "Kota" },
  { key: "province", label: "Provinsi" },
  { key: "nip", label: "NIP" },
  { key: "nuptk", label: "NUPTK" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function calcCompleteness(p: ProfileData, hasAvatar: boolean): number {
  let filled = hasAvatar ? 1 : 0;
  for (const f of COMPLETENESS_FIELDS) {
    const val = p[f.key as keyof ProfileData];
    if (val && String(val).trim()) filled++;
  }
  return Math.round((filled / (COMPLETENESS_FIELDS.length + 1)) * 100);
}

function fieldRow(label: string, value: string | null | undefined) {
  if (!value?.trim()) return null;
  return { label, value: value.trim() };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GuruProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({ totalKarya: 0, totalSiswa: 0, totalKuis: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const setUser = useUserStore((s) => s.setUser);

  /* --- fetchers --------------------------------------------------- */

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me");
      if (!res.ok) return;
      const data = await res.json();
      const u = data?.user;
      if (!u) return;
      setProfile({
        id: u.id,
        fullName: u.fullName || "",
        nickname: u.nickname || null,
        email: u.email || "",
        avatar: u.avatar || null,
        bio: u.bio || null,
        nip: u.nip || null,
        nuptk: u.nuptk || null,
        school: u.school || null,
        city: u.city || null,
        province: u.province || null,
        subject: u.subject || null,
        grade: u.grade || null,
        xp: u.xp || 0,
        level: u.level || 1,
        streak: u.streak || 0,
        isPremium: u.isPremium || false,
        isFounder: u.isFounder || false,
      });
    } catch {}
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/guru/dashboard");
      if (res.ok) {
        const d = await res.json();
        setStats({
          totalKarya: d.totalKarya || 0,
          totalSiswa: d.totalSiswa || 0,
          totalKuis: d.totalKuis || 0,
          saldo: d.saldo || 0,
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([fetchProfile(), fetchStats()]).finally(() => setLoading(false));
  }, [fetchProfile, fetchStats]);

  /* --- edit handlers ---------------------------------------------- */

  const startEdit = () => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName || "",
      nickname: profile.nickname || "",
      bio: profile.bio || "",
      nip: profile.nip || "",
      nuptk: profile.nuptk || "",
      school: profile.school || "",
      city: profile.city || "",
      province: profile.province || "",
      subject: profile.subject || "",
      grade: profile.grade || "",
    });
    setEditing(true);
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setMessage(null);
    setAvatarPreview(null);
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setMessage({ type: "error", text: "Format tidak didukung. Gunakan JPG, PNG, atau WebP." });
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setMessage({ type: "error", text: "Ukuran gambar maksimal 5MB." });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setUploadingAvatar(true);
    setMessage(null);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const newAvatarUrl = urlData.publicUrl;

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: newAvatarUrl }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan avatar");

      setProfile((prev) => (prev ? { ...prev, avatar: newAvatarUrl } : prev));
      setUser({ avatar: newAvatarUrl });
      setMessage({ type: "success", text: "Foto profil berhasil diperbarui!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah foto";
      setMessage({ type: "error", text: msg });
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      setMessage({ type: "error", text: "Nama lengkap wajib diisi." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          nickname: form.nickname.trim() || null,
          bio: form.bio.trim() || null,
          nip: form.nip.trim() || null,
          nuptk: form.nuptk.trim() || null,
          school: form.school.trim() || null,
          city: form.city.trim() || null,
          province: form.province.trim() || null,
          subject: form.subject.trim() || null,
          grade: form.grade.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan profil");

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              fullName: form.fullName.trim(),
              nickname: form.nickname.trim() || null,
              bio: form.bio.trim() || null,
              nip: form.nip.trim() || null,
              nuptk: form.nuptk.trim() || null,
              school: form.school.trim() || null,
              city: form.city.trim() || null,
              province: form.province.trim() || null,
              subject: form.subject.trim() || null,
              grade: form.grade.trim() || null,
            }
          : prev
      );
      setUser({ fullName: form.fullName.trim() });
      setEditing(false);
      setMessage({ type: "success", text: "Profil berhasil disimpan!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan profil";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  /* --- derived ----------------------------------------------------- */

  const rank = rankFromLevel(levelFromXp(profile?.xp || 0));
  const rankMeta = RANK_META[rank];
  const initial = (profile?.fullName || "G").charAt(0).toUpperCase();
  const displayAvatar = avatarPreview || profile?.avatar;
  const completeness = useMemo(() => (profile ? calcCompleteness(profile, !!displayAvatar) : 0), [profile, displayAvatar]);

  const profFields = useMemo(() => {
    if (!profile) return [];
    return [
      fieldRow("Sekolah", profile.school),
      fieldRow("Mata Pelajaran", profile.subject),
      fieldRow("Jenjang", profile.grade),
      fieldRow("NIP", profile.nip),
      fieldRow("NUPTK", profile.nuptk),
      fieldRow("Kota", profile.city),
      fieldRow("Provinsi", profile.province),
    ].filter(Boolean) as { label: string; value: string }[];
  }, [profile]);

  /* --- loading / empty states -------------------------------------- */

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        <p>Profil tidak ditemukan.</p>
      </div>
    );
  }

  /* ================================================================= */
  /*  AVATAR SHARED (used in both view & edit)                         */
  /* ================================================================= */

  const avatarBlock = (size: "lg" | "xl") => {
    const dim = size === "xl" ? "w-36 h-36" : "w-28 h-28";
    const textSize = size === "xl" ? "text-5xl" : "text-4xl";
    return (
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={handleAvatarClick}
          className={`group relative ${dim} rounded-full overflow-hidden border-4 border-white shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`}
          aria-label="Ganti foto profil"
        >
          {displayAvatar ? (
            /* eslint-disable-next-line @next/next/no-img-element -- blob URL / external URL */
            <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <span className={`${textSize} font-bold text-white`}>{initial}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <Camera size={size === "xl" ? 24 : 20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
        {uploadingAvatar && (
          <div className={`absolute inset-0 rounded-full bg-black/40 flex items-center justify-center`}>
            <Loader2 size={28} className="text-white animate-spin" />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarChange}
          className="hidden"
          aria-label="Pilih foto profil"
        />
      </div>
    );
  };

  /* ================================================================= */
  /*  VIEW MODE                                                        */
  /* ================================================================= */

  if (!editing) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 pb-24">
        {/* Success toast */}
        {message && (
          <div
            className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
            role="alert"
          >
            <CheckCircle2 size={16} className="shrink-0" />
            {message.text}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          {/* -------- LEFT / MAIN -------- */}
          <div className="space-y-6">
            {/* HERO IDENTITY */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* top accent bar */}
              <div className="h-20 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />

              <div className="px-6 pb-6 -mt-12">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
                  {/* avatar */}
                  <div className="ring-4 ring-white rounded-full shadow-lg">
                    {avatarBlock("xl")}
                  </div>

                  {/* identity text */}
                  <div className="flex-1 text-center sm:text-left pb-1">
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                      {profile.fullName || "Guru"}
                    </h1>
                    {profile.nickname && (
                      <p className="text-sm text-gray-400 mt-0.5">&ldquo;{profile.nickname}&rdquo;</p>
                    )}
                    <p className="text-sm text-emerald-700 font-medium mt-1">
                      Guru {profile.subject || "Bahasa Indonesia"}
                    </p>
                    {(profile.school || profile.city) && (
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2 text-sm text-gray-500">
                        {profile.school && (
                          <span className="flex items-center gap-1">
                            <GraduationCap size={14} className="text-gray-400" />
                            {profile.school}
                          </span>
                        )}
                        {profile.school && profile.city && <span className="text-gray-300">·</span>}
                        {profile.city && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} className="text-gray-400" />
                            {[profile.city, profile.province].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* edit button */}
                  <button
                    type="button"
                    onClick={startEdit}
                    className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  >
                    <Edit3 size={16} />
                    Edit Profil
                  </button>
                </div>

                {/* badges row */}
                {(profile.isFounder || profile.isPremium) && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                    {profile.isFounder && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold border border-amber-200">
                        <Award size={13} /> Founder
                      </span>
                    )}
                    {profile.isPremium && !profile.isFounder && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 rounded-full text-xs font-semibold border border-amber-200">
                        <Star size={13} /> Guru Pro
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* BIO */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Heart size={16} className="text-rose-400" />
                Tentang Saya
              </h2>
              {profile.bio ? (
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{profile.bio}</p>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400 italic mb-3">
                    Tambahkan sedikit cerita tentang dirimu sebagai guru.
                  </p>
                  <button
                    type="button"
                    onClick={startEdit}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    Edit Profil <ChevronRight size={14} className="inline -mt-0.5" />
                  </button>
                </div>
              )}
            </div>

            {/* PROFIL PROFESIONAL */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase size={16} className="text-blue-500" />
                Profil Profesional
              </h2>
              {profFields.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                  {profFields.map((f) => (
                    <div key={f.label} className="flex items-start gap-3 py-1.5">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">
                        {f.label}
                      </span>
                      <span className="text-sm text-gray-800 font-medium">{f.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  Lengkapi profil profesional agar terlihat lebih lengkap.
                </p>
              )}
            </div>
          </div>

          {/* -------- RIGHT / SIDEBAR -------- */}
          <div className="space-y-5">
            {/* COMPLETENESS */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
              <div className="relative inline-flex items-center justify-center mb-3">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke={completeness >= 80 ? "#059669" : completeness >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(completeness / 100) * 213.6} 213.6`}
                  />
                </svg>
                <span className="absolute text-lg font-bold text-gray-900">{completeness}%</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">Kelengkapan Profil</p>
              <p className="text-xs text-gray-400 mt-1">
                {completeness >= 80 ? "Profil sudah lengkap!" : completeness >= 50 ? "Hampir lengkap" : "Lengkapi profil Anda"}
              </p>
            </div>

            {/* STATS */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Trophy size={15} className="text-amber-500" />
                Aktivitas Guru
              </h3>
              <div className="space-y-3">
                {[
                  { icon: FileText, label: "Karya", value: stats.totalKarya, color: "text-violet-600" },
                  { icon: GraduationCap, label: "Siswa", value: stats.totalSiswa, color: "text-blue-600" },
                  { icon: BookOpen, label: "Kuis", value: stats.totalKuis, color: "text-emerald-600" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      <s.icon size={15} className={s.color} />
                      {s.label}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{s.value}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <Wallet size={15} className="text-emerald-600" />
                    Saldo
                  </span>
                  <span className="text-sm font-bold text-emerald-600">
                    Rp{(stats.saldo || 0).toLocaleString("id")}
                  </span>
                </div>
              </div>
            </div>

            {/* RANK & LEVEL */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Award size={15} className="text-violet-500" />
                Pencapaian
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Peringkat</span>
                  <RankChip rank={rank} size={16} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Level</span>
                  <span className="text-sm font-bold text-gray-900" style={{ color: rankMeta?.color }}>
                    {profile.level}
                  </span>
                </div>
                {profile.streak > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Streak</span>
                    <span className="flex items-center gap-1 text-sm font-bold text-orange-500">
                      <Flame size={14} /> {profile.streak} hari
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================= */
  /*  EDIT MODE                                                        */
  /* ================================================================= */

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
      {message && (
        <div
          className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
          role="alert"
        >
          <CheckCircle2 size={16} className="shrink-0" />
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Edit Profil</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* FOTO PROFIL */}
          <div className="flex items-center gap-5">
            {avatarBlock("lg")}
            <div>
              <p className="text-sm font-semibold text-gray-900">Foto Profil</p>
              <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, atau WebP. Maksimal 5MB.</p>
              <button
                type="button"
                onClick={handleAvatarClick}
                className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                {displayAvatar ? "Ganti Foto" : "Upload Foto"}
              </button>
            </div>
          </div>

          {/* INFORMASI PRIBADI */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <User size={15} className="text-gray-400" />
              Informasi Pribadi
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nama Lengkap <span className="text-red-400">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nama Panggilan
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={form.nickname}
                  onChange={(e) => setForm((p) => ({ ...p, nickname: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Opsional"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  readOnly
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 text-sm cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Email tidak dapat diubah dari sini.</p>
              </div>
            </div>
          </section>

          {/* PROFIL PROFESIONAL */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Briefcase size={15} className="text-gray-400" />
              Profil Profesional
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Sekolah
                  </label>
                  <input
                    id="school"
                    type="text"
                    value={form.school}
                    onChange={(e) => setForm((p) => ({ ...p, school: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Nama sekolah"
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mata Pelajaran
                  </label>
                  <input
                    id="subject"
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Contoh: Bahasa Indonesia"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Jenjang / Kelas
                  </label>
                  <input
                    id="grade"
                    type="text"
                    value={form.grade}
                    onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Contoh: SMP Kelas 7"
                  />
                </div>
                <div />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nip" className="block text-sm font-medium text-gray-700 mb-1.5">
                    NIP
                  </label>
                  <input
                    id="nip"
                    type="text"
                    value={form.nip}
                    onChange={(e) => setForm((p) => ({ ...p, nip: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Nomor Induk Pegawai"
                  />
                </div>
                <div>
                  <label htmlFor="nuptk" className="block text-sm font-medium text-gray-700 mb-1.5">
                    NUPTK
                  </label>
                  <input
                    id="nuptk"
                    type="text"
                    value={form.nuptk}
                    onChange={(e) => setForm((p) => ({ ...p, nuptk: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Nomor UKG"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* LOKASI */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <MapPin size={15} className="text-gray-400" />
              Lokasi
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Kota / Kabupaten
                </label>
                <input
                  id="city"
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Jakarta"
                />
              </div>
              <div>
                <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Provinsi
                </label>
                <input
                  id="province"
                  type="text"
                  value={form.province}
                  onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="DKI Jakarta"
                />
              </div>
            </div>
          </section>

          {/* TENTANG SAYA */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Heart size={15} className="text-gray-400" />
              Tentang Saya
            </h3>
            <textarea
              id="bio"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              placeholder="Ceritakan tentang diri Anda sebagai guru..."
            />
          </section>

          {/* BOTTOM ACTIONS (mobile) */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100 sm:hidden">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
