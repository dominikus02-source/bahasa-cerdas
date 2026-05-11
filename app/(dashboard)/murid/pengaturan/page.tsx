"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Settings, User, Bell, Camera, Save, CheckCircle2, AlertCircle, LogOut, Loader2, Crown } from "lucide-react";

export default function MuridPengaturanPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    bio: "",
    avatarUrl: "",
    school: "",
    grade: "",
  });

  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const result = await supabase.auth.getUser();
      const user = result.data?.user;
      if (!user) return;

      if (user.email === "dominikus.wahyu@lajoex.com") {
        setIsPremium(true);
      }

      setProfile({
        fullName: user.user_metadata?.full_name || "",
        email: user.email || "",
        bio: user.user_metadata?.bio || "",
        avatarUrl: user.user_metadata?.avatar_url || "",
        school: user.user_metadata?.school || "",
        grade: user.user_metadata?.grade || "",
      });
    };
    fetchUser();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await supabase.auth.updateUser({
        data: {
          full_name: profile.fullName,
          bio: profile.bio,
          avatar_url: profile.avatarUrl,
          school: profile.school,
          grade: profile.grade,
        },
      });
      if (result.error) throw result.error;
      setMessage({ type: "success", text: "Profil berhasil diperbarui!" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const uploadResult = await supabase.storage.from("avatars").upload(fileName, file);
      if (uploadResult.error) throw uploadResult.error;
      const urlResult = supabase.storage.from("avatars").getPublicUrl(fileName);
      setProfile((prev) => ({ ...prev, avatarUrl: urlResult.data.publicUrl }));
      setMessage({ type: "success", text: "Foto berhasil diupload!" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="mt-1 text-sm text-gray-600">Kelola akun dan preferensi</p>
      </div>

      {message && (
        <div className={`mb-4 flex items-center gap-3 p-4 rounded-xl border ${
          message.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="font-medium text-sm">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="max-w-xl space-y-6">
        <Card className="p-6 border-0 shadow-lg rounded-2xl">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-violet-600" />
            Profil
          </h2>

          <div className="flex items-center gap-6 mb-6">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden border-4 border-white shadow-md">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User className="w-8 h-8" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-violet-700 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div className="text-sm text-gray-500">
              <p>JPG, PNG. Maks 2MB</p>
              <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => fileInputRef.current?.click()}>
                Ganti Foto
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Lengkap</label>
              <Input
                value={profile.fullName}
                onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <Input
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                type="email"
                className="h-11 rounded-xl bg-slate-50"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sekolah</label>
                <Input
                  value={profile.school}
                  onChange={(e) => setProfile((p) => ({ ...p, school: e.target.value }))}
                  placeholder="Nama sekolah"
                  className="h-11 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Kelas</label>
                <Input
                  value={profile.grade}
                  onChange={(e) => setProfile((p) => ({ ...p, grade: e.target.value }))}
                  placeholder="Contoh: X IPA 1"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio Singkat</label>
              <textarea
                rows={3}
                value={profile.bio}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                placeholder="Ceritakan sedikit tentang dirimu..."
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Simpan Perubahan
              </span>
            )}
          </Button>
        </Card>
      </form>

      <div className="max-w-xl space-y-4 mt-6">
        <Card className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50">
          <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center">
            <Bell className="h-6 w-6 text-violet-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Notifikasi</h3>
            <p className="text-sm text-gray-500">Pengaturan notifikasi push</p>
          </div>
          <span className="text-gray-400">›</span>
        </Card>

        {!isPremium && (
          <Card className="p-4 flex items-center gap-4 cursor-pointer hover:bg-amber-50 border-2 border-amber-200 bg-amber-50">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">Upgrade Premium</h3>
              <p className="text-sm text-amber-700">Akses AI, unlimited video & fitur eksklusif</p>
            </div>
            <span className="text-amber-600">›</span>
          </Card>
        )}

        <Card
          onClick={handleLogout}
          className="p-4 flex items-center gap-4 cursor-pointer hover:bg-red-50 border-2 border-transparent hover:border-red-200"
        >
          <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center">
            <LogOut className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-600">Keluar</h3>
            <p className="text-sm text-gray-500">Log out dari akun</p>
          </div>
          <span className="text-gray-400">›</span>
        </Card>
      </div>

      <div className="mt-8 max-w-xl">
        <Card className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-200">
          <h3 className="font-semibold text-violet-700">Ingin membuat kuis dan RPP?</h3>
          <p className="text-sm text-gray-600 mt-1">Daftarkan akun sebagai Guru untuk akses fitur pembuatan konten!</p>
          <Button className="mt-3 bg-emerald-600 hover:bg-emerald-700" size="sm">
            Daftar sebagai Guru
          </Button>
        </Card>
      </div>
    </div>
  );
}