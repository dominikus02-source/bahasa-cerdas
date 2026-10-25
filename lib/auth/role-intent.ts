import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isKategoriUmumPilihan, type KategoriUmumPilihan } from "@/lib/auth/kategori-umum";
import { isRoleUmumEnabled } from "@/lib/auth/umum-flag";

export {
  dashboardForRole,
  dashboardForUser,
  isSafeNext,
  resolvePostAuthDestination,
  resolvePostAuthDestinationForUser,
} from "@/lib/auth/redirect";

/**
 * Server-bound pending-role intent for Google OAuth.
 *
 * PRODUCT RULE: Google is authentication only. A NEW Google user must choose
 * GURU or MURID explicitly. The choice is captured in a controlled UI, validated
 * server-side against an allowlist, sealed with HMAC into a short-lived httpOnly
 * cookie, and consumed exactly once at provisioning time.
 *
 * SECURITY PROPERTIES:
 * - `?role=` query params are NEVER trusted (see verifyRoleIntent — only HMAC
 *   sealed values are accepted).
 * - Existing users ALWAYS ignore the intent (enforced at call sites: look up the
 *   application User first; only provision when no User exists).
 * - Replay is harmless: provisioning is idempotent (second attempt finds the
 *   existing User and preserves its role), and the cookie is cleared on consume.
 * - Expiry: 15 minutes. Tampered/invalid values verify as null → caller must
 *   route to role selection instead of silently defaulting to MURID.
 */

export const ROLE_INTENT_COOKIE = "bc_role_intent";
export const ROLE_INTENT_TTL_SECONDS = 15 * 60;
export const ALLOWED_GOOGLE_ROLES = ["GURU", "MURID"] as const;
export type GoogleRoleIntent = (typeof ALLOWED_GOOGLE_ROLES)[number];

export function isAllowedGoogleRole(value: unknown): value is GoogleRoleIntent {
  return value === "GURU" || value === "MURID";
}

function getIntentSecret(): string {
  return (
    process.env.BC_ROLE_INTENT_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

export function isRoleIntentConfigured(): boolean {
  return getIntentSecret().length > 0;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/** Seal a role into an opaque intent value. Returns null when no secret is configured. */
export function signRoleIntent(role: GoogleRoleIntent): string | null {
  const secret = getIntentSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + ROLE_INTENT_TTL_SECONDS;
  const nonce = randomBytes(8).toString("hex");
  const payload = `v1.${exp}.${nonce}.${role}`;
  return `${payload}.${signPayload(payload, secret)}`;
}

/**
 * Verify a submitted intent value. Returns the role, or null when the value is
 * missing, malformed, expired, tampered, or signed with another secret.
 * Callers MUST treat null as "no valid intent" → role selection, NEVER as MURID.
 */
export function verifyRoleIntent(value: string | null | undefined): GoogleRoleIntent | null {
  const secret = getIntentSecret();
  if (!value || !secret) return null;
  const parts = value.split(".");
  if (parts.length !== 5 || parts[0] !== "v1") return null;
  const [, expRaw, nonce, role, sig] = parts;
  if (!isAllowedGoogleRole(role)) return null;
  if (!nonce || !/^[0-9a-f]{16}$/.test(nonce)) return null;
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || exp * 1000 <= Date.now()) return null;
  const payload = `v1.${expRaw}.${nonce}.${role}`;
  if (!/^[0-9a-f]{64}$/.test(sig)) return null;
  const expected = signPayload(payload, secret);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return role;
}

/**
 * Peran yang boleh di-provision lewat pilihan eksplisit pengguna.
 * GURU/MURID selalu; UMUM HANYA bila flag server ENABLE_ROLE_UMUM aktif DAN
 * disertai kategori yang bisa dipilih (MAHASISWA/DOSEN/UMUM). isAllowedGoogleRole
 * tetap murni GURU/MURID (tidak diubah).
 */
export type ProvisionRole = GoogleRoleIntent | "UMUM";

export interface RoleSelection {
  role: ProvisionRole;
  /** Hanya terisi untuk UMUM; GURU/MURID selalu null. */
  kategoriUmum: KategoriUmumPilihan | null;
}

/** Validasi server untuk pilihan peran dari UI. null = tolak (400). */
export function parseRoleSelection(role: unknown, kategoriUmum: unknown): RoleSelection | null {
  if (isAllowedGoogleRole(role)) return { role, kategoriUmum: null };
  if (role === "UMUM" && isRoleUmumEnabled() && isKategoriUmumPilihan(kategoriUmum)) {
    return { role: "UMUM", kategoriUmum };
  }
  return null;
}

/** Segel pilihan peran (v1 untuk GURU/MURID — format lama tak berubah; v2 untuk
 * UMUM: `v2.exp.nonce.UMUM.KATEGORI.sig`). */
export function signRoleSelectionIntent(selection: RoleSelection): string | null {
  if (selection.role !== "UMUM") return signRoleIntent(selection.role);
  if (!isRoleUmumEnabled() || !isKategoriUmumPilihan(selection.kategoriUmum)) return null;
  const secret = getIntentSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + ROLE_INTENT_TTL_SECONDS;
  const nonce = randomBytes(8).toString("hex");
  const payload = `v2.${exp}.${nonce}.UMUM.${selection.kategoriUmum}`;
  return `${payload}.${signPayload(payload, secret)}`;
}

/**
 * Verifikasi intent v1 (GURU/MURID, via verifyRoleIntent) ATAU v2 (UMUM).
 * v2 hanya sah bila flag ENABLE_ROLE_UMUM masih aktif saat dikonsumsi dan
 * kategorinya termasuk pilihan (INVESTOR/TAMU/lainnya → null).
 */
export function verifyRoleSelectionIntent(value: string | null | undefined): RoleSelection | null {
  const v1 = verifyRoleIntent(value);
  if (v1) return { role: v1, kategoriUmum: null };
  const secret = getIntentSecret();
  if (!value || !secret) return null;
  const parts = value.split(".");
  if (parts.length !== 6 || parts[0] !== "v2") return null;
  const [, expRaw, nonce, role, kategori, sig] = parts;
  if (role !== "UMUM" || !isKategoriUmumPilihan(kategori)) return null;
  if (!isRoleUmumEnabled()) return null;
  if (!nonce || !/^[0-9a-f]{16}$/.test(nonce)) return null;
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || exp * 1000 <= Date.now()) return null;
  if (!/^[0-9a-f]{64}$/.test(sig)) return null;
  const expected = signPayload(`v2.${expRaw}.${nonce}.UMUM.${kategori}`, secret);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { role: "UMUM", kategoriUmum: kategori };
}

export function intentSetCookie(value: string): string {
  const attrs = [
    `${ROLE_INTENT_COOKIE}=${value}`,
    "Path=/",
    `Max-Age=${ROLE_INTENT_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return attrs.join("; ");
}

export function intentClearCookie(): string {
  const attrs = [`${ROLE_INTENT_COOKIE}=`, "Path=/", "Max-Age=0", "HttpOnly", "SameSite=Lax"];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return attrs.join("; ");
}

export type ProvisionDecision =
  | { action: "preserve" }
  | { action: "create"; role: ProvisionRole; kategoriUmum?: KategoriUmumPilihan | null }
  | { action: "needs-selection" };

/**
 * Pure provisioning decision for a Google-authenticated identity.
 * - existingRole set (GURU/MURID/ADMIN/...) → preserve, intent ignored.
 * - no existing user + valid intent → create with intent role.
 * - no existing user + no/invalid intent → needs-selection (NEVER silent MURID).
 */
export function resolveGoogleProvisioning(opts: {
  existingRole: string | null | undefined;
  intentRole: ProvisionRole | null;
  /** Kategori dari intent v2 (hanya relevan untuk UMUM). */
  intentKategoriUmum?: KategoriUmumPilihan | null;
}): ProvisionDecision {
  if (opts.existingRole) return { action: "preserve" };
  if (opts.intentRole === "UMUM") {
    // UMUM wajib membawa kategori yang sah; tanpa itu → pilih peran ulang.
    if (!isKategoriUmumPilihan(opts.intentKategoriUmum)) return { action: "needs-selection" };
    return { action: "create", role: "UMUM", kategoriUmum: opts.intentKategoriUmum };
  }
  if (opts.intentRole) return { action: "create", role: opts.intentRole };
  return { action: "needs-selection" };
}
