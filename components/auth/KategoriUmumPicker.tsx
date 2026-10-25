"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  KATEGORI_UMUM_DESKRIPSI,
  KATEGORI_UMUM_LABEL,
  KATEGORI_UMUM_PILIHAN,
  type KategoriUmumPilihan,
} from "@/lib/auth/kategori-umum";

/**
 * Apakah opsi peran "Umum" boleh ditampilkan. Sumber: GET /api/auth/role-options
 * (flag server ENABLE_ROLE_UMUM). Default false (gagal tertutup) — server tetap
 * menolak UMUM bila flag mati, jadi ini murni urusan tampilan.
 */
export function useRoleUmumAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/role-options", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && Array.isArray(d.roles)) setAvailable(d.roles.includes("UMUM"));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return available;
}

/** Pilihan kategori untuk peran Umum: hanya Mahasiswa, Dosen, Umum. */
export function KategoriUmumPicker({
  value,
  onChange,
  idPrefix = "kategori-umum",
}: {
  value: KategoriUmumPilihan | null;
  onChange: (value: KategoriUmumPilihan) => void;
  idPrefix?: string;
}) {
  return (
    <fieldset className="w-full">
      <legend id={`${idPrefix}-legend`} className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Kamu termasuk…
      </legend>
      <div role="radiogroup" aria-labelledby={`${idPrefix}-legend`} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {KATEGORI_UMUM_PILIHAN.map((k) => {
          const active = value === k;
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={active}
              data-kategori={k}
              onClick={() => onChange(k)}
              className={`relative flex flex-col items-start rounded-xl border-2 px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                active
                  ? "border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-500/10"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
              }`}
            >
              <span className={`flex items-center gap-1.5 text-sm font-bold ${active ? "text-sky-700 dark:text-sky-300" : "text-slate-800 dark:text-slate-100"}`}>
                {active && <Check className="h-4 w-4" aria-hidden />}
                {KATEGORI_UMUM_LABEL[k]}
              </span>
              <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{KATEGORI_UMUM_DESKRIPSI[k]}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
