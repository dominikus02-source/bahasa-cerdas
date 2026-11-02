/**
 * AKU SASTRAWAN — regression tests (tanpa DB).
 *   1. Kebijakan tulis: UMUM → Premium Umum (bayar/uji coba); GURU/MURID → plan
 *      PRO/MURID_PREMIUM; FOUNDER selalu; FREE/kedaluwarsa → ditolak.
 *   2. hasUmumPremium nyata (resolveIdentity) untuk UMUM bayar/uji coba/kedaluwarsa.
 *   3. Rute BACA (GET daftar/buka/bab, ekspor) tidak memakai gerbang premium;
 *      rute TULIS (POST/PATCH/DELETE, progress POST, coach) memakainya.
 *   4. Slug dinamis di app/api/aku-sastrawan/projects seragam [projectId].
 *   5. Coach tetap memakai model deepseek-chat.
 *
 * Usage: npx tsx scripts/test-aku-sastrawan-access.ts
 */
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { akuSastrawanUpgradeUrl, akuSastrawanWriteAllowed } from "../lib/aku-sastrawan/access";
import { hasUmumPremium } from "../lib/umum/premium";

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ✅ ${label}`); } else { failed++; console.log(`  ❌ ${label}`); }
}

console.log("\n1. Kebijakan tulis");
assert(akuSastrawanWriteAllowed({ role: "UMUM", plan: "UMUM_PREMIUM", umumPremium: true }), "UMUM premium boleh menulis");
assert(!akuSastrawanWriteAllowed({ role: "UMUM", plan: "FREE", umumPremium: false }), "UMUM gratis/kedaluwarsa tidak boleh menulis");
assert(!akuSastrawanWriteAllowed({ role: "UMUM", plan: "UMUM_PREMIUM", umumPremium: false }), "UMUM: keputusan hanya dari hasUmumPremium");
assert(akuSastrawanWriteAllowed({ role: "GURU", plan: "PRO", umumPremium: false }), "GURU PRO boleh menulis");
assert(!akuSastrawanWriteAllowed({ role: "GURU", plan: "FREE", umumPremium: false }), "GURU FREE tidak boleh menulis");
assert(akuSastrawanWriteAllowed({ role: "MURID", plan: "MURID_PREMIUM", umumPremium: false }), "MURID premium boleh menulis");
assert(!akuSastrawanWriteAllowed({ role: "MURID", plan: "FREE", umumPremium: false }), "MURID FREE tidak boleh menulis");
assert(akuSastrawanWriteAllowed({ role: "ADMIN", plan: "FOUNDER", umumPremium: false }), "FOUNDER/ADMIN boleh menulis");
assert(akuSastrawanUpgradeUrl("UMUM") === "/umum/premium", "upgradeUrl UMUM → /umum/premium");
assert(akuSastrawanUpgradeUrl("MURID") === "/murid/premium", "upgradeUrl MURID → /murid/premium");
assert(akuSastrawanUpgradeUrl("GURU") === "/guru/berlangganan", "upgradeUrl GURU → /guru/berlangganan");

console.log("\n2. hasUmumPremium (resolveIdentity nyata)");
const day = 86_400_000;
const future = new Date(Date.now() + 10 * day);
const past = new Date(Date.now() - day);
assert(hasUmumPremium({ role: "UMUM", isPremium: true, premiumPlan: "UMUM_PREMIUM_30", premiumUntil: future }), "UMUM bayar aktif → true");
assert(hasUmumPremium({ role: "UMUM", trialPlan: "UMUM_PREMIUM_TRIAL", trialEndsAt: future }), "UMUM uji coba aktif → true");
assert(!hasUmumPremium({ role: "UMUM", isPremium: true, premiumPlan: "UMUM_PREMIUM_30", premiumUntil: past }), "UMUM bayar kedaluwarsa → false");
assert(!hasUmumPremium({ role: "UMUM", trialPlan: "UMUM_PREMIUM_TRIAL", trialEndsAt: past }), "UMUM uji coba habis → false");
assert(!hasUmumPremium({ role: "UMUM" }), "UMUM gratis → false");

console.log("\n3. Gerbang baca vs tulis di rute API");
const api = join(process.cwd(), "app/api/aku-sastrawan");
const src = (p: string) => readFileSync(join(api, p), "utf8");
function handler(code: string, method: string) {
  const start = code.indexOf(`export async function ${method}(`);
  if (start < 0) return null;
  const next = code.indexOf("export async function", start + 10);
  return code.slice(start, next < 0 ? undefined : next);
}
const gated = (body: string | null) => Boolean(body && /canWriteAkuSastrawan\(|mode === "write"|"write"\)/.test(body) && !/ownedProject\(projectId, "read"\)/.test(body));
const readOnly = (body: string | null) => Boolean(body && !/akuSastrawanPremiumRequired|umumPremiumRequired|ownedProject\(projectId, "write"\)/.test(body));
const projects = src("projects/route.ts");
assert(readOnly(handler(projects, "GET")), "GET /projects (daftar) tanpa gerbang premium");
assert(gated(handler(projects, "POST")), "POST /projects digerbang premium");
const project = src("projects/[projectId]/route.ts");
assert(/ownedProject\(projectId, "read"\)/.test(handler(project, "GET") ?? ""), "GET /projects/[projectId] mode baca");
assert(/ownedProject\(projectId, "write"\)/.test(handler(project, "PATCH") ?? ""), "PATCH /projects/[projectId] mode tulis");
assert(/ownedProject\(projectId, "write"\)/.test(handler(project, "DELETE") ?? ""), "DELETE /projects/[projectId] mode tulis");
const chapters = src("projects/[projectId]/chapters/route.ts");
assert(readOnly(handler(chapters, "GET")), "GET bab tanpa gerbang premium");
assert(gated(handler(chapters, "POST")), "POST bab digerbang premium");
const chapter = src("projects/[projectId]/chapters/[chapterId]/route.ts");
assert(gated(handler(chapter, "PATCH")) && gated(handler(chapter, "DELETE")), "PATCH/DELETE bab digerbang premium");
const exp = src("projects/[projectId]/export/route.ts");
assert(readOnly(handler(exp, "GET")) && /userId: user\.id/.test(exp), "Ekspor: tanpa gerbang premium, hanya milik sendiri");
const progress = src("progress/route.ts");
assert(readOnly(handler(progress, "GET")) && gated(handler(progress, "POST")), "progress: GET baca, POST digerbang");
const coach = src("coach/route.ts");
assert(gated(handler(coach, "POST")), "coach digerbang premium");
assert(/"deepseek-chat"/.test(coach), "coach memakai model deepseek-chat");

console.log("\n4. Slug seragam");
const projDir = join(api, "projects");
const dyn = readdirSync(projDir).filter((n) => n.startsWith("["));
assert(dyn.length === 1 && dyn[0] === "[projectId]", `projects/ hanya punya [projectId] (ditemukan: ${dyn.join(", ")})`);
assert(!existsSync(join(projDir, "[id]")), "projects/[id] sudah dihapus");

console.log(`\nHasil: ${passed} lulus, ${failed} gagal.`);
if (failed) process.exit(1);
