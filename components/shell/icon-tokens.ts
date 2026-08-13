/**
 * CANONICAL ICON SYSTEM — BahasaCerdas (Phase 5.1).
 * Satu sumber token ikon untuk SEMUA navigation/shell (Murid/Arena/Obrolan/Guru/Admin).
 * Library tunggal: lucide-react (JANGAN tambah library ikon lain).
 *
 * Tokens:
 * - NAV: 22px, strokeWidth 2, inactive slate-500 (#64748B) / dark slate-400, active violet.
 * - ACTION (header/button): 18–20px.
 * - DISCLOSURE (chevron kecil): 18px.
 */
export const NAV_ICON_CLASS = "w-[22px] h-[22px] shrink-0";
export const NAV_ICON_STROKE = 2;

/** Ikon nav — tidak aktif: slate (muted), hover naik kontrasnya. */
export const NAV_ICON_INACTIVE =
 "text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200";
/** Ikon nav — aktif: violet (semua role). */
export const NAV_ICON_ACTIVE = "text-violet-600 dark:text-violet-300";

/** Link nav — kerangka bersama (termasuk kelas shell-link untuk collapse CSS). */
export const NAV_LINK_BASE =
  "shell-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-all duration-200";
/** Link nav — aktif: violet-50 bg + violet teks + semibold. */
export const NAV_LINK_ACTIVE =
 "bg-violet-50 text-violet-700 font-semibold dark:bg-violet-500/15 dark:text-violet-300";
/** Link nav — tidak aktif: slate teks + hover subtle bg + naik kontras. */
export const NAV_LINK_INACTIVE =
 "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-300 :bg-slate-800 dark:hover:text-white";

/** Ikon header/aksi (tombol): 20px. */
export const ACTION_ICON_CLASS = "w-5 h-5 shrink-0";
/** Ikon disclosure kecil (chevron/expand): 18px. */
export const DISCLOSURE_ICON_CLASS = "w-[18px] h-[18px] shrink-0";
