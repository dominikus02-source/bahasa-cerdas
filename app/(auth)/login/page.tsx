"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogIn, Eye, EyeOff, ShieldCheck, GraduationCap, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND_LOGO_DARK, BRAND_ICON, BRAND_TAGLINE } from "@/lib/brand";

/**
 * LOGIN 3.0 — gerbang utama ekosistem BahasaCerdas (netral guru & murid).
 *
 * Dua kolom: brand hero (logo BC 2026 + headline + value cards) di kiri,
 * kartu login bersih di kanan. Light = pengalaman utama (putih → lavender
 * lembut); dark = variant lengkap. SELURUH logic auth (password, Google OAuth,
 * retry 429, role redirect, forgot-password) TIDAK diubah — hanya visual.
 */

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [next, setNext] = useState("");

  useEffect(() => {
    // Clear any stale Supabase cookies + sign out to ensure fresh auth state
    const supabase = createClient();
    supabase.auth.signOut().catch(() => {});
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      if (name.startsWith("sb-") || name.startsWith("supabase-")) {
        document.cookie = `${name}=; max-age=0; path=/; domain=.bahasacerdas.com`;
        document.cookie = `${name}=; max-age=0; path=/`;
      }
    });

    const params = new URLSearchParams(window.location.search);
    const nextParam = params.get("next") || "";
    if (nextParam) {
      setNext(nextParam);
    }
    if (params.get("error")) {
      setError(params.get("error") || "");
      window.history.replaceState({}, "", "/login" + (nextParam ? `?next=${nextParam}` : ""));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // Retry otomatis saat Supabase 429 (rate limit per-IP, kapasitas bucket
      // 30). Murid sekelas berbagi satu IP sekolah — yang lolos 30 pertama,
      // sisanya menunggu refill ~1,7/detik lalu dicoba lagi otomatis.
      let result: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>> | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await supabase.auth.signInWithPassword({
          email: email.toLowerCase(),
          password,
        });
        if (!res.error || res.error.status !== 429 || attempt === 3) {
          result = res;
          break;
        }
        await new Promise((r) => setTimeout(r, 4000 * attempt));
      }
      const authError = result?.error;
      const user = result?.data?.user;

      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Email atau kata sandi salah"
            : authError.message === "Email not confirmed"
            ? "Email belum dikonfirmasi. Cek inbox/spam kamu."
            : authError.status === 429
            ? "Sementara ini banyak murid login dari jaringan sekolah ini secara bersamaan. Tunggu sebentar lalu coba lagi — akunmu tidak bermasalah."
            : authError.message
        );
        setLoading(false);
        return;
      }

      if (!user) {
        setError("Gagal masuk. Silakan coba lagi.");
        setLoading(false);
        return;
      }

      // Create/get user in DB by passing client-side auth data directly
      // (avoids cookie-based server auth issues with Supabase SSR)
      const createRes = await fetch("/api/user/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseId: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name,
          role: user.user_metadata?.role || "MURID",
        }),
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
          const errMsg = createData?.error || "Akun belum terdaftar. Silakan daftar terlebih dahulu.";
          // If server error, try simpler upsert endpoint as fallback
          if (createRes.status >= 500) {
            const retryRes = await fetch("/api/user/simple-upsert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                supabaseId: user.id,
                email: user.email,
                fullName: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
                role: user.user_metadata?.role || "MURID",
              }),
            });
            if (retryRes.ok) {
            const retryData = await retryRes.json();
            const dbUser = retryData?.user;
            if (dbUser) {
              const target = next && !next.startsWith("/login") && !next.startsWith("/register")
                ? next
                : dbUser.isFounder ? "/admin" : dbUser.role === "MURID" ? "/arena" : `/${dbUser.role.toLowerCase()}/beranda`;
              window.location.href = target;
              return;
            }
          }
          }
          await supabase.auth.signOut();
          setError(errMsg);
          setLoading(false);
          return;
        }
      const dbUser = createData?.user;

      if (!dbUser) { setError("Gagal memuat data user"); setLoading(false); return; }

      // Redirect back to previous page if coming from marketplace or other public page
      const target = next && !next.startsWith("/login") && !next.startsWith("/register")
        ? next
        : dbUser.isFounder ? "/admin" : dbUser.role === "MURID" ? "/arena" : `/${dbUser.role.toLowerCase()}/beranda`;
      window.location.href = target;
    } catch (err: any) {
      console.error("Login error:", err);
      setError(
        err?.status === 429
          ? "Terlalu banyak murid login dari jaringan sekolah ini secara bersamaan. Tunggu sekitar 5 menit, lalu coba lagi — akunmu tidak bermasalah."
          : err?.message?.includes("Failed to fetch")
          ? "Koneksi terputus. Periksa koneksi internet kamu."
          : "Terjadi kesalahan. Silakan coba lagi."
      );
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin || "https://www.bahasacerdas.com";
      const supabase = createClient();
      const redirectTo = next
        ? `${baseUrl}/api/auth/callback?next=${encodeURIComponent(next)}`
        : `${baseUrl}/api/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) setError(error.message);
    } catch {
      setError("Gagal login dengan Google");
    }
    setGoogleLoading(false);
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/25";

  const valueCards = [
    { icon: GraduationCap, tint: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300", title: "Untuk Guru", copy: "Mengajar, membuat materi, kelola kelas, dan pantau perkembangan siswa." },
    { icon: BookOpen, tint: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300", title: "Untuk Murid", copy: "Belajar, berlatih, selesaikan tantangan, dan raih prestasi." },
    { icon: ShieldCheck, tint: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300", title: "Aman & Terpercaya", copy: "Data Anda terlindungi dengan standar keamanan terbaik." },
  ];

  const ecosystem = [
    { title: "AI BC", copy: "AI cerdas untuk pembelajaran adaptif" },
    { title: "Materi & Latihan", copy: "Ribuan materi dan latihan sesuai kebutuhan" },
    { title: "Arena & Prestasi", copy: "Tantangan seru dan sistem poin yang memotivasi" },
    { title: "Aman & Terpercaya", copy: "Sistem keamanan berstandar tinggi untuk data Anda" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-indigo-50/60 to-violet-50 px-4 py-8 dark:from-slate-950 dark:via-[#0b1220] dark:to-[#1e1b4b]">
      {/* Dekorasi edukatif ringan — tidak mengganggu form */}
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-900/20" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-teal-100/50 blur-3xl dark:bg-teal-900/10" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        {/* ── BRAND HERO ── */}
        <div className="order-2 lg:order-1">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Beranda BahasaCerdas">
            <Image src={BRAND_ICON} alt="" width={40} height={40} className="h-9 w-9 object-contain" />
            <Image src={BRAND_LOGO_DARK} alt="BahasaCerdas" width={200} height={44} className="h-9 w-auto object-contain dark:hidden" />
            <span className="hidden text-lg font-extrabold text-white dark:inline">BahasaCerdas</span>
          </Link>

          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-white md:text-5xl">
            Satu Pintu,
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-teal-500 bg-clip-text text-transparent dark:from-violet-400 dark:to-teal-300">Seribu</span> Kemampuan
            <br />
            <span className="text-slate-900 dark:text-white">Berbahasa</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Masuk dengan akun Anda — sistem kami mengenali peran Anda secara otomatis dan mengarahkan ke dasbor yang tepat.
          </p>

          <div className="mt-6 hidden space-y-2.5 lg:block">
            {valueCards.map((v) => (
              <div key={v.title} className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${v.tint}`}>
                  <v.icon size={17} />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{v.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{v.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── LOGIN CARD ── */}
        <div className="order-1 lg:order-2">
          <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 md:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Selamat datang kembali!</h2>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Masuk ke BahasaCerdas untuk melanjutkan perjalanan belajar dan mengajar Anda.
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            >
              {googleLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {googleLoading ? "Memproses..." : "Masuk dengan Google"}
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 dark:bg-slate-900 dark:text-slate-500">atau masuk dengan email</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Email atau Username
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="nama@sekolah.sch.id atau username"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Kata Sandi
                  </label>
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
                  }} className="text-xs font-medium text-violet-600 hover:text-violet-700 hover:underline dark:text-violet-400">
                    Lupa kata sandi?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputCls} pr-11`}
                    placeholder="Masukkan kata sandi"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 accent-violet-600"
                />
                Ingat saya
              </label>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 text-base font-bold text-white shadow-lg shadow-violet-600/25 transition-all hover:from-violet-700 hover:to-violet-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:from-violet-500 dark:to-violet-600 dark:hover:from-violet-600 dark:hover:to-violet-700"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    Masuk Sekarang
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5 text-center dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Belum punya akun?{" "}
                <Link href="/register" className="font-semibold text-violet-600 hover:text-violet-700 hover:underline dark:text-violet-400">
                  Daftar sekarang
                </Link>
              </p>
            </div>
          </div>

          {/* Mobile: value cards compact (desktop tampil di kiri) */}
          <div className="mt-5 grid gap-2 lg:hidden">
            {valueCards.map((v) => (
              <div key={v.title} className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${v.tint}`}>
                  <v.icon size={15} />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{v.title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{v.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ECOSYSTEM STRIP (desktop) ── */}
      <div className="relative mx-auto mt-10 hidden max-w-6xl grid-cols-4 gap-3 lg:grid">
        {ecosystem.map((e) => (
          <div key={e.title} className="rounded-2xl border border-slate-200/60 bg-white/60 px-4 py-3 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{e.title}</p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{e.copy}</p>
          </div>
        ))}
      </div>

      <p className="relative mt-8 text-center text-xs text-slate-400 dark:text-slate-600">
        BahasaCerdas — {BRAND_TAGLINE}
      </p>
    </div>
  );
}
