// ─── ThemeCard (Bank Soal Discovery Hub) ─────────────────────
// Card tema yang terasa "clickable" — bukan record database:
// cover prosedural (ThemeCoverArt) + metadata + hover halus.
// Primary click = behavior existing (modal Siapkan Latihan).
// Keyboard accessible (elemen <button>), motion menghormati
// prefers-reduced-motion via motion-safe:.

import { ChevronRight } from "lucide-react";
import {
  categoryVisual,
  themeVariant,
  ThemeCoverArt,
} from "./theme-cover";

/** Data minimal card — ThemeData (superset) cocok secara structural. */
export interface ThemeCardData {
  name: string;
  total: number;
  kelas: string[];
}

/**
 * Card menerima tipe tema apa pun yang MEMILIKI field minimal —
 * caller menyediakan onOpen bertipe sama sehingga ThemeData penuh
 * (dengan difficulties, dsb.) tetap utuh sampai handler existing.
 */
export function ThemeCard<T extends ThemeCardData>({
  theme,
  onOpen,
}: {
  theme: T;
  onOpen: (theme: T) => void;
}) {
  const catKey = getCategoryKeyOf(theme.name);
  const visual = categoryVisual(catKey);
  const variant = themeVariant(theme.name);
  const kelasLabel =
    theme.kelas.length > 0
      ? `Kls ${[...theme.kelas].sort((a, b) => Number(a) - Number(b)).join(", ")}`
      : null;

  return (
    <button
      type="button"
      onClick={() => onOpen(theme)}
      aria-label={`${theme.name} — ${theme.total} soal${kelasLabel ? `, ${kelasLabel}` : ""}. Klik untuk membuat latihan.`}
      className="group relative text-left rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 motion-safe:transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
    >
      <ThemeCoverArt visual={visual} variant={variant} name={theme.name} />

      <div className="p-3">
        <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 min-h-[2.5rem]">
          {theme.name}
        </p>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${visual.softBg} ${visual.softText}`}
          >
            {theme.total} soal
          </span>
          {kelasLabel ? (
            <span className="text-[10px] font-medium text-gray-400">{kelasLabel}</span>
          ) : null}
          <span className="ml-auto text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 motion-safe:transition-all" aria-hidden>
            <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </button>
  );
}

/** Duplikasi ringan matcher kategori (sumber: page Bank Soal). */
function getCategoryKeyOf(name: string): string {
  const patterns: [string, RegExp][] = [
    ["Tata Bahasa", /^(SPOK|Kalimat|Kalimat Efektif|Paragraf|Ide Pokok|Gagasan Utama|Simpulan|Sinonim|Antonim|Makna Kata|Imbuhan|Kata Baku|Kata Tidak Baku|PUEBI|Ejaan|Tanda Baca)$/],
    ["Sastra", /^(Majas|Puisi|Pantun|Syair|Gurindam|Cerpen|Novel|Drama|Fabel|Legenda|Hikayat|Mitos|Cerita Inspiratif|Anekdot)$/],
    ["Jenis Teks", /^(Teks Deskripsi|Teks Narasi|Teks Eksposisi|Teks Eksplanasi|Teks Persuasi|Teks Argumentasi|Teks Prosedur|Teks Berita|Teks Ulasan|Resensi|Editorial|Artikel)$/],
    ["Fungsional", /^(Surat Pribadi|Surat Dinas|Proposal|Pidato|Poster|Iklan|Slogan)$/],
  ];
  for (const [key, re] of patterns) if (re.test(name)) return key;
  return "Lainnya";
}
