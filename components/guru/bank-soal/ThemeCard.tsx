// ─── ThemeCard (Bank Soal — Canonical) ──────────────────────
// Single canonical card system for ALL 77 themes.
// Fixed dimensions. No content-driven height. No legacy patterns.
// Illustration + solid category color. Clean editorial.

import { ChevronRight } from "lucide-react";
import {
  categoryVisual,
  ThemeCoverArt,
} from "./theme-cover";
import { getThemeVisual } from "./theme-config";

export interface ThemeCardData {
  name: string;
  total: number;
  kelas: string[];
}

export function ThemeCard<T extends ThemeCardData>({
  theme,
  onOpen,
}: {
  theme: T;
  onOpen: (theme: T) => void;
}) {
  const catKey = getCategoryKeyOf(theme.name);
  const visual = categoryVisual(catKey);
  const themeVis = getThemeVisual(theme.name);
  const kelasLabel =
    theme.kelas.length > 0
      ? `Kls ${[...theme.kelas].sort((a, b) => Number(a) - Number(b)).join(", ")}`
      : null;

  return (
    <button
      type="button"
      onClick={() => onOpen(theme)}
      aria-label={`${theme.name} — ${theme.total} soal${kelasLabel ? `, ${kelasLabel}` : ""}. Klik untuk membuat latihan.`}
      className="group relative text-left rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 motion-safe:transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 flex flex-col h-[220px]"
    >
      {/* Visual header — FIXED h-24, always rendered */}
      <ThemeCoverArt
        visual={visual}
        name={theme.name}
        iconKey={themeVis.icon}
        illustrationKey={themeVis.illustration}
        className="h-24 shrink-0"
      />

      {/* Content body — fixed height, flex-col */}
      <div className="p-3 flex flex-col flex-1 min-h-0">
        {/* Title — always 1 line */}
        <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-1">
          {theme.name}
        </p>

        {/* Tagline — always 1 line, fixed space */}
        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1 min-h-[14px]">
          {themeVis.tagline ?? "\u00A0"}
        </p>

        {/* Spacer pushes metadata to bottom */}
        <div className="flex-1" />

        {/* Metadata — always at bottom */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${visual.softBg} ${visual.softText}`}
          >
            {theme.total} soal
          </span>
          {kelasLabel ? (
            <span className="text-[10px] font-medium text-gray-400 truncate">{kelasLabel}</span>
          ) : null}
          <span className="ml-auto text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 motion-safe:transition-all shrink-0" aria-hidden>
            <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </button>
  );
}

function getCategoryKeyOf(name: string): string {
  const patterns: [string, RegExp][] = [
    ["Tata Bahasa", /^(SPOK|Kalimat|Kalimat Efektif|Paragraf|Ide Pokok|Gagasan Utama|Simpulan|Sinonim|Antonim|Makna Kata|Imbuhan|Kata Baku|Kata Tidak Baku|PUEBI|Ejaan|Tanda Baca|Peribahasa dan Ungkapan|Fakta dan Opini)$/],
    ["Sastra", /^(Majas|Puisi|Pantun|Syair|Gurindam|Cerpen|Novel|Drama|Fabel|Legenda|Hikayat|Mitos|Cerita Inspiratif|Anekdot|Buku Fiksi dan Nonfiksi)$/],
    ["Jenis Teks", /^(Teks Deskripsi|Teks Narasi|Teks Eksposisi|Teks Eksplanasi|Teks Persuasi|Teks Argumentasi|Teks Prosedur|Teks Berita|Teks Ulasan|Resensi|Editorial|Artikel|Teks Biografi|Teks Diskusi|Teks Negosiasi|Teks Tanggapan Kritis|Laporan Hasil Observasi)$/],
    ["Fungsional", /^(Surat Pribadi|Surat Dinas|Proposal|Pidato|Poster|Iklan|Slogan)$/],
  ];
  for (const [key, re] of patterns) if (re.test(name)) return key;
  return "Lainnya";
}
