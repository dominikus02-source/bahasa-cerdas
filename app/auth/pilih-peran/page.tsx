"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BookOpen, Check, GraduationCap, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND_ICON, BRAND_ICON_DARK, BRAND_TAGLINE } from "@/lib/brand";
import BatikAccent from "@/components/decorations/BatikAccent";

/**
 * PILIH PERAN — role selection for NEW Google users.
 *
 * Reached only when Google authentication succeeded but no application User
 * exists yet and no valid role intent was consumed at the callback.
 * Existing users NEVER land here (callbacks preserve their role and redirect).
 *
 * - CTA disabled until a role is chosen.
 * - Idempotent: refresh or retry re-checks provisioning status first, so no
 *   duplicate User can be created.
 */
type Role = "GURU" | "MURID";

const ROLE_CARDS: { key: Role; title: string; copy: string }[] = [
  {
    key: "GURU",
    title: "Guru",
    copy: "Mengajar, membuat latihan, dan mendampingi murid.",
  },
  {
    key: "MURID",
    title: "Murid",
    copy: "Belajar, berlatih, dan mengembangkan kemampuanmu.",
  },
];

export default function PilihPeranPage() {
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [next, setNext] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextParam = params.get("next") || "";
    if (nextParam) setNext(nextParam);

    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          window.location.href = "/login";
          return;
        }
        const res = await fetch("/api/auth/complete-role", { cache: "no-store" });
        const status = await res.json().catch(() => ({}));
        if (!status.session) {
          window.location.href = "/login";
          return;
        }
        if (status.provisioned && status.redirect) {
          window.location.href = status.redirect;
          return;
        }
      } catch {
        // Stay on the page; submission will surface any session problem.
      }
      setChecking(false);
    })();
  }, []);

  const handleContinue = async () => {
    if (!role || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/auth/complete-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, next: next || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan peran. Silakan coba lagi.");
        setSaving(false);
        return;
      }
      window.location.href = data.redirect || (role === "MURID" ? "/arena" : "/guru/beranda");
    } catch {
      setError("Koneksi terputus. Periksa koneksi internet kamu.");
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-indigo-50/60 to-violet-50 px-4 py-8 dark:from-slate-950 dark:via-[#0b1220] dark:to-[#1e1b4b]">
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-900/20" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-teal-100/50 blur-3xl dark:bg-teal-900/10" />
      <BatikAccent />

      <div className="relative mx-auto flex min-h-[80vh] w-full max-w-2xl flex-col items-center justify-center">
        <div className="flex items-center gap-3">
          <Image src={BRAND_ICON_DARK} alt="Logo BahasaCerdas" width={56} height={56} className="h-12 w-12 object-contain dark:hidden" />
          <Image src={BRAND_ICON} alt="Logo BahasaCerdas" width={56} height={56} className="hidden h-12 w-12 object-contain dark:inline" />
          <span className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">BahasaCerdas</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{BRAND_TAGLINE}</span>
          </span>
        </div>

        <h1 className="mt-6 text-center text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Selamat datang di BahasaCerdas
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-300">
          Bagaimana kamu akan menggunakan BahasaCerdas?
        </p>

        {error && (
          <div className="mt-4 flex w-full items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
            {error}
          </div>
        )}

        <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4" role="radiogroup" aria-label="Pilih peran">
          {ROLE_CARDS.map((r) => {
            const active = role === r.key;
            const isGuru = r.key === "GURU";
            const Icon = isGuru ? GraduationCap : BookOpen;
            return (
              <button
                key={r.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setRole(r.key)}
                className={`relative flex w-full items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.99] ${
                  active
                    ? isGuru
                      ? "border-emerald-500 bg-emerald-50 shadow-lg dark:border-emerald-400 dark:bg-emerald-500/10"
                      : "border-violet-500 bg-violet-50 shadow-lg dark:border-violet-400 dark:bg-violet-500/10"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                }`}
              >
                {active && (
                  <div className="absolute right-3 top-3">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full ${isGuru ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-violet-100 dark:bg-violet-500/20"}`}>
                      <Check className={`h-4 w-4 ${isGuru ? "text-emerald-600 dark:text-emerald-300" : "text-violet-600 dark:text-violet-300"}`} />
                    </div>
                  </div>
                )}
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${active ? (isGuru ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-violet-100 dark:bg-violet-500/20") : "bg-slate-100 dark:bg-slate-700/50"}`}>
                  <Icon className={`h-7 w-7 ${active ? (isGuru ? "text-emerald-600 dark:text-emerald-300" : "text-violet-600 dark:text-violet-300") : "text-slate-400 dark:text-slate-500"}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-lg font-bold ${active ? (isGuru ? "text-emerald-700 dark:text-emerald-300" : "text-violet-700 dark:text-violet-300") : "text-slate-700 dark:text-slate-200"}`}>
                    {r.title}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{r.copy}</p>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!role || saving}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 text-base font-bold text-white shadow-lg shadow-violet-600/25 transition-all hover:from-violet-700 hover:to-violet-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:from-violet-500 dark:to-violet-600 dark:hover:from-violet-600 dark:hover:to-violet-700"
        >
          {saving ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            "LANJUTKAN"
          )}
        </button>
        <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
          Pilihan ini menentukan pengalamanmu di BahasaCerdas.
        </p>
      </div>
    </div>
  );
}
