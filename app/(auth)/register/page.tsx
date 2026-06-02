"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, ArrowRight, Sparkles, Check, Eye, EyeOff } from "lucide-react";
import BatikDecoration from "@/components/shared/BatikDecoration";
import { registerUser } from "@/app/actions/register";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [school, setSchool] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"GURU" | "MURID">("MURID");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const normalizedEmail = email.toLowerCase();

      const createRes = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          fullName,
          role,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        setError(createData.error || "Gagal mendaftar. Silakan coba lagi.");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.set("email", normalizedEmail);
      formData.set("supabaseId", createData.userId);
      formData.set("fullName", fullName);
      formData.set("role", role);
      if (school) formData.set("school", school);
      if (city) formData.set("city", city);
      if (province) formData.set("province", province);

      const result = await registerUser(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Auto-login after registration
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (loginError) {
        // Session failed — fall back to manual login
        setRegistered(true);
        setLoading(false);
        return;
      }

      // Redirect based on role
      const redirectUrl = role === "MURID" ? "/arena" : "/guru/beranda";
      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan");
      setLoading(false);
    }
  };

  const roleConfig = {
    GURU: {
      gradient: "from-emerald-500 to-emerald-600",
      bgLight: "bg-emerald-50",
      borderActive: "border-emerald-500",
      textActive: "text-emerald-700",
      bgIcon: "bg-emerald-100",
      iconColor: "text-emerald-600",
      accent: "ring-emerald-200",
    },
    MURID: {
      gradient: "from-violet-500 to-purple-600",
      bgLight: "bg-violet-50",
      borderActive: "border-violet-500",
      textActive: "text-violet-700",
      bgIcon: "bg-violet-100",
      iconColor: "text-violet-600",
      accent: "ring-violet-200",
    },
  };

  const config = roleConfig[role];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 via-red-700 to-blue-900 relative overflow-hidden p-4">
      {/* Batik Pattern Decorations */}
      <BatikDecoration />
      
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-to-br from-black/10 to-transparent" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-black/10 to-transparent" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-600 mb-4 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Beranda
            </Link>
            <Image src="/logo.png" alt="BahasaCerdas" width={56} height={56} className="mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Daftar</h1>
            <p className="text-sm text-gray-500">Bergabung dengan BahasaCerdas</p>
          </div>
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 md:p-4 text-sm text-red-700">{error}</div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full text-red-600 text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  Pilih jenis akun kamu
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <button
                  type="button"
                  onClick={() => setRole("GURU")}
                  className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 p-4 md:p-6 transition-all hover:scale-[1.02] ${
                    role === "GURU"
                      ? `${config.borderActive} ${config.bgLight} shadow-lg ${config.accent} ring-4`
                      : "border-gray-200 hover:border-gray-300 bg-gray-50"
                  }`}
                >
                  {role === "GURU" && (
                    <div className="absolute top-2 right-2">
                      <div className={`w-6 h-6 ${config.bgIcon} rounded-full flex items-center justify-center`}>
                        <Check className={`w-4 h-4 ${config.iconColor}`} />
                      </div>
                    </div>
                  )}
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center ${role === "GURU" ? config.bgIcon : "bg-gray-100"}`}>
                    <GraduationCap className={`h-7 w-7 md:h-8 md:w-8 ${role === "GURU" ? config.iconColor : "text-gray-400"}`} />
                  </div>
                  <span className={`font-bold text-base md:text-lg ${role === "GURU" ? config.textActive : "text-gray-700"}`}>Guru</span>
                  <span className="text-[11px] md:text-xs text-center text-gray-500">AI RPP, Bank Soal, Kuis Game</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setRole("MURID")}
                  className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 p-4 md:p-6 transition-all hover:scale-[1.02] ${
                    role === "MURID"
                      ? `${config.borderActive} ${config.bgLight} shadow-lg ${config.accent} ring-4`
                      : "border-gray-200 hover:border-gray-300 bg-gray-50"
                  }`}
                >
                  {role === "MURID" && (
                    <div className="absolute top-2 right-2">
                      <div className={`w-6 h-6 ${config.bgIcon} rounded-full flex items-center justify-center`}>
                        <Check className={`w-4 h-4 ${config.iconColor}`} />
                      </div>
                    </div>
                  )}
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center ${role === "MURID" ? config.bgIcon : "bg-gray-100"}`}>
                    <BookOpen className={`h-7 w-7 md:h-8 md:w-8 ${role === "MURID" ? config.iconColor : "text-gray-400"}`} />
                  </div>
                  <span className={`font-bold text-base md:text-lg ${role === "MURID" ? config.textActive : "text-gray-700"}`}>Murid</span>
                  <span className="text-[11px] md:text-xs text-center text-gray-500">Belajar, Kuis, UKBI</span>
                </button>
              </div>

              <Button
                onClick={() => setStep(2)}
                className={`w-full h-12 rounded-xl font-bold text-lg shadow-lg bg-gradient-to-r ${config.gradient} hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
              >
                Lanjut
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgLight} ${config.textActive} text-xs font-medium`}>
                {role === "GURU" ? <GraduationCap className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                {role === "GURU" ? "Akun Guru" : "Akun Murid"}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-red-500 focus:outline-none transition-colors"
                  placeholder={role === "GURU" ? "Drs. Siti Rahayu, M.Pd." : "Ahmad Rizki"}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-red-500 focus:outline-none transition-colors"
                  placeholder="siti@sekolah.sch.id"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 pr-12 text-sm focus:border-red-500 focus:outline-none transition-colors"
                    placeholder="Minimal 8 karakter"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Asal Sekolah</label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-red-500 focus:outline-none transition-colors"
                  placeholder={role === "GURU" ? "SMA Negeri 1 Jakarta" : "SMP Negeri 2 Bandung"}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Kota/Kabupaten</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-red-500 focus:outline-none transition-colors"
                    placeholder="Jakarta"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Provinsi</label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-red-500 focus:outline-none transition-colors"
                    placeholder="DKI Jakarta"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 h-12 rounded-xl font-semibold border-2"
                >
                  Kembali
                </Button>
                <Button
                  type="submit"
                  onClick={handleRegister}
                  disabled={loading}
                  className={`flex-1 h-12 rounded-xl font-bold shadow-lg bg-gradient-to-r ${config.gradient} hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Daftar
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {registered && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Pendaftaran Berhasil!</h2>
              <p className="text-sm text-gray-600">Akun <strong>{email}</strong> berhasil dibuat.</p>
              <p className="text-xs text-gray-500">
                {role === "MURID" ? "Kamu bisa langsung masuk ke Arena sekarang." : "Kamu bisa langsung masuk ke dasbor guru."}
              </p>
              <div className="pt-4">
                <Link href={role === "MURID" ? "/auth/arena-login" : "/login"}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg bg-gradient-to-r from-red-600 to-red-700 text-white hover:opacity-90 transition-opacity">
                  Masuk Sekarang <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Sudah punya akun?{" "}
              <Link href="/auth/arena-login" className="font-semibold text-violet-600 hover:text-violet-700 hover:underline">
                Masuk ke Arena
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-white/60 text-xs mt-6">
          BahasaCerdas — Platform edukasi Bahasa Indonesia
        </p>
        <p className="text-center text-white/40 text-xs mt-2">
          Butuh bantuan? <a href="mailto:halo@bahasacerdas.com" className="hover:text-white/60">halo@bahasacerdas.com</a>
        </p>
      </div>
    </div>
  );
}
