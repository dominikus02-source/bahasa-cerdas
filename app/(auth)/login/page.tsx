"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LogIn, Eye, EyeOff, Chrome, Mail } from "lucide-react";
import BatikDecoration from "@/components/shared/BatikDecoration";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setError(params.get("error") || "");
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (authError) {
        setError(authError.message === "Invalid login credentials"
          ? "Email atau password salah"
          : authError.message === "Email not confirmed"
          ? "Email belum dikonfirmasi. Cek inbox/spam kamu."
          : authError.message
        );
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Gagal masuk. Silakan coba lagi.");
        setLoading(false);
        return;
      }

      let res = await fetch("/api/user/me");
      if (!res.ok) {
        const createRes = await fetch("/api/user/me", { method: "POST" });
        if (!createRes.ok) {
          await supabase.auth.signOut();
          setError("Akun belum terdaftar. Silakan daftar terlebih dahulu.");
          setLoading(false);
          return;
        }
        res = await fetch("/api/user/me");
      }

      const { user: dbUser } = await res.json();
      window.location.href = dbUser.isFounder ? "/admin" : `/${dbUser.role.toLowerCase()}/beranda`;
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) setError(error.message);
    } catch {
      setError("Gagal login dengan Google");
    }
    setGoogleLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 via-red-700 to-blue-900 relative overflow-hidden px-4 py-8">
      <BatikDecoration />
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-to-br from-black/10 to-transparent" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-black/10 to-transparent" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-1 text-white/50 hover:text-white text-xs mb-3 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Beranda
          </Link>
          <Image src="/logo.png" alt="BahasaCerdas" width={64} height={64} className="mx-auto" />
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Masuk</h1>
            <p className="text-sm text-gray-500">Selamat datang di BahasaCerdas</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 md:p-4 text-sm text-red-700 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full shrink-0"></span>
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all mb-4"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? "Memproses..." : "Masuk dengan Google"}
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">atau masuk dengan email</span></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-red-500 focus:outline-none transition-colors bg-white"
                placeholder="guru@sekolah.sch.id"
                required
              />
            </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Password</label>
                  <button type="button" onClick={async () => {
                    const emailVal = email.trim();
                    if (!emailVal) { setError("Masukkan email dulu"); return; }
                    setLoading(true);
                    try {
                      const res = await fetch("/api/auth/forgot-password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: emailVal.toLowerCase() }),
                      });
                      const data = await res.json();
                      setError(data.message || data.error || "Terjadi kesalahan");
                    } catch { setError("Gagal mengirim email"); }
                    setLoading(false);
                  }} className="text-xs text-red-600 hover:text-red-700 hover:underline font-medium">
                    Lupa password?
                  </button>
                </div>
                <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-red-500 focus:outline-none transition-colors bg-white"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold text-base shadow-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Masuk
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Belum punya akun?{" "}
              <Link href="/register" className="font-semibold text-red-600 hover:text-red-700 hover:underline">
                Daftar di sini
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-white/60 text-xs mt-6 px-4">
          BahasaCerdas — Platform Edukasi Bahasa Indonesia
        </p>
      </div>
    </div>
  );
}
