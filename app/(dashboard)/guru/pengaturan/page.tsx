"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Settings, Banknote, Shield, Save, CheckCircle2, AlertCircle, Loader2, Crown, Eye, EyeOff, Lock, Sparkles, Video, GraduationCap, Zap, User } from "lucide-react";
import Link from "next/link";

type TabType = "rekening" | "keamanan";

export default function GuruPengaturanPage() {
  const [activeTab, setActiveTab] = useState<TabType>("rekening");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isFounder, setIsFounder] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<string>("");

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

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const meRes = await fetch("/api/user/me");
        if (meRes.ok) {
          const { user: dbUser } = await meRes.json();
          setIsPremium(dbUser.isPremium);
          setIsFounder(dbUser.isFounder);
          setPremiumUntil(dbUser.premiumUntil || "");
        }

        const rekRes = await fetch("/api/user/rekening");
        if (rekRes.ok) {
          const data = await rekRes.json();
          setRekening({
            bank: data.bank || "",
            holder: data.holder || "",
            number: data.number || "",
          });
        }
      } catch (err) {
        console.error("Fetch user error:", err);
      }
    };
    fetchUser();
  }, [supabase]);

  const handleRekeningSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/rekening", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rekening),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      setMessage({ type: "success", text: "✓ Rekening berhasil disimpan!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    if (password.new !== password.confirm) {
      setMessage({ type: "error", text: "Password baru dan konfirmasi tidak cocok" });
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: password.current,
          newPassword: password.new,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah password");
      setMessage({ type: "success", text: "✓ Password berhasil diubah!" });
      setPassword({ current: "", new: "", confirm: "" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const renderRekening = () => (
    <form onSubmit={handleRekeningSave} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex items-start gap-3">
        <Banknote className="w-5 h-5 shrink-0 mt-0.5" />
        <p>Data rekening digunakan khusus untuk pencairan royalti penjualan karya Anda. Data dienkripsi & aman.</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Bank</label>
          <select value={rekening.bank} onChange={(e) => setRekening((p) => ({ ...p, bank: e.target.value }))} className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-green-500 outline-none" required>
            <option value="">Pilih bank...</option>
            <option value="bca">Bank Central Asia (BCA)</option>
            <option value="mandiri">Bank Mandiri</option>
            <option value="bni">Bank BNI</option>
            <option value="bri">Bank BRI</option>
            <option value="bsi">Bank Syariah Indonesia (BSI)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Pemilik Rekening</label>
          <Input value={rekening.holder} onChange={(e) => setRekening((p) => ({ ...p, holder: e.target.value }))} placeholder="Sesuai buku tabungan" className="h-11 rounded-lg" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nomor Rekening</label>
          <Input value={rekening.number} onChange={(e) => setRekening((p) => ({ ...p, number: e.target.value.replace(/\D/g, "") }))} placeholder="Contoh: 1234567890" className="h-11 rounded-lg font-mono tracking-widest" maxLength={20} required />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5 rounded-lg h-auto">
        {loading ? (
          <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</span>
        ) : (
          <span className="flex items-center gap-2"><Save className="w-4 h-4" />Simpan Rekening</span>
        )}
      </Button>
    </form>
  );

  const renderKeamanan = () => (
    <form onSubmit={handlePasswordSave} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Lama</label>
          <div className="relative">
            <Input value={password.current} onChange={(e) => setPassword((p) => ({ ...p, current: e.target.value }))} type={showPass ? "text" : "password"} className="h-11 rounded-lg pr-12" required />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Baru</label>
          <Input value={password.new} onChange={(e) => setPassword((p) => ({ ...p, new: e.target.value }))} type={showPass ? "text" : "password"} className="h-11 rounded-lg" minLength={6} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Konfirmasi Password Baru</label>
          <Input value={password.confirm} onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))} type={showPass ? "text" : "password"} className="h-11 rounded-lg" required />
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Lock className="w-4 h-4" />
        <span>Minimal 6 karakter. Gunakan kombinasi huruf & angka.</span>
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-lg h-auto">
        {loading ? (
          <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Mengubah...</span>
        ) : (
          <span className="flex items-center gap-2"><Shield className="w-4 h-4" />Ubah Password</span>
        )}
      </Button>
    </form>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-slate-700" />
          Pengaturan
        </h1>
        <p className="text-slate-500 mt-1">Kelola pembayaran dan keamanan akun Anda</p>
      </div>

      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${message.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="font-medium text-sm">{message.text}</span>
        </div>
      )}

      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg ${isPremium ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-slate-300"}`}>
              {isPremium ? <Crown className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                {isFounder ? "Founder" : isPremium ? "Guru Pro" : "Guru Free"}
                {isPremium && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-300">Aktif</span>}
              </h3>
              <p className="text-sm text-slate-500">
                {isPremium ? `Berlaku sampai ${premiumUntil}` : "Upgrade untuk 500 kredit AI, jual karya, & fitur Pro"}
              </p>
            </div>
          </div>
          <Link href="/guru/pengaturan/premium" className={`min-w-[160px] text-sm font-semibold text-center py-2.5 px-4 rounded-lg transition-colors ${isPremium ? "bg-slate-900 hover:bg-slate-800 text-white" : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md"}`}>
            {isPremium ? "Perpanjang" : "Upgrade Sekarang"}
          </Link>
        </div>
        {isPremium && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600">
            <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-600" /> 500 kredit AI/bulan</span>
            <span className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5 text-amber-600" /> Unduh 10 dokumen/hari</span>
            <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-amber-600" /> Jual karya berbayar</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-600" /> Prioritas kecepatan</span>
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-1">
          {[
            { id: "rekening", icon: Banknote, label: "Rekening" },
            { id: "keamanan", icon: Shield, label: "Keamanan" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-left text-sm ${activeTab === tab.id ? "bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
          <div className="pt-3 mt-3 border-t border-slate-100">
            <Link
              href="/guru/profile"
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-left text-sm text-slate-600 hover:bg-slate-50"
            >
              <User className="w-4 h-4" />
              Edit Profil
            </Link>
          </div>
        </div>
        <div className="lg:col-span-3">
          <Card className="border-0 shadow-lg rounded-2xl">
            <div className="p-6 md:p-8">
              {activeTab === "rekening" && renderRekening()}
              {activeTab === "keamanan" && renderKeamanan()}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
