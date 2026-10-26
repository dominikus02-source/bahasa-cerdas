import { NextRequest, NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { getForwardedIp } from "@/lib/security";
import cache from "@/lib/redis";
import { cancelUmumTrial, claimUmumTrial, umumTrialView } from "@/lib/umum/trial";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  TRIAL_DISABLED: "Uji coba Premium Umum belum dibuka.",
  TRIAL_FORBIDDEN_ROLE: "Uji coba ini khusus akun Umum.",
  TRIAL_ALREADY_USED: "Uji coba gratis sudah pernah dipakai. Kamu tetap bisa memilih paket Premium Umum.",
  ALREADY_PREMIUM: "Premium Umum-mu sudah aktif.",
  AUTH_REQUIRED: "Sesi kamu habis. Masuk lagi untuk melanjutkan.",
  NO_ACTIVE_TRIAL: "Tidak ada uji coba yang sedang berjalan.",
};

type SessionUser = { id: string; supabaseId?: string | null } & Parameters<typeof umumTrialView>[0];

async function dropUserCache(supabaseId: string | null | undefined) {
  if (!supabaseId) return;
  await Promise.all([cache.del(`user:me:id:${supabaseId}`), cache.del(`user:me:v2:id:${supabaseId}`)]).catch(() => {});
}

/** Id akun Google (identity sub) bila akun ditautkan Google — sinyal "sekali per orang". */
async function googleSub(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const g = data.user?.identities?.find((i) => i.provider === "google");
    const sub = (g?.identity_data as { sub?: unknown } | undefined)?.sub ?? g?.id;
    return typeof sub === "string" && sub ? sub : null;
  } catch {
    return null;
  }
}

/** GET /api/umum/trial — status uji coba untuk UI. */
export async function GET() {
  const user = (await getUser().catch(() => null)) as SessionUser | null;
  if (!user) return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
  return NextResponse.json({ ok: true, ...umumTrialView(user) }, { headers: { "Cache-Control": "no-store" } });
}

/** POST /api/umum/trial — klaim uji coba 1 bulan (sekali per orang). Tanpa kartu, tanpa tagihan. */
export async function POST(req: NextRequest) {
  const user = (await getUser().catch(() => null)) as SessionUser | null;
  if (!user) return NextResponse.json({ ok: false, error: "AUTH_REQUIRED", message: MESSAGES.AUTH_REQUIRED }, { status: 401 });
  if (user.role !== "UMUM" || user.isFounder) {
    return NextResponse.json({ ok: false, error: "TRIAL_FORBIDDEN_ROLE", message: MESSAGES.TRIAL_FORBIDDEN_ROLE }, { status: 403 });
  }

  const result = await claimUmumTrial({ userId: user.id, googleSub: await googleSub(), ip: getForwardedIp(req.headers) });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.code, message: MESSAGES[result.code] }, { status: result.status });
  }
  // Sinyal lunak: tunda sebentar, tidak pernah menolak.
  if (result.flagged) await new Promise((r) => setTimeout(r, 1500));
  await dropUserCache(user.supabaseId);
  return NextResponse.json({ ok: true, trialEndsAt: result.trialEndsAt.toISOString() });
}

/** DELETE /api/umum/trial — hentikan uji coba sekarang. Tidak ada tagihan. */
export async function DELETE() {
  const user = (await getUser().catch(() => null)) as SessionUser | null;
  if (!user) return NextResponse.json({ ok: false, error: "AUTH_REQUIRED", message: MESSAGES.AUTH_REQUIRED }, { status: 401 });
  const result = await cancelUmumTrial(user.id);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.code, message: MESSAGES[result.code] }, { status: result.status });
  }
  await dropUserCache(user.supabaseId);
  return NextResponse.json({ ok: true });
}
