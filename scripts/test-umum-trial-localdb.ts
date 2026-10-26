/**
 * Premium Umum — uji coba dengan Postgres LOKAL sungguhan (constraint unik
 * TrialClaim nyata, klaim bersamaan). Bukan untuk CI.
 *
 * Menolak jalan bila DATABASE_URL bukan 127.0.0.1/localhost.
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:55432/bc_umum_premium \
 *     ENABLE_UMUM_PREMIUM=true npx tsx scripts/test-umum-trial-localdb.ts
 */
const url = process.env.DATABASE_URL || "";
if (!/^postgres(ql)?:\/\/[^@]*@(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)) {
  console.error("REFUSING: DATABASE_URL harus Postgres lokal (127.0.0.1/localhost).");
  process.exit(2);
}
process.env.ENABLE_UMUM_PREMIUM = "true";

import { PrismaClient } from "@prisma/client";
import { claimUmumTrial, cancelUmumTrial } from "../lib/umum/trial";

const db = new PrismaClient();
let passed = 0, failed = 0;
const assert = (c: unknown, l: string) => { if (c) { passed++; console.log(`  ✅ ${l}`); } else { failed++; console.log(`  ❌ ${l}`); } };
const tag = `t${Date.now().toString(36)}`;
const mk = (id: string, email: string) => db.user.create({ data: { id: `${tag}-${id}`, supabaseId: `${tag}-sb-${id}`, email, fullName: id, role: "UMUM" } as any });

async function main() {
  const a = await mk("a", `${tag}.orang@gmail.com`);
  const r1 = await claimUmumTrial({ userId: a.id, googleSub: `${tag}-sub` }, db as any);
  assert(r1.ok, "klaim pertama berhasil (DB nyata)");
  const [p1, p2] = await Promise.all([claimUmumTrial({ userId: a.id }, db as any), claimUmumTrial({ userId: a.id }, db as any)]);
  assert(!p1.ok && !p2.ok, "klaim ulang bersamaan → keduanya ditolak");
  await db.user.delete({ where: { id: a.id } });
  const b = await mk("b", `${tag}orang+lagi@googlemail.com`);
  const r2 = await claimUmumTrial({ userId: b.id }, db as any);
  const bRow = await db.user.findUnique({ where: { id: b.id } });
  assert(!r2.ok && r2.code === "TRIAL_ALREADY_USED" && bRow?.trialStartedAt === null, "hapus akun + daftar ulang → ditolak oleh constraint unik, akun baru tidak berubah");
  const c = await mk("c", `${tag}-lain@contoh.id`);
  const r3 = await claimUmumTrial({ userId: c.id, googleSub: `${tag}-sub` }, db as any);
  assert(!r3.ok && r3.code === "TRIAL_ALREADY_USED", "id Google sama → ditolak");
  const d = await mk("d", `${tag}-d@contoh.id`);
  const e = await mk("e", `${tag}-e@contoh.id`);
  const [rd, re] = await Promise.all([claimUmumTrial({ userId: d.id }, db as any), claimUmumTrial({ userId: e.id }, db as any)]);
  assert(rd.ok && re.ok, "dua orang berbeda bersamaan → keduanya berhasil");
  const cx = await cancelUmumTrial(d.id, db as any);
  const dRow = await db.user.findUnique({ where: { id: d.id } });
  assert(cx.ok && dRow!.trialEndsAt!.getTime() <= Date.now() && !dRow!.isPremium, "batal → trialEndsAt=sekarang, tidak premium");
  const claims = await db.trialClaim.count({ where: { userId: { startsWith: tag } } });
  assert(claims === 3, `TrialClaim tersimpan 3 baris (a bertahan walau akun dihapus): ${claims}`);
  await db.user.deleteMany({ where: { id: { startsWith: tag } } });
  await db.trialClaim.deleteMany({ where: { userId: { startsWith: tag } } });
  console.log(`\nHasil: ${passed} passed, ${failed} failed`);
  await db.$disconnect();
  process.exit(failed ? 1 : 0);
}
main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
