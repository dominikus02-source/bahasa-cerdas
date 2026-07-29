export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 20;
export const NICKNAME_RATE_LIMIT_DAYS = 30;

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

const SOCIAL_HANDLE_WORDS = ["ig", "instagram", "tiktok", "tt", "wa", "whatsapp", "line", "fb", "facebook", "dm"];

const ALLOWED_CHARS = /^[\p{L} -]+$/u;

export function normalizeNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

export function validateNicknameFormat(raw: string): { ok: true; value: string } | { ok: false; reason: string; code: string } {
  const trimmed = raw.trim();
  if (trimmed.length < NICKNAME_MIN_LENGTH) {
    return { ok: false, reason: `Nama panggilan minimal ${NICKNAME_MIN_LENGTH} karakter.`, code: "TOO_SHORT" };
  }
  if (trimmed.length > NICKNAME_MAX_LENGTH) {
    return { ok: false, reason: `Nama panggilan maksimal ${NICKNAME_MAX_LENGTH} karakter.`, code: "TOO_LONG" };
  }
  if (!ALLOWED_CHARS.test(trimmed)) {
    return { ok: false, reason: "Nama panggilan hanya boleh berisi huruf, spasi, dan tanda hubung.", code: "INVALID_CHARS" };
  }
  const lower = trimmed.toLowerCase();
  const words = lower.split(/\s+/);

  for (const word of words) {
    if (IMPERSONATION_BLOCKLIST.includes(word)) {
      return { ok: false, reason: "Nama panggilan tidak boleh mengandung kata yang menyerupai peran tertentu.", code: "BLOCKED_WORD" };
    }
    if (SOCIAL_HANDLE_WORDS.includes(word)) {
      return { ok: false, reason: "Nama panggilan tidak boleh mengandung kata yang mengarah ke media sosial.", code: "SOCIAL_HANDLE" };
    }
  }

  return { ok: true, value: trimmed };
}

export function isImpersonatingTeacher(nickname: string, teacherNames: string[]): boolean {
  const lower = nickname.trim().toLowerCase();
  return teacherNames.some((name) => {
    const nameLower = name.trim().toLowerCase();
    return nameLower.includes(lower) || lower.includes(nameLower);
  });
}

export function nicknameRateLimitDaysLeft(nicknameUpdatedAt: Date | string | null | undefined): number {
  if (!nicknameUpdatedAt) return 0;
  const nextChange = new Date(nicknameUpdatedAt);
  nextChange.setDate(nextChange.getDate() + NICKNAME_RATE_LIMIT_DAYS);
  const diff = nextChange.getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / 86400000) : 0;
}

export function defaultNicknameFromFullName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  return parts[0];
}

export function getDisplayName(
  user: { fullName: string; nickname?: string | null },
  context: "peer" | "guru" = "peer",
): string {
  if (context === "guru") return user.fullName;
  return user.nickname?.trim() || user.fullName;
}
