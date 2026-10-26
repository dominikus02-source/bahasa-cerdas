/**
 * Uji coba Premium Umum 1 bulan — DITAWARKAN, tidak pernah diberikan otomatis.
 *
 * - Klaim: POST /api/umum/trial. Sekali per akun (User.trialStartedAt) DAN
 *   sekali per orang (TrialClaim: hash email ternormalisasi + id Google),
 *   atomik dalam satu transaksi DB. TrialClaim tidak punya FK ke User, jadi
 *   hapus akun lalu daftar ulang dengan email/Google yang sama tetap ditolak.
 * - Memakai kolom trial* yang sudah ada: trialPlan = "UMUM_PREMIUM_TRIAL",
 *   trialCreditsTotal TIDAK diisi (tanpa kredit AI).
 * - Batal kapan saja: DELETE /api/umum/trial → trialEndsAt = sekarang.
 *   trialStartedAt tetap terisi → tidak bisa diklaim ulang.
 * - Tidak pernah berubah jadi berbayar otomatis: tidak ada data kartu, tidak
 *   ada tagihan. Saat habis, resolveIdentity mengembalikan FREE dan halaman
 *   /umum/premium menawarkan paket berbayar.
 * - Sinyal IP lunak: banyak klaim dari prefiks IP yang sama (24 jam) hanya
 *   ditandai (flagged) + dicatat + ditunda sebentar — TIDAK pernah diblokir.
 */
import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { resolveIdentity, UMUM_TRIAL_PLAN } from "@/lib/account/identity";
import { isUmumPremiumEnabled } from "./premium-flag";

export const UMUM_TRIAL_DAYS = 30;
export const UMUM_TRIAL_KIND = UMUM_TRIAL_PLAN;
/** Klaim dari prefiks IP yang sama dalam 24 jam sebelum ditandai. */
export const IP_SOFT_SIGNAL_THRESHOLD = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Huruf kecil + trim; Gmail/Googlemail: titik & +tag dibuang, domain disatukan. */
export function normalizeEmailForClaim(email: string): string {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0) return e;
  let local = e.slice(0, at);
  let domain = e.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    domain = "gmail.com";
    local = local.split("+")[0].replace(/\./g, "");
  }
  return `${local}@${domain}`;
}

function hashSecret(): string {
  // Rahasia khusus (bisa dirotasi terpisah dari kunci lain). Tanpa rahasia,
  // hash tetap deterministik (pepper tetap) — cukup untuk deduplikasi.
  return process.env.TRIAL_CLAIM_HASH_SECRET || "bahasacerdas-trial-claim-v1";
}

export function hashClaimSignal(kind: "email" | "google" | "ip", value: string): string {
  return createHmac("sha256", hashSecret()).update(`${kind}:${value}`).digest("hex");
}

/** /24 untuk IPv4, /48 untuk IPv6. null bila tidak dikenali. */
export function ipPrefix(ip: string | null | undefined): string | null {
  const v = (ip || "").trim();
  if (!v || v === "unknown") return null;
  const v4 = v.replace(/^::ffff:/, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v4)) return v4.split(".").slice(0, 3).join(".") + ".0/24";
  if (v.includes(":")) return v.toLowerCase().split(":").slice(0, 3).join(":") + "::/48";
  return null;
}

type TrialClient = Pick<typeof db, "user" | "trialClaim" | "$transaction">;

export type TrialErrorCode =
  | "TRIAL_DISABLED"
  | "TRIAL_FORBIDDEN_ROLE"
  | "TRIAL_ALREADY_USED"
  | "ALREADY_PREMIUM"
  | "AUTH_REQUIRED"
  | "NO_ACTIVE_TRIAL";

export type ClaimResult =
  | { ok: true; trialEndsAt: Date; flagged: boolean }
  | { ok: false; code: TrialErrorCode; status: number };

class AlreadyClaimed extends Error {}

const userSelect = {
  id: true, role: true, isFounder: true, email: true, isPremium: true, premiumPlan: true,
  premiumUntil: true, trialStartedAt: true, trialEndsAt: true, trialPlan: true,
} as const;

export async function claimUmumTrial(
  input: { userId: string; googleSub?: string | null; ip?: string | null },
  client: TrialClient = db,
  now = new Date()
): Promise<ClaimResult> {
  if (!isUmumPremiumEnabled()) return { ok: false, code: "TRIAL_DISABLED", status: 403 };
  const user = await client.user.findUnique({ where: { id: input.userId }, select: userSelect });
  if (!user || user.email.endsWith("@account.invalid")) return { ok: false, code: "AUTH_REQUIRED", status: 401 };
  if (user.role !== "UMUM" || user.isFounder) return { ok: false, code: "TRIAL_FORBIDDEN_ROLE", status: 403 };
  if (resolveIdentity(user, now).subscriptionStatus === "ACTIVE") return { ok: false, code: "ALREADY_PREMIUM", status: 409 };
  if (user.trialStartedAt) return { ok: false, code: "TRIAL_ALREADY_USED", status: 409 };

  const emailHash = hashClaimSignal("email", normalizeEmailForClaim(user.email));
  const googleSubHash = input.googleSub ? hashClaimSignal("google", input.googleSub) : null;
  const prefix = ipPrefix(input.ip);
  const ipPrefixHash = prefix ? hashClaimSignal("ip", prefix) : null;

  let flagged = false;
  if (ipPrefixHash) {
    const recent = await client.trialClaim
      .count({ where: { kind: UMUM_TRIAL_KIND, ipPrefixHash, createdAt: { gt: new Date(now.getTime() - DAY_MS) } } })
      .catch(() => 0);
    if (recent >= IP_SOFT_SIGNAL_THRESHOLD) {
      flagged = true;
      console.warn("[umum.trial.ip_signal]", { userId: user.id, recentClaims: recent });
    }
  }

  const trialEndsAt = new Date(now.getTime() + UMUM_TRIAL_DAYS * DAY_MS);
  try {
    await client.$transaction(async (tx) => {
      await tx.trialClaim.create({
        data: { kind: UMUM_TRIAL_KIND, emailHash, googleSubHash, ipPrefixHash, userId: user.id, flagged },
      });
      const updated = await tx.user.updateMany({
        where: { id: user.id, role: "UMUM", trialStartedAt: null },
        data: { trialStartedAt: now, trialEndsAt, trialPlan: UMUM_TRIAL_PLAN, trialCreditsTotal: null },
      });
      if (updated.count !== 1) throw new AlreadyClaimed();
    });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (err instanceof AlreadyClaimed || code === "P2002") {
      console.info("[umum.trial.duplicate]", { userId: user.id, reason: err instanceof AlreadyClaimed ? "account" : "person" });
      return { ok: false, code: "TRIAL_ALREADY_USED", status: 409 };
    }
    throw err;
  }
  console.info("[umum.trial.claimed]", { userId: user.id, trialEndsAt: trialEndsAt.toISOString(), flagged });
  return { ok: true, trialEndsAt, flagged };
}

/** Hentikan uji coba sekarang. Tidak ada tagihan; akun kembali ke Gratis. */
export async function cancelUmumTrial(
  userId: string,
  client: Pick<typeof db, "user"> = db,
  now = new Date()
): Promise<{ ok: true } | { ok: false; code: TrialErrorCode; status: number }> {
  const res = await client.user.updateMany({
    where: { id: userId, role: "UMUM", trialPlan: UMUM_TRIAL_PLAN, trialEndsAt: { gt: now } },
    data: { trialEndsAt: now },
  });
  if (res.count !== 1) return { ok: false, code: "NO_ACTIVE_TRIAL", status: 409 };
  console.info("[umum.trial.cancelled]", { userId });
  return { ok: true };
}

export interface UmumTrialView {
  enabled: boolean;
  /** Boleh menekan "Coba gratis 1 bulan". */
  eligible: boolean;
  /** Uji coba Umum sedang berjalan. */
  active: boolean;
  /** Pernah mulai uji coba (akun ini). */
  used: boolean;
  endsAt: string | null;
  paid: boolean;
  paidUntil: string | null;
}

/** Status untuk UI (tanpa DB; hash-person dicek saat klaim). */
export function umumTrialView(
  user: {
    role?: string | null; isFounder?: boolean; isPremium?: boolean; premiumPlan?: string; premiumUntil?: Date | string | null;
    trialStartedAt?: Date | string | null; trialEndsAt?: Date | string | null; trialPlan?: string | null;
  },
  now = new Date()
): UmumTrialView {
  const enabled = isUmumPremiumEnabled();
  const r = resolveIdentity(user, now);
  const paid = r.plan === "UMUM_PREMIUM" && r.subscriptionStatus === "ACTIVE";
  const active = r.plan === "UMUM_PREMIUM" && r.subscriptionStatus === "TRIALING";
  const used = Boolean(user.trialStartedAt);
  const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : null);
  return {
    enabled,
    eligible: enabled && user.role === "UMUM" && !user.isFounder && !paid && !used,
    active,
    used,
    endsAt: user.trialPlan === UMUM_TRIAL_PLAN ? iso(user.trialEndsAt) : null,
    paid,
    paidUntil: paid ? iso(user.premiumUntil) : null,
  };
}
