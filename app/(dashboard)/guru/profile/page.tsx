"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Camera,
  Save,
  Loader2,
  GraduationCap,
  MapPin,
  Briefcase,
  Edit3,
  CheckCircle2,
  Heart,
  Wallet,
  Banknote,
  Shield,
  Mail,
  Crown,
  BookOpen,
  Pencil,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store";
import UserName from "@/components/arena/UserName";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EditSection = "header" | "professional" | "bio" | "rekening" | null;

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
  bank: string | null;
  bankHolder: string | null;
  bankNumber: string | null;
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

interface RekeningFormState {
  bank: string;
  holder: string;
  number: string;
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

const EMPTY_REKENING: RekeningFormState = {
  bank: "",
  holder: "",
  number: "",
};

const BANK_OPTIONS = [
  { value: "bca", label: "Bank Central Asia (BCA)" },
  { value: "mandiri", label: "Bank Mandiri" },
  { value: "bni", label: "Bank BNI" },
  { value: "bri", label: "Bank BRI" },
  { value: "bsi", label: "Bank Syariah Indonesia (BSI)" },
];

function maskBankNumber(num: string | null | undefined): string {
  if (!num) return "";
  const digits = num.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `•••• ${digits.slice(-4)}`;
}

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function fieldRow(label: string, value: string | null | undefined) {
  if (!value?.trim()) return null;
  return { label, value: value.trim() };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GuruProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [saving, setSaving] = useState(false);
  const [savingRekening, setSavingRekening] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [rekening, setRekening] = useState<RekeningFormState>(EMPTY_REKENING);
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
        bank: u.bank || null,
        bankHolder: u.bankHolder || null,
        bankNumber: u.bankNumber || null,
      });
    } catch {}
  }, []);

  const fetchRekening = useCallback(async () => {
    try {
      const res = await fetch("/api/user/rekening");
      if (res.ok) {
        const d = await res.json();
        setRekening({
          bank: d.bank || "",
          holder: d.holder || "",
          number: d.number || "",
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([fetchProfile(), fetchRekening()]).finally(() => setLoading(false));
  }, [fetchProfile, fetchRekening]);

  /* --- edit helpers ----------------------------------------------- */

  const openSection = (section: EditSection) => {
    if (!profile) return;
    setMessage(null);
    setAvatarPreview(null);
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
    setRekening({
      bank: profile.bank || "",
      holder: profile.bankHolder || "",
      number: profile.bankNumber || "",
    });
    setEditingSection(section);
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setMessage(null);
    setAvatarPreview(null);
  };

  /* --- avatar upload ---------------------------------------------- */

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

  /* --- per-section save handlers ---------------------------------- */

  const handleSaveHeader = async () => {
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
        }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan profil");

      setProfile((prev) =>
        prev
          ? { ...prev, fullName: form.fullName.trim(), nickname: form.nickname.trim() || null }
          : prev
      );
      setUser({ fullName: form.fullName.trim() });
      setEditingSection(null);
      setMessage({ type: "success", text: "Profil berhasil disimpan!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan profil";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfessional = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school: form.school.trim() || null,
          subject: form.subject.trim() || null,
          grade: form.grade.trim() || null,
          nip: form.nip.trim() || null,
          nuptk: form.nuptk.trim() || null,
          city: form.city.trim() || null,
          province: form.province.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan profil profesional");

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              school: form.school.trim() || null,
              subject: form.subject.trim() || null,
              grade: form.grade.trim() || null,
              nip: form.nip.trim() || null,
              nuptk: form.nuptk.trim() || null,
              city: form.city.trim() || null,
              province: form.province.trim() || null,
            }
          : prev
      );
      setEditingSection(null);
      setMessage({ type: "success", text: "Profil profesional berhasil disimpan!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan profil profesional";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBio = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: form.bio.trim() || null }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan bio");

      setProfile((prev) => (prev ? { ...prev, bio: form.bio.trim() || null } : prev));
      setEditingSection(null);
      setMessage({ type: "success", text: "Bio berhasil disimpan!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan bio";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleRekeningSave = async () => {
    if (!rekening.bank) {
      setMessage({ type: "error", text: "Pilih nama bank terlebih dahulu." });
      return;
    }
    if (!rekening.holder.trim()) {
      setMessage({ type: "error", text: "Nama pemilik rekening wajib diisi." });
      return;
    }
    if (!rekening.number.trim()) {
      setMessage({ type: "error", text: "Nomor rekening wajib diisi." });
      return;
    }
    setSavingRekening(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/rekening", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank: rekening.bank,
          holder: rekening.holder.trim(),
          number: rekening.number.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan rekening");
      setProfile((prev) =>
        prev
          ? { ...prev, bank: rekening.bank, bankHolder: rekening.holder.trim(), bankNumber: rekening.number.trim() }
          : prev
      );
      setEditingSection(null);
      setMessage({ type: "success", text: "Rekening berhasil disimpan!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan rekening";
      setMessage({ type: "error", text: msg });
    } finally {
      setSavingRekening(false);
    }
  };

  /* --- derived ----------------------------------------------------- */

  const initial = (profile?.fullName || "G").charAt(0).toUpperCase();
  const displayAvatar = avatarPreview || profile?.avatar;

  const profFields = useMemo(() => {
    if (!profile) return [];
    const fields: { label: string; value: string }[] = [];
    const add = (label: string, value: string | null | undefined) => {
      if (value?.trim()) fields.push({ label, value: value.trim() });
    };
    add("Sekolah", profile.school);
    add("Mata Pelajaran", profile.subject);
    add("Jenjang", profile.grade);
    add("Kota", profile.city);
    add("Provinsi", profile.province);
    if (profile.nip?.trim()) fields.push({ label: "NIP", value: profile.nip.trim() });
    if (profile.nuptk?.trim()) fields.push({ label: "NUPTK", value: profile.nuptk.trim() });
    return fields;
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
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500 dark:text-slate-400">
        <p>Profil tidak ditemukan.</p>
      </div>
    );
  }

  /* ================================================================= */
  /*  AVATAR BLOCK                                                      */
  /* ================================================================= */

  const avatarBlock = (variant: "hero" | "edit") => {
    const dim = variant === "hero" ? "w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36" : "w-20 h-20";
    const textSize = variant === "hero" ? "text-4xl md:text-5xl" : "text-3xl";
    const cameraSize = variant === "hero" ? 24 : 18;
    return (
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={handleAvatarClick}
          className={`group relative ${dim} rounded-full overflow-hidden ${
            variant === "hero"
              ? "ring-[3px] ring-white dark:ring-slate-900 shadow-xl"
              : "border-4 border-white dark:border-slate-700 shadow-lg"
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          aria-label="Ganti foto profil"
        >
          {displayAvatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center">
              <span className={`${textSize} font-bold text-white`}>{initial}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <Camera size={cameraSize} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
        {uploadingAvatar && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
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
  /*  MESSAGE TOAST                                                     */
  /* ================================================================= */

  const messageToast = message && (
    <div
      className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
        message.type === "success"
          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
          : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
      }`}
      role="alert"
    >
      <CheckCircle2 size={16} className="shrink-0" />
      {message.text}
    </div>
  );

  /* ================================================================= */
  /*  RENDER                                                            */
  /* ================================================================= */

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      {messageToast}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  SECTION 1 — HERO CARD                                         */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {editingSection === "header" ? (
          /* ── EDIT MODE HERO ── */
          <div>
            <div className="relative h-44 sm:h-52 md:h-60 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/batik-header-profile-bc.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 via-amber-500/10 to-white dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-900" />
              <div className="absolute top-4 left-4 z-10">
                <span className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold px-3 py-1 border border-amber-200 dark:border-amber-800/50">
                  <Pencil size={12} /> Sedang Mengedit
                </span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/bc2026-icon.png" alt="" className="absolute top-4 right-4 h-10 sm:h-12 md:h-14 object-contain opacity-60 [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.25))] dark:hidden" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/bc2026-icon-dark.png" alt="" className="absolute top-4 right-4 h-10 sm:h-12 md:h-14 object-contain opacity-60 [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.4))] hidden dark:block" />
            </div>
            <div className="px-4 sm:px-6 md:px-8 pb-6 -mt-14 sm:-mt-16 md:-mt-20">
              <div className="space-y-5 pt-16 sm:pt-20">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {avatarBlock("edit")}
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Foto Profil</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">JPG, PNG, atau WebP. Maks 5MB.</p>
                    <button type="button" onClick={handleAvatarClick} className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold">
                      {displayAvatar ? "Ganti Foto" : "Upload Foto"}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Nama Lengkap <span className="text-red-400">*</span></label>
                  <input id="fullName" type="text" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                </div>
                <div>
                  <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Nama Panggilan</label>
                  <input id="nickname" type="text" value={form.nickname} onChange={(e) => setForm((p) => ({ ...p, nickname: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Opsional" />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={handleSaveHeader} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                  <button type="button" onClick={cancelEdit} disabled={saving} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50">Batal</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── VIEW MODE HERO ── FB / Instagram / iOS Edu Style ── */
          <>
            {/* Cover photo — taller, dual-mode gradient overlay */}
            <div className="relative h-44 sm:h-52 md:h-60 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/batik-header-profile-bc.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
              {/* Light mode: fades to white at bottom; Dark: fades to dark */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/10 to-white dark:from-slate-900/40 dark:via-slate-900/50 dark:to-slate-900" />
              {/* BC Logo Mark — single icon, dual-mode variants */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/bc2026-icon.png" alt="" className="absolute top-4 right-4 h-10 sm:h-12 md:h-14 object-contain opacity-80 [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.25))] dark:hidden" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/bc2026-icon-dark.png" alt="" className="absolute top-4 right-4 h-10 sm:h-12 md:h-14 object-contain opacity-80 [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.4))] hidden dark:block" />
            </div>

            {/* Name / identity area — overlaps cover like Facebook */}
            <div className="px-4 sm:px-6 md:px-8 pb-6 -mt-14 sm:-mt-16 md:-mt-20">
              <div className="flex flex-col items-center sm:items-start gap-4">
                {/* Avatar */}
                {avatarBlock("hero")}

                {/* Name + details — centered on mobile, left-aligned on desktop */}
                <div className="flex-1 text-center sm:text-left pb-1 w-full">
                  {/* Name: EXTRA BOLD, dark in light mode / white in dark mode */}
                  <h1 className="text-3xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
                    <UserName
                      name={profile.fullName || "Guru"}
                      onDark={false}
                      isFounder={profile.isFounder}
                      isPremium={profile.isPremium}
                    />
                  </h1>

                  {/* Nickname */}
                  {profile.nickname && (
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                      &ldquo;{profile.nickname}&rdquo;
                    </p>
                  )}

                  {/* Role as pill badge */}
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-full">
                      <BookOpen size={14} className="text-blue-600 dark:text-blue-300" />
                      Guru {profile.subject || "Bahasa Indonesia"}
                    </span>
                  </div>

                  {/* Location — icons + text, high contrast */}
                  {(profile.school || profile.city) && (
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2.5 text-sm text-gray-600 dark:text-slate-300">
                      {profile.school && (
                        <span className="flex items-center gap-1">
                          <GraduationCap size={14} className="text-gray-400 dark:text-slate-500" />
                          {profile.school}
                        </span>
                      )}
                      {profile.school && profile.city && <span className="text-gray-300 dark:text-slate-600">&middot;</span>}
                      {profile.city && (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} className="text-gray-400 dark:text-slate-500" />
                          {[profile.city, profile.province].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Pro badges */}
                  {(profile.isFounder || profile.isPremium) && (
                    <div className="flex items-center gap-2 mt-3">
                      {profile.isFounder && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold border border-amber-200 dark:border-amber-800/50">
                          <Shield size={12} /> Founder
                        </span>
                      )}
                      {profile.isPremium && !profile.isFounder && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold border border-amber-200 dark:border-amber-800/50">
                          <Crown size={12} /> Guru Pro
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Edit button — outlined style (Instagram) */}
                <button
                  type="button"
                  onClick={() => openSection("header")}
                  className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Edit3 size={16} /> Edit Profil
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  SECTION 2 — TENTANG SAYA + PROFIL PROFESIONAL (2-col)         */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Tentang Saya (left) ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2"><Heart size={16} className="text-rose-400" /> Tentang Saya</h2>
            {editingSection !== "bio" && <button type="button" onClick={() => openSection("bio")} className="text-sm text-blue-600 hover:text-blue-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold">{profile.bio ? "Edit" : "Tambah"}</button>}
          </div>
          {editingSection === "bio" ? (
            <div className="space-y-4">
              <textarea id="bio" rows={4} value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Ceritakan tentang diri Anda sebagai guru..." />
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleSaveBio} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {saving ? "Menyimpan..." : "Simpan"}
                </button>
                <button type="button" onClick={cancelEdit} disabled={saving} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50">Batal</button>
              </div>
            </div>
          ) : profile.bio ? (
            <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{profile.bio}</p>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Heart size={28} className="text-gray-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-gray-400 dark:text-slate-500 italic max-w-xs">Ceritakan tentang dirimu sebagai guru untuk membantu murid mengenalmu lebih baik.</p>
              <button type="button" onClick={() => openSection("bio")} className="mt-3 text-sm text-blue-600 hover:text-blue-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold">Tulis Sekarang</button>
            </div>
          )}
        </div>

        {/* ── Profil Profesional (right) ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2"><Briefcase size={16} className="text-blue-500" /> Profil Profesional</h2>
            {editingSection !== "professional" && <button type="button" onClick={() => openSection("professional")} className="text-sm text-blue-600 hover:text-blue-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold">{profFields.length > 0 ? "Edit" : "Lengkapi"}</button>}
          </div>
          {editingSection === "professional" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="school" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Sekolah</label>
                  <input id="school" type="text" value={form.school} onChange={(e) => setForm((p) => ({ ...p, school: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Nama sekolah" />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Mata Pelajaran</label>
                  <input id="subject" type="text" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Contoh: Bahasa Indonesia" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="grade" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Jenjang / Kelas</label>
                  <input id="grade" type="text" value={form.grade} onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Contoh: SMP Kelas 7" />
                </div>
                <div />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nip" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">NIP (opsional)</label>
                  <input id="nip" type="text" value={form.nip} onChange={(e) => setForm((p) => ({ ...p, nip: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Nomor Induk Pegawai" />
                </div>
                <div>
                  <label htmlFor="nuptk" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">NUPTK (opsional)</label>
                  <input id="nuptk" type="text" value={form.nuptk} onChange={(e) => setForm((p) => ({ ...p, nuptk: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Nomor UKG" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Kota / Kabupaten</label>
                  <input id="city" type="text" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Jakarta" />
                </div>
                <div>
                  <label htmlFor="province" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Provinsi</label>
                  <input id="province" type="text" value={form.province} onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="DKI Jakarta" />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={handleSaveProfessional} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {saving ? "Menyimpan..." : "Simpan"}
                </button>
                <button type="button" onClick={cancelEdit} disabled={saving} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50">Batal</button>
              </div>
            </div>
          ) : profFields.length > 0 ? (
            <div className="space-y-3">
              {profFields.map((f) => (
                <div key={f.label} className="flex items-start gap-3 py-1.5">
                  <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide w-28 shrink-0 pt-0.5">{f.label}</span>
                  <span className="text-sm text-gray-800 dark:text-slate-200 font-medium">{f.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Briefcase size={28} className="text-gray-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-gray-400 dark:text-slate-500 italic max-w-xs">Lengkapi informasi profesional untuk memudahkan kolaborasi dengan guru lain.</p>
              <button type="button" onClick={() => openSection("professional")} className="mt-3 text-sm text-blue-600 hover:text-blue-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold">Lengkapi Sekarang</button>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  SECTION 3 — PEMBAYARAN & PENARIKAN                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2"><Wallet size={16} className="text-emerald-500" /> Pembayaran &amp; Penarikan</h2>
          {editingSection !== "rekening" && <button type="button" onClick={() => openSection("rekening")} className="text-sm text-blue-600 hover:text-blue-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold">{profile.bank ? "Ubah Rekening" : "Atur Rekening"}</button>}
        </div>
        {editingSection === "rekening" ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
              <Banknote size={16} className="shrink-0 mt-0.5" />
              <p>Data rekening digunakan untuk pencairan royalti penjualan karya Anda.</p>
            </div>
            <div>
              <label htmlFor="bank" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Nama Bank</label>
              <select id="bank" value={rekening.bank} onChange={(e) => setRekening((p) => ({ ...p, bank: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                <option value="">Pilih bank...</option>
                {BANK_OPTIONS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bankHolder" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Nama Pemilik Rekening</label>
                <input id="bankHolder" type="text" value={rekening.holder} onChange={(e) => setRekening((p) => ({ ...p, holder: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Sesuai buku tabungan" required />
              </div>
              <div>
                <label htmlFor="bankNumber" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Nomor Rekening</label>
                <input id="bankNumber" type="text" value={rekening.number} onChange={(e) => setRekening((p) => ({ ...p, number: e.target.value.replace(/\D/g, "") }))} className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Contoh: 1234567890" maxLength={20} required />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="button" onClick={handleRekeningSave} disabled={savingRekening} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                {savingRekening ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {savingRekening ? "Menyimpan..." : "Simpan Rekening"}
              </button>
              <button type="button" onClick={cancelEdit} disabled={savingRekening} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50">Batal</button>
            </div>
          </div>
        ) : profile.bank && profile.bankHolder && profile.bankNumber ? (
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 size={13} /> Rekening penarikan aktif
            </span>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 mt-2">
              <div className="flex items-start gap-3 py-1.5">
                <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide w-28 shrink-0 pt-0.5">Bank</span>
                <span className="text-sm text-gray-800 dark:text-slate-200 font-medium">{BANK_OPTIONS.find((b) => b.value === profile.bank)?.label || profile.bank}</span>
              </div>
              <div className="flex items-start gap-3 py-1.5">
                <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide w-28 shrink-0 pt-0.5">No. Rekening</span>
                <span className="text-sm text-gray-800 dark:text-slate-200 font-medium font-mono">{maskBankNumber(profile.bankNumber)}</span>
              </div>
              <div className="flex items-start gap-3 py-1.5">
                <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide w-28 shrink-0 pt-0.5">Pemilik</span>
                <span className="text-sm text-gray-800 dark:text-slate-200 font-medium">{profile.bankHolder}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 pt-1">Rekening digunakan untuk pencairan royalti dari Toko Karya.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Wallet size={32} className="text-gray-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Rekening belum disiapkan</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 italic mt-1 max-w-xs">Tambahkan rekening bank untuk menerima pembayaran dari penjualan karya.</p>
            <button type="button" onClick={() => openSection("rekening")} className="mt-3 text-sm text-blue-600 hover:text-blue-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold">Atur Rekening</button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  SECTION 4 — AKUN                                               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2 mb-4"><Shield size={16} className="text-gray-400 dark:text-slate-500" /> Akun</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 py-2">
            <Mail size={16} className="text-gray-400 dark:text-slate-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Email</p>
              <p className="text-sm text-gray-800 dark:text-slate-200 font-medium truncate">{profile.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2">
            <Shield size={16} className="text-gray-400 dark:text-slate-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Status Akun</p>
              <p className="text-sm text-gray-800 dark:text-slate-200 font-medium">
                {profile.isFounder ? (
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs font-semibold border border-amber-200 dark:border-amber-800">Founder</span>
                ) : profile.isPremium ? (
                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded text-xs font-semibold border border-emerald-200 dark:border-emerald-800">Guru Pro</span>
                ) : (
                  <span className="text-gray-500 dark:text-slate-400">Guru Free</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
