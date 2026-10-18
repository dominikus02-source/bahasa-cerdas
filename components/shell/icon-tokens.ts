/**
 * CANONICAL ICON SYSTEM — BahasaCerdas (Phase 5.1).
 * Satu sumber token ikon untuk SEMUA navigation/shell (Murid/Arena/Obrolan/Guru/Admin).
 * Library tunggal: lucide-react (JANGAN tambah library ikon lain).
 *
 * Tokens:
 * - NAV: 22px, strokeWidth 2, inactive --clr-text-3, active --clr-violet (token global, app/theme/tokens.css).
 * - ACTION (header/button): 18–20px.
 * - DISCLOSURE (chevron kecil): 18px.
 */
export const NAV_ICON_CLASS = "w-[22px] h-[22px] shrink-0";
export const NAV_ICON_STROKE = 2;

/** Ikon nav — tidak aktif: slate (muted), hover naik kontrasnya. */
export const NAV_ICON_INACTIVE =
 "text-bc-text-3 group-hover:text-bc-text";
/** Ikon nav — aktif: violet (semua role). */
export const NAV_ICON_ACTIVE = "text-bc-violet";

/** Link nav — kerangka bersama (termasuk kelas shell-link untuk collapse CSS). */
export const NAV_LINK_BASE =
  "shell-link group flex items-center gap-3 px-3 py-2.5 rounded-bc-sm text-sm mb-1 transition-colors duration-200";
/** Link nav — aktif: tint violet + teks violet + semibold. */
export const NAV_LINK_ACTIVE =
 "bg-bc-violet-soft text-bc-violet font-semibold shadow-[inset_0_0_0_1px_var(--clr-line)]";
/** Link nav — tidak aktif: slate teks + hover subtle bg + naik kontras. */
export const NAV_LINK_INACTIVE =
 "text-bc-text-2 hover:bg-bc-text/5 hover:text-bc-text";

/** Ikon header/aksi (tombol): 20px. */
export const ACTION_ICON_CLASS = "w-5 h-5 shrink-0";
/** Ikon disclosure kecil (chevron/expand): 18px. */
export const DISCLOSURE_ICON_CLASS = "w-[18px] h-[18px] shrink-0";
