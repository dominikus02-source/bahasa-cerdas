"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { GraduationCap, BookOpen, ArrowRight, Check, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { registerUser } from "@/app/actions/register";
import { createClient } from "@/lib/supabase/client";
import { BRAND_LOGO_DARK, BRAND_LOGO_LIGHT, BRAND_TAGLINE } from "@/lib/brand";
import BatikAccent from "@/components/decorations/BatikAccent";

/**
 * REGISTER 3.0 — saudara kembar visual Login 3.0.
 *
 * Dua kolom: brand hero (logo BC 2026 + headline + value cards) di kiri,
 * kartu pendaftaran 2 langkah di kanan (pilih peran → isi data). SELURUH
 * logic auth (create-user, registerUser action, auto sign-in, redirect
 * role-based, error handling, success screen) TIDAK diubah — hanya visual.
 */

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
        if (loginError.message?.includes("rate limit") || loginError.status === 429) {
          setError("Server sedang sibuk. Silakan coba login manual.");
          setLoading(false);
          return;
        }
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
      borderActive: "border-emerald-500 dark:border-emerald-400",
      bgLight: "bg-emerald-50 dark:bg-emerald-500/10",
      textActive: "text-emerald-700 dark:text-emerald-300",
      bgIcon: "bg-emerald-100 dark:bg-emerald-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-300",
    },
    MURID: {
      borderActive: "border-violet-500 dark:border-violet-400",
      bgLight: "bg-violet-50 dark:bg-violet-500/10",
      textActive: "text-violet-700 dark:text-violet-300",
      bgIcon: "bg-violet-100 dark:bg-violet-500/20",
      iconColor: "text-violet-600 dark:text-violet-300",
    },
  };

  const config = roleConfig[role];

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/25";

  const valueCards = [
    { icon: GraduationCap, tint: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300", title: "Untuk Guru", copy: "Mengajar, membuat materi, kelola kelas, dan pantau perkembangan siswa." },
    { icon: BookOpen, tint: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300", title: "Untuk Murid", copy: "Belajar, berlatih, selesaikan tantangan, dan raih prestasi." },
    { icon: ShieldCheck, tint: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300", title: "Aman & Terpercaya", copy: "Data Anda terlindungi dengan standar keamanan terbaik." },
  ];

  const roleCards = [
    { key: "GURU" as const, icon: GraduationCap, label: "Guru", sub: "AI Rencana Pembelajaran, Bank Soal, Kuis Game" },
    { key: "MURID" as const, icon: BookOpen, label: "Murid", sub: "Belajar, Kuis, UKBI" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-indigo-50/60 to-violet-50 px-4 py-8 dark:from-slate-950 dark:via-[#0b1220] dark:to-[#1e1b4b]">
      {/* Dekorasi edukatif ringan — konsisten dengan Login 3.0 */}
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-900/20" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-teal-100/50 blur-3xl dark:bg-teal-900/10" />
      {/* Nuansa batik BahasaCerdas — subtle cultural accent, memudar ke kanan */}
      <BatikAccent />

            {/* Tombol kembali ke Beranda */}
      <div className="relative mx-auto mb-6 flex w-full max-w-6xl">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 text-sm font-semibold text-slate-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-violet-700 dark:hover:bg-violet-500/10 dark:hover:text-violet-300"
          aria-label="Kembali ke Beranda"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Beranda
        </Link>
      </div>

<div className="relative mx-auto grid w-full max-w-6xl items-start gap-10 lg:grid-cols-2 lg:gap-14">
        {/* ── BRAND HERO (identik Login 3.0) ── */}
        <div className="order-2 lg:order-1 lg:sticky lg:top-8">
          <Link href="/" className="inline-flex items-center" aria-label="Beranda BahasaCerdas">
            <Image src={BRAND_LOGO_DARK} alt="BahasaCerdas" width={420} height={96} className="h-24 w-auto object-contain dark:hidden sm:h-28 md:h-32" />
            <Image src={BRAND_LOGO_LIGHT} alt="BahasaCerdas" width={420} height={96} className="hidden h-24 w-auto object-contain dark:inline sm:h-28 md:h-32" />
          </Link>

          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-white md:text-5xl">
            Satu Pintu,
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-teal-500 bg-clip-text text-transparent dark:from-violet-400 dark:to-teal-300">Seribu</span> Kemampuan
            <br />
            <span className="text-slate-900 dark:text-white">Berbahasa</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Bergabung dengan ekosistem yang menghubungkan guru, murid, pembelajaran, dan komunitas Bahasa Indonesia.
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

        {/* ── REGISTER CARD ── */}
        <div className="order-1 lg:order-2">
          <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 md:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Mulai Perjalanan Anda</h2>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Buat akun BahasaCerdas untuk mulai belajar atau mengajar dalam satu ekosistem.
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            {registered ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                  <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Pendaftaran Berhasil!</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Akun <strong>{email}</strong> berhasil dibuat.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {role === "MURID" ? "Kamu bisa langsung masuk ke Arena sekarang." : "Kamu bisa langsung masuk ke dasbor guru."}
                </p>
                <div className="pt-4">
                  <Link
                    href={role === "MURID" ? "/auth/arena-login" : "/login"}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 px-6 font-bold text-white shadow-lg shadow-violet-600/25 transition-all hover:from-violet-700 hover:to-violet-800 dark:from-violet-500 dark:to-violet-600 dark:hover:from-violet-600 dark:hover:to-violet-700"
                  >
                    Masuk Sekarang <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : step === 1 ? (
              <div className="space-y-6">
                <div className="text-center">
                  <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                    Pilih jenis akun kamu
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {roleCards.map((r) => {
                    const c = roleConfig[r.key];
                    const active = role === r.key;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setRole(r.key)}
                        className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 p-4 transition-all active:scale-[0.98] md:p-6 ${
                          active
                            ? `${c.borderActive} ${c.bgLight} shadow-lg`
                            : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600"
                        }`}
                      >
                        {active && (
                          <div className="absolute right-2 top-2">
                            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${c.bgIcon}`}>
                              <Check className={`h-4 w-4 ${c.iconColor}`} />
                            </div>
                          </div>
                        )}
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl md:h-16 md:w-16 ${active ? c.bgIcon : "bg-slate-100 dark:bg-slate-700/50"}`}>
                          <r.icon className={`h-7 w-7 md:h-8 md:w-8 ${active ? c.iconColor : "text-slate-400 dark:text-slate-500"}`} />
                        </div>
                        <span className={`text-base font-bold md:text-lg ${active ? c.textActive : "text-slate-700 dark:text-slate-200"}`}>
                          {r.label}
                        </span>
                        <span className="text-center text-[11px] text-slate-500 dark:text-slate-400 md:text-xs">{r.sub}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 text-base font-bold text-white shadow-lg shadow-violet-600/25 transition-all hover:from-violet-700 hover:to-violet-800 active:scale-[0.99] dark:from-violet-500 dark:to-violet-600 dark:hover:from-violet-600 dark:hover:to-violet-700"
                >
                  Lanjut
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${config.bgLight} ${config.textActive}`}>
                  {role === "GURU" ? <GraduationCap className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                  {role === "GURU" ? "Akun Guru" : "Akun Murid"}
                </span>

                <div>
                  <label htmlFor="fullName" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Nama Lengkap
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputCls}
                    placeholder={role === "GURU" ? "Drs. Siti Rahayu, M.Pd." : "Ahmad Rizki"}
                    autoComplete="name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder="siti@sekolah.sch.id"
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputCls} pr-11`}
                      placeholder="Minimal 8 karakter"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                      aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                <div>
                  <label htmlFor="school" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Asal Sekolah
                  </label>
                  <input
                    id="school"
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className={inputCls}
                    placeholder={role === "GURU" ? "SMA Negeri 1 Jakarta" : "SMP Negeri 2 Bandung"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="city" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Kota/Kabupaten
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={inputCls}
                      placeholder="Jakarta"
                    />
                  </div>
                  <div>
                    <label htmlFor="province" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Provinsi
                    </label>
                    <input
                      id="province"
                      type="text"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className={inputCls}
                      placeholder="DKI Jakarta"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="h-12 flex-1 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    onClick={handleRegister}
                    disabled={loading}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 font-bold text-white shadow-lg shadow-violet-600/25 transition-all hover:from-violet-700 hover:to-violet-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:from-violet-500 dark:to-violet-600 dark:hover:from-violet-600 dark:hover:to-violet-700"
                  >
                    {loading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        Daftar Sekarang
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5 text-center dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sudah punya akun?{" "}
                <Link
                  href={role === "MURID" ? "/auth/arena-login" : "/login"}
                  className="font-semibold text-violet-600 hover:text-violet-700 hover:underline dark:text-violet-400"
                >
                  {role === "MURID" ? "Masuk ke Arena" : "Masuk ke Dasbor Guru"}
                </Link>
              </p>
            </div>
          </div>

          {/* Mobile: value cards compact */}
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

      <p className="relative mt-8 text-center text-xs text-slate-400 dark:text-slate-600">
        BahasaCerdas — {BRAND_TAGLINE}
      </p>
    </div>
  );
}
