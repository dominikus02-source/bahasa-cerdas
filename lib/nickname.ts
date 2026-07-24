// Nama panggilan (display nickname) — a rendering layer over fullName, never a
// replacement for it. Real name stays in the database and is always what
// guru/wali kelas, rapor, sertifikat, and antologi cetak show; nickname only
// changes what peers and public pages render.

export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 20;
export const NICKNAME_RATE_LIMIT_DAYS = 30;

// Static impersonation targets — role/brand names, independent of school.
const IMPERSONATION_BLOCKLIST = [
  "guru",
  "admin",
  "administrator",
  "bahasacerdas",
  "bahasa cerdas",
  "kepala sekolah",
  "kepsek",
  "wali kelas",
];

// Whole-word social-handle bait. Checked as normalized words, not substrings,
// so names like "Wawan" or "Wati" aren't falsely caught by "wa".
const SOCIAL_HANDLE_WORDS = ["ig", "instagram", "tiktok", "tt", "wa", "whatsapp", "line", "fb", "facebook", "dm"];

// Letters (any script), spaces, hyphens only — this alone already rules out
// @handles, underscore_digit combos, and digit runs, since digits/@/_ aren't
// in the class. The explicit checks below exist anyway for clearer error
// messages and as a defensive second layer.
const ALLOWED_CHARS = /^[\p{L} -]+$/u;

const EMOJI_PATTERN =
  /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/u;

export function normalizeNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export type NicknameValidationResult =
  | { ok: true; value: string }
  | { ok: false; code: string; reason: string };

export function validateNicknameFormat(raw: string): NicknameValidationResult {
  const value = normalizeNickname(raw);

  if (value.length < NICKNAME_MIN_LENGTH || value.length > NICKNAME_MAX_LENGTH) {
    return { ok: false, code: "LENGTH", reason: `Nama panggilan harus ${NICKNAME_MIN_LENGTH}–${NICKNAME_MAX_LENGTH} karakter.` };
  }
  if (EMOJI_PATTERN.test(value)) {
    return { ok: false, code: "EMOJI", reason: "Emoji tidak diperbolehkan pada nama panggilan." };
  }
  if (value.startsWith("@")) {
    return { ok: false, code: "SOCIAL_HANDLE", reason: "Nama panggilan tidak boleh diawali simbol @." };
  }
  if (/_\d/.test(raw) || /\d{8,}/.test(raw)) {
    return { ok: false, code: "SOCIAL_HANDLE", reason: "Nama panggilan tidak boleh menyerupai akun media sosial." };
  }
  if (!ALLOWED_CHARS.test(value)) {
    return { ok: false, code: "CHARSET", reason: "Nama panggilan hanya boleh huruf, spasi, dan tanda hubung." };
  }

  const lower = value.toLowerCase();
  if (IMPERSONATION_BLOCKLIST.includes(lower)) {
    return { ok: false, code: "IMPERSONATION", reason: "Nama panggilan ini tidak diperbolehkan." };
  }
  const words = lower.split(" ");
  if (words.some((w) => SOCIAL_HANDLE_WORDS.includes(w))) {
    return { ok: false, code: "SOCIAL_HANDLE", reason: "Nama panggilan tidak boleh menyerupai akun media sosial." };
  }

  return { ok: true, value };
}

export function isImpersonatingTeacher(value: string, teacherFullNames: string[]): boolean {
  const lower = value.trim().toLowerCase();
  return teacherFullNames.some((name) => name.trim().toLowerCase() === lower);
}

export function nicknameRateLimitDaysLeft(nicknameUpdatedAt: Date | null | undefined): number {
  if (!nicknameUpdatedAt) return 0;
  const elapsedDays = (Date.now() - new Date(nicknameUpdatedAt).getTime()) / 86_400_000;
  return Math.max(0, Math.ceil(NICKNAME_RATE_LIMIT_DAYS - elapsedDays));
}

// Privacy-safe-by-default fallback when no nickname is set: first name + initial.
export function defaultNicknameFromFullName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fullName;
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
}

export type NameViewerContext = "teacher" | "peer" | "formal";

export interface DisplayNameSubject {
  fullName: string;
  nickname?: string | null;
}

// The single chokepoint for "what name do we render". `teacher`/`formal`
// (rapor, sertifikat, antologi cetak) always get the real name; `peer`
// (classmates, papan sekolah, public profile) get the nickname layer.
export function getDisplayName(subject: DisplayNameSubject, context: NameViewerContext): string {
  if (context === "teacher" || context === "formal") return subject.fullName;
  const nickname = subject.nickname?.trim();
  return nickname || defaultNicknameFromFullName(subject.fullName);
}
