"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  /** Route aman bila history browser tidak tersedia / berasal dari login. */
  fallback: string;
  label?: string;
  iconOnly?: boolean;
  className?: string;
}

/**
 * Tombol Kembali konsisten untuk seluruh Student Shell & Arena web.
 * router.back() dengan guard: bila history kosong (deep-link) atau halaman
 * sebelumnya adalah login, fallback route dipakai — tidak pernah keluar
 * aplikasi / mendarat di halaman login.
 */
export function BackButton({ fallback, label = "Kembali", iconOnly = false, className = "" }: BackButtonProps) {
  const router = useRouter();

  const goBack = () => {
    const safe =
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      !document.referrer.includes("/login");
    if (safe) router.back();
    else router.replace(fallback);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors dark:text-slate-400 dark:hover:text-violet-300 dark:hover:bg-slate-800 ${
        iconOnly ? "p-2" : "px-2.5 py-2"
      } ${className}`}
    >
      <ArrowLeft className="w-4 h-4 shrink-0" />
      {!iconOnly && <span className="shell-label">{label}</span>}
    </button>
  );
}