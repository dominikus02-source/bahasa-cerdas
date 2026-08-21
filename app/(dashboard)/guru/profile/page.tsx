"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Save, X, Loader2, GraduationCap, MapPin, BookOpen, Award, Edit3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { levelFromXp } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";
import { RankChip } from "@/components/gamification/RankChip";
import { useUserStore } from "@/store";

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
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

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

  const rank = rankFromLevel(levelFromXp(profile?.xp || 0));
  const initial = (profile?.fullName || "G").charAt(0).toUpperCase();
  const displayAvatar = avatarPreview || profile?.avatar;

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      {message && (
        <div
          className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      {/* Hero */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative mb-4">
          <button
            type="button"
            onClick={handleAvatarClick}
            className="group relative w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            aria-label="Ganti foto profil"
          >
            {displayAvatar ? (
              <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">{initial}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
          {uploadingAvatar && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <Loader2 size={24} className="text-white animate-spin" />
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

        <h1 className="text-2xl font-bold text-gray-900">{profile.fullName || "Guru"}</h1>

        <div className="flex items-center gap-2 mt-2">
          <RankChip rank={rank} size={18} />
          <span className="text-sm text-gray-500">Level {profile.level}</span>
        </div>

        {(profile.school || profile.subject) && (
          <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
            {profile.subject && (
              <span className="flex items-center gap-1">
                <BookOpen size={14} />
                {profile.subject}
              </span>
            )}
            {profile.subject && profile.school && <span className="text-gray-300">|</span>}
            {profile.school && (
              <span className="flex items-center gap-1">
                <GraduationCap size={14} />
                {profile.school}
              </span>
            )}
          </div>
        )}

        {profile.city && (
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
            <MapPin size={12} />
            {[profile.city, profile.province].filter(Boolean).join(", ")}
          </div>
        )}

        {profile.bio && <p className="mt-3 text-sm text-gray-600 max-w-md leading-relaxed">{profile.bio}</p>}

        <div className="flex items-center gap-3 mt-4">
          {profile.isFounder && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
              <Award size={12} /> Founder
            </span>
          )}
          {profile.isPremium && !profile.isFounder && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 rounded-full text-xs font-medium border border-amber-200">
              <Award size={12} /> Pro
            </span>
          )}
        </div>

        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <Edit3 size={16} />
            Edit Profil
          </button>
        )}
      </div>

      {/* Stats */}
      {!editing && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="grid grid-cols-4 divide-x divide-gray-100">
            {[
              { value: stats.totalKarya, label: "Karya" },
              { value: stats.totalSiswa, label: "Siswa" },
              { value: stats.totalKuis, label: "Kuis" },
              { value: `Rp${(stats.saldo || 0).toLocaleString("id")}`, label: "Saldo", accent: true },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className={`text-lg font-bold ${s.accent ? "text-emerald-600" : "text-gray-900"}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {editing && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Edit Profil</h2>

          {/* Informasi Pribadi */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Informasi Pribadi</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nama Lengkap
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
          </div>

          {/* Profil Profesional */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Profil Profesional</h3>
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
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  placeholder="Ceritakan tentang diri Anda..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-8">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="px-6 py-3 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              <X size={16} className="inline mr-1.5 -mt-0.5" />
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
