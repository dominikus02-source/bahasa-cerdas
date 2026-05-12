"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, ArrowRight, Sparkles, Check } from "lucide-react";
import BatikDecoration from "@/components/shared/BatikDecoration";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"GURU" | "MURID">("GURU");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const isFounder = email === "dominus.02@gmail.com";
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, fullName, role }),
          credentials: "include",
        });

        const err = await res.json();
        if (res.ok) {
          router.push(`/${role.toLowerCase()}/beranda`);
        } else if (err.user?.role) {
          router.push(`/${err.user.role.toLowerCase()}/beranda`);
        } else {
          setError(err.error || "Registration failed");
        }
      } catch {
        setError("Terjadi kesalahan");
      }
    }
    setLoading(false);
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
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 flex items-center justify-center shadow-2xl">
              <Image src="/logo.png" alt="BC" width={60} height={60} className="rounded-xl" />
            </div>
            {/* Decorative corner */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-white/30 rounded-tl-lg" />
          </div>
          <h1 className="text-2xl font-bold text-white mt-4">Daftar BahasaCerdas</h1>
          <p className="text-red-100 text-sm mt-1">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-white hover:text-yellow-300 underline">
              Masuk di sini
            </Link>
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full text-red-600 text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  Pilih jenis akun kamu
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole("GURU")}
                  className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all hover:scale-[1.02] ${
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
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${role === "GURU" ? config.bgIcon : "bg-gray-100"}`}>
                    <GraduationCap className={`h-8 w-8 ${role === "GURU" ? config.iconColor : "text-gray-400"}`} />
                  </div>
                  <span className={`font-bold text-lg ${role === "GURU" ? config.textActive : "text-gray-700"}`}>Guru</span>
                  <span className="text-xs text-center text-gray-500">AI RPP, Bank Soal, Kuis Game</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setRole("MURID")}
                  className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all hover:scale-[1.02] ${
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
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${role === "MURID" ? config.bgIcon : "bg-gray-100"}`}>
                    <BookOpen className={`h-8 w-8 ${role === "MURID" ? config.iconColor : "text-gray-400"}`} />
                  </div>
                  <span className={`font-bold text-lg ${role === "MURID" ? config.textActive : "text-gray-700"}`}>Murid</span>
                  <span className="text-xs text-center text-gray-500">Belajar, Kuis, UKBI</span>
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
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 text-sm focus:border-red-500 focus:outline-none transition-colors"
                  placeholder="Drs. Siti Rahayu, M.Pd."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 text-sm focus:border-red-500 focus:outline-none transition-colors"
                  placeholder="siti@sekolah.sch.id"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 text-sm focus:border-red-500 focus:outline-none transition-colors"
                  placeholder="Minimal 8 karakter"
                  minLength={8}
                  required
                />
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

              <p className="text-center text-xs text-gray-400">
                Dengan mendaftar, kamu agree dengan{" "}
                <a href="#" className="text-red-600 underline">Syarat & Ketentuan</a>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-white/60 text-xs mt-6">
          BahasaCerdas — Platform Edukasi Bahasa Indonesia
        </p>
      </div>

      {/* Decorative batik corner - bottom right */}
      <div className="absolute bottom-0 right-0 w-32 h-32 md:w-48 md:h-48 opacity-20">
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 50 Q25 0 50 50 Q75 100 100 50" stroke="white" fill="none" strokeWidth="0.5"/>
          <path d="M0 30 Q25 0 50 30 Q75 60 100 30" stroke="white" fill="none" strokeWidth="0.5"/>
          <path d="M0 70 Q25 40 50 70 Q75 100 100 70" stroke="white" fill="none" strokeWidth="0.5"/>
        </svg>
      </div>
    </div>
  );
}
