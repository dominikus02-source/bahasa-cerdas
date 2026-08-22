"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { GraduationCap, BookOpen, ArrowRight, ArrowLeft, Check, Eye, EyeOff, ShieldCheck, AlertTriangle } from "lucide-react";
import { registerUser } from "@/app/actions/register";
import { createClient } from "@/lib/supabase/client";
import { BRAND_ICON, BRAND_ICON_DARK, BRAND_TAGLINE } from "@/lib/brand";
import BatikAccent from "@/components/decorations/BatikAccent";

/**
 * REGISTER 4.0 — Role Gate 1.0
 *
 * 4-step wizard: Pilih Peran → Formulir → Konfirmasi Peran → Konfirmasi Data
 * No default role — user MUST explicitly choose GURU or MURID.
 * Account creation ONLY after final confirmation.
 */

type Role = "GURU" | "MURID";

const STEPS = ["Pilih Peran", "Formulir", "Konfirmasi Peran", "Konfirmasi Data"];
const TOTAL_STEPS = 4;

const ROLE_CONFIG: Record<Role, {
  borderActive: string;
  bgLight: string;
  textActive: string;
  bgIcon: string;
  iconColor: string;
  label: string;
  formTitle: string;
  features: string[];
}> = {
  GURU: {
    borderActive: "border-emerald-500 dark:border-emerald-400",
    bgLight: "bg-emerald-50 dark:bg-emerald-500/10",
    textActive: "text-emerald-700 dark:text-emerald-300",
    bgIcon: "bg-emerald-100 dark:bg-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-300",
    label: "Guru",
    formTitle: "Pendaftaran Guru",
    features: [
      "Buat Rencana Pembelajaran dengan AI",
      "Bank Soal & Kuis Game interaktif",
      "Kelola kelas dan pantau perkembangan siswa",
      "Akses Pusat Literasi & Komunitas Guru",
    ],
  },
  MURID: {
    borderActive: "border-violet-500 dark:border-violet-400",
    bgLight: "bg-violet-50 dark:bg-violet-500/10",
    textActive: "text-violet-700 dark:text-violet-300",
    bgIcon: "bg-violet-100 dark:bg-violet-500/20",
    iconColor: "text-violet-600 dark:text-violet-300",
    label: "Murid",
    formTitle: "Pendaftaran Murid",
    features: [
      "Belajar Bahasa Indonesia dengan Jalur Cerdas",
      "Latihan soal UKBI & TKA",
      "Ikuti permainan & raih prestasi",
      "Tulis karya dan bangun portofolio",
    ],
  },
};

const ROLE_CARDS = [
  { key: "GURU" as const, icon: GraduationCap, label: "Guru", sub: "AI Rencana Pembelajaran, Bank Soal, Kuis Game" },
  { key: "MURID" as const, icon: BookOpen, label: "Murid", sub: "Belajar, Kuis, UKBI" },
];

function StepBadge({ current }: { current: number }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2" role="navigation" aria-label="Langkah pendaftaran">
      {STEPS.map((s, i) => {
        const num = i + 1;
        const isActive = num === current;
        const isDone = num < current;
        return (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                isDone
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                  : isActive
                  ? "bg-violet-600 text-white dark:bg-violet-500"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              {isDone ? <Check className="h-4 w-4" /> : num}
            </div>
            {i < TOTAL_STEPS - 1 && (
              <div
                className={`h-px w-6 md:w-10 ${
                  isDone ? "bg-emerald-300 dark:bg-emerald-600" : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [school, setSchool] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);

  const config = role ? ROLE_CONFIG[role] : null;

  const handleRoleSelect = (r: Role) => {
    setRole(r);
  };

  const goToStep2 = () => {
    if (!role) return;
    setStep(2);
  };

  const goToStep3 = () => {
    if (!role) return;
    setStep(3);
  };

  const goToStep4 = () => {
    setStep(4);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
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
        setRegistered(true);
        setLoading(false);
        return;
      }

      const redirectUrl = role === "MURID" ? "/arena" : "/guru/beranda";
      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan");
      setLoading(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/25";

  const valueCards = [
    { icon: GraduationCap, tint: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300", title: "Untuk Guru", copy: "Mengajar, membuat materi, kelola kelas, dan pantau perkembangan siswa." },
    { icon: BookOpen, tint: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300", title: "Untuk Murid", copy: "Belajar, berlatih, selesaikan tantangan, dan raih prestasi." },
    { icon: ShieldCheck, tint: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300", title: "Aman & Terpercaya", copy: "Data Anda terlindungi dengan standar keamanan terbaik." },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-indigo-50/60 to-violet-50 px-4 py-8 dark:from-slate-950 dark:via-[#0b1220] dark:to-[#1e1b4b]">
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-900/20" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-teal-100/50 blur-3xl dark:bg-teal-900/10" />
      <BatikAccent />

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
        <div className="order-2 lg:order-1 lg:sticky lg:top-8">
          <Link href="/" className="inline-flex items-center gap-4" aria-label="Beranda BahasaCerdas">
            <Image src={BRAND_ICON_DARK} alt="Logo BahasaCerdas" width={72} height={72} className="h-16 w-16 object-contain dark:hidden md:h-20 md:w-20" />
            <Image src={BRAND_ICON} alt="Logo BahasaCerdas" width={72} height={72} className="hidden h-16 w-16 object-contain dark:inline md:h-20 md:w-20" />
            <span className="flex flex-col">
              <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">BahasaCerdas</span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{BRAND_TAGLINE}</span>
            </span>
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

        <div className="order-1 lg:order-2">
          <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 md:p-8">
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
            ) : (
              <>
                <div className="mb-2 text-center">
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Mulai Perjalanan Anda</h2>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    Buat akun BahasaCerdas untuk mulai belajar atau mengajar.
                  </p>
                </div>

                <StepBadge current={step} />

                {error && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    {error}
                  </div>
                )}

                {/* Step 1: Pilih Peran */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                        Pilih jenis akun kamu
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      {ROLE_CARDS.map((r) => {
                        const c = ROLE_CONFIG[r.key];
                        const active = role === r.key;
                        return (
                          <button
                            key={r.key}
                            type="button"
                            onClick={() => handleRoleSelect(r.key)}
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
                      onClick={goToStep2}
                      disabled={!role}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 text-base font-bold text-white shadow-lg shadow-violet-600/25 transition-all hover:from-violet-700 hover:to-violet-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:from-violet-500 dark:to-violet-600 dark:hover:from-violet-600 dark:hover:to-violet-700"
                    >
                      Lanjut
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {/* Step 2: Formulir */}
                {step === 2 && config && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setStep(1)} className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300" aria-label="Kembali ke pilihan peran">
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${config.bgLight} ${config.textActive}`}>
                        {role === "GURU" ? <GraduationCap className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                        {config.formTitle}
                      </span>
                    </div>

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
                        type="button"
                        onClick={goToStep3}
                        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 font-bold text-white shadow-lg shadow-violet-600/25 transition-all hover:from-violet-700 hover:to-violet-800 active:scale-[0.99] dark:from-violet-500 dark:to-violet-600 dark:hover:from-violet-600 dark:hover:to-violet-700"
                      >
                        Lanjut
                        <ArrowRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Konfirmasi Peran */}
                {step === 3 && config && role && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setStep(2)} className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300" aria-label="Kembali ke formulir">
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Konfirmasi Peran</span>
                    </div>

                    <div className={`rounded-2xl border-2 p-5 ${config.borderActive} ${config.bgLight}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.bgIcon}`}>
                          {role === "GURU" ? (
                            <GraduationCap className={`h-6 w-6 ${config.iconColor}`} />
                          ) : (
                            <BookOpen className={`h-6 w-6 ${config.iconColor}`} />
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">Akun {config.label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Peran ini menentukan pengalaman kamu di BahasaCerdas</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dengan akun ini, kamu bisa:</p>
                      {config.features.map((f) => (
                        <div key={f} className="flex items-start gap-2.5">
                          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${config.bgIcon}`}>
                            <Check className={`h-3 w-3 ${config.iconColor}`} />
                          </div>
                          <span className="text-sm text-slate-600 dark:text-slate-300">{f}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Pilihan peran ini menentukan pengalaman kamu. Kamu bisa menghubungi dukungan untuk mengubah peran nanti.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="h-12 flex-1 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Kembali
                      </button>
                      <button
                        type="button"
                        onClick={goToStep4}
                        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 font-bold text-white shadow-lg shadow-violet-600/25 transition-all hover:from-violet-700 hover:to-violet-800 active:scale-[0.99] dark:from-violet-500 dark:to-violet-600 dark:hover:from-violet-600 dark:hover:to-violet-700"
                      >
                        Konfirmasi Peran
                        <ArrowRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Konfirmasi Data */}
                {step === 4 && config && role && (
                  <form onSubmit={handleRegister} className="space-y-5">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setStep(3)} className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300" aria-label="Kembali ke konfirmasi peran">
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Konfirmasi Data</span>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Pastikan data kamu sudah benar sebelum membuat akun.
                    </p>

                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Peran</span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.bgLight} ${config.textActive}`}>
                          {role === "GURU" ? <GraduationCap className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                          {config.label}
                        </span>
                      </div>
                      <div className="h-px bg-slate-200 dark:bg-slate-700" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Nama</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{fullName || "-"}</span>
                      </div>
                      <div className="h-px bg-slate-200 dark:bg-slate-700" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Email</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{email || "-"}</span>
                      </div>
                      {school && (
                        <>
                          <div className="h-px bg-slate-200 dark:bg-slate-700" />
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Sekolah</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{school}</span>
                          </div>
                        </>
                      )}
                      {(city || province) && (
                        <>
                          <div className="h-px bg-slate-200 dark:bg-slate-700" />
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Lokasi</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {[city, province].filter(Boolean).join(", ")}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="h-12 flex-1 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Kembali
                      </button>
                      <button
                        type="submit"
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
                  </form>
                )}

                <div className="mt-6 border-t border-slate-100 pt-5 text-center dark:border-slate-800">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Sudah punya akun?{" "}
                    <Link
                      href="/login"
                      className="font-semibold text-violet-600 hover:text-violet-700 hover:underline dark:text-violet-400"
                    >
                      Masuk
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>

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
