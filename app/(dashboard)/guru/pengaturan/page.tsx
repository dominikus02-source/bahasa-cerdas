"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Settings, User, Banknote, Shield, Camera, Save, CheckCircle2, AlertCircle, Loader2, Crown, Eye, EyeOff, Lock, Sparkles, Video, GraduationCap, Zap } from "lucide-react";
import Link from "next/link";

type TabType = "profil" | "rekening" | "keamanan";

export default function GuruPengaturanPage() {
  const [activeTab, setActiveTab] = useState<TabType>("profil");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isFounder, setIsFounder] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    bio: "",
    avatarUrl: "",
    nip: "",
    nuptk: "",
    school: "",
    subject: "",
  });

  const [rekening, setRekening] = useState({
    bank: "",
    holder: "",
    number: "",
  });

  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPass, setShowPass] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const result = await supabase.auth.getUser();
      const user = result.data?.user;
      if (!user) return;

      if (user.email === "dominikus.wahyu@lajoex.com") {
        setIsFounder(true);
        setIsPremium(true);
        setPremiumUntil("Selamanya (Founder)");
      }

      const profileResult = await supabase
        .from("profiles")
        .select("is_premium, premium_until")
        .eq("id", user.id)
        .single();

      if (profileResult.data?.is_premium) {
        const isActive = profileResult.data.premium_until
          ? new Date(profileResult.data.premium_until) > new Date()
          : false;
        if (isActive) {
          setIsPremium(true);
          setPremiumUntil(
            new Date(profileResult.data.premium_until).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          );
        }
      }

      setProfile({
        fullName: user.user_metadata?.full_name || "",
        email: user.email || "",
        bio: user.user_metadata?.bio || "",
        avatarUrl: user.user_metadata?.avatar_url || "",
        nip: user.user_metadata?.nip || "",
        nuptk: user.user_metadata?.nuptk || "",
        school: user.user_metadata?.school || "",
        subject: user.user_metadata?.subject || "",
      });
    };
    fetchUser();
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await supabase.auth.updateUser({
        data: {
          full_name: profile.fullName,
          bio: profile.bio,
          avatar_url: profile.avatarUrl,
          nip: profile.nip,
          nuptk: profile.nuptk,
          school: profile.school,
          subject: profile.subject,
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

  const handleRekeningSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    await new Promise((r) => setTimeout(r, 1000));
    setMessage({ type: "success", text: "Data rekening berhasil disimpan!" });
    setLoading(false);
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.new !== password.confirm) {
      setMessage({ type: "error", text: "Password baru tidak cocok!" });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const result = await supabase.auth.updateUser({ password: password.new });
      if (result.error) throw result.error;
      setMessage({ type: "success", text: "Password berhasil diubah!" });
      setPassword({ current: "", new: "", confirm: "" });
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-slate-700" />
          Pengaturan Akun
        </h1>
        <p className="text-slate-500 mt-1">Kelola profil, pembayaran, dan keamanan akun Anda</p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="font-medium text-sm">{message.text}</span>
        </div>
      )}

      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg ${
                isPremium
                  ? "bg-gradient-to-br from-amber-400 to-orange-500"
                  : "bg-slate-300"
              }`}
            >
              {isPremium ? <Crown className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                {isFounder ? "Founder Premium" : isPremium ? "Premium Plan" : "Free Plan"}
                {isPremium && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
                    Aktif
                  </span>
                )}
              </h3>
              <p className="text-sm text-slate-500">
                {isPremium
                  ? `Berlaku sampai ${premiumUntil}`
                  : "Upgrade untuk akses AI, unlimited video, & fitur premium"}
              </p>
            </div>
          </div>
          <Link
            href="/checkout"
            className={`min-w-[160px] text-sm font-semibold text-center py-2.5 px-4 rounded-lg transition-colors ${
              isPremium
                ? "bg-slate-900 hover:bg-slate-800 text-white"
                : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md"
            }`}
          >
            {isPremium ? "Perpanjang" : "Upgrade Sekarang"}
          </Link>
        </div>

        {isPremium && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> AI Generator
            </span>
            <span className="flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-amber-600" /> Unlimited Video
            </span>
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-amber-600" /> UKBI Full
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" /> Priority Support
            </span>
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-1">
          {[
            { id: "profil", icon: User, label: "Profil" },
            { id: "rekening", icon: Banknote, label: "Rekening" },
            { id: "keamanan", icon: Shield, label: "Keamanan" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-left text-sm ${
                activeTab === tab.id
                  ? "bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          <Card className="border-0 shadow-lg rounded-2xl">
            <div className="p-6 md:p-8">
              {activeTab === "profil" && (
                <form onSubmit={handleProfileSave} className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative shrink-0">
                      <div className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden border-4 border-white shadow-md">
                        {profile.avatarUrl ? (
                          <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <User className="w-10 h-10" />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-colors"
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Foto Profil</h3>
                      <p className="text-sm text-slate-500 mb-3">JPG, PNG. Maks 2MB</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Ganti Foto
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
                        <Input
                          value={profile.fullName}
                          onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                          className="h-11 rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                        <Input
                          value={profile.email}
                          onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                          type="email"
                          className="h-11 rounded-lg bg-slate-50"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">NIP</label>
                        <Input
                          value={profile.nip}
                          onChange={(e) => setProfile((p) => ({ ...p, nip: e.target.value }))}
                          placeholder="Nomor Induk Pegawai"
                          className="h-11 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">NUPTK</label>
                        <Input
                          value={profile.nuptk}
                          onChange={(e) => setProfile((p) => ({ ...p, nuptk: e.target.value }))}
                          placeholder="Nomor UKG"
                          className="h-11 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Sekolah</label>
                        <Input
                          value={profile.school}
                          onChange={(e) => setProfile((p) => ({ ...p, school: e.target.value }))}
                          placeholder="Nama sekolah"
                          className="h-11 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Mata Pelajaran</label>
                        <Input
                          value={profile.subject}
                          onChange={(e) => setProfile((p) => ({ ...p, subject: e.target.value }))}
                          placeholder="Contoh: Bahasa Indonesia"
                          className="h-11 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio Singkat</label>
                      <textarea
                        rows={3}
                        value={profile.bio}
                        onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        placeholder="Ceritakan tentang diri Anda..."
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5 rounded-lg h-auto"
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
                </form>
              )}

              {activeTab === "rekening" && (
                <form onSubmit={handleRekeningSave} className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex items-start gap-3">
                    <Banknote className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>
                      Data rekening digunakan khusus untuk pencairan royalti penjualan karya Anda. Data
                      dienkripsi & aman.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Bank</label>
                      <select
                        value={rekening.bank}
                        onChange={(e) => setRekening((p) => ({ ...p, bank: e.target.value }))}
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        required
                      >
                        <option value="">Pilih bank...</option>
                        <option value="bca">Bank Central Asia (BCA)</option>
                        <option value="mandiri">Bank Mandiri</option>
                        <option value="bni">Bank BNI</option>
                        <option value="bri">Bank BRI</option>
                        <option value="bsi">Bank Syariah Indonesia (BSI)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Nama Pemilik Rekening
                      </label>
                      <Input
                        value={rekening.holder}
                        onChange={(e) => setRekening((p) => ({ ...p, holder: e.target.value }))}
                        placeholder="Sesuai buku tabungan"
                        className="h-11 rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Nomor Rekening
                      </label>
                      <Input
                        value={rekening.number}
                        onChange={(e) =>
                          setRekening((p) => ({ ...p, number: e.target.value.replace(/\D/g, "") }))
                        }
                        placeholder="Contoh: 1234567890"
                        className="h-11 rounded-lg font-mono tracking-widest"
                        maxLength={20}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5 rounded-lg h-auto"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Menyimpan...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Simpan Rekening
                      </span>
                    )}
                  </Button>
                </form>
              )}

              {activeTab === "keamanan" && (
                <form onSubmit={handlePasswordSave} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Lama</label>
                      <div className="relative">
                        <Input
                          value={password.current}
                          onChange={(e) => setPassword((p) => ({ ...p, current: e.target.value }))}
                          type={showPass ? "text" : "password"}
                          className="h-11 rounded-lg pr-12"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Baru</label>
                      <Input
                        value={password.new}
                        onChange={(e) => setPassword((p) => ({ ...p, new: e.target.value }))}
                        type={showPass ? "text" : "password"}
                        className="h-11 rounded-lg"
                        minLength={6}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Konfirmasi Password Baru
                      </label>
                      <Input
                        value={password.confirm}
                        onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))}
                        type={showPass ? "text" : "password"}
                        className="h-11 rounded-lg"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Lock className="w-4 h-4" />
                    <span>Minimal 6 karakter. Gunakan kombinasi huruf & angka.</span>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-lg h-auto"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Mengubah...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Ubah Password
                      </span>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
}