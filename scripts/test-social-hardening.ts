/**
 * test-social-hardening.ts — regression statis untuk PRODUCTION HARDENING
 * Player Identity Profile (W1–W5). Tanpa DB; hanya membaca file.
 *
 * Coverage:
 *   W1 — toggle atomic: P2002 saat create, P2025 saat delete (composite key)
 *   W2 — rate limit 30/menit per sesi per endpoint (follow & like)
 *   W4 — notifikasi sosial hanya ke akun MURID (bukan GURU/ADMIN/founder)
 *   W3 — dead expression hilang; label "Suka · {count}" + optimistic + rollback
 *   W5 — AchievementShowcase terpasang di /murid/profile dengan data asli
 *   Regresi — GET /social tidak di-rate-limit; tanpa migrasi baru;
 *             kontrak respon { following, followerCount } / { liked, profileLikeCount }
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
let failures = 0;
const checks: { name: string; pass: boolean; detail?: string }[] = [];

function check(name: string, pass: boolean, detail?: string) {
  checks.push({ name, pass, detail });
  if (!pass) failures++;
}

const FOLLOW = join(root, "app/api/user/profile/[id]/follow/route.ts");
const LIKE = join(root, "app/api/user/profile/[id]/like/route.ts");
const SOCIAL = join(root, "app/api/user/profile/[id]/social/route.ts");
const HERO = join(root, "components/profile/ProfileHero.tsx");
const SHOWCASE = join(root, "components/profile/AchievementShowcase.tsx");
const SELF_PROFILE = join(root, "app/(dashboard)/murid/profile/page.tsx");

for (const [label, p] of Object.entries({ follow: FOLLOW, like: LIKE, social: SOCIAL, hero: HERO, showcase: SHOWCASE, selfProfile: SELF_PROFILE })) {
  if (!existsSync(p)) { check(`file ada: ${label}`, false, `${p} tidak ditemukan`); process.exit(1); }
}

const follow = readFileSync(FOLLOW, "utf8");
const like = readFileSync(LIKE, "utf8");
const social = readFileSync(SOCIAL, "utf8");
const hero = readFileSync(HERO, "utf8");
const showcase = readFileSync(SHOWCASE, "utf8");
const selfProfile = readFileSync(SELF_PROFILE, "utf8");

// ---- W2: rate limit per endpoint, 30/menit, per sesi (via rateLimitRoute) ----
check("W2 follow: pakai rateLimitRoute", /import \{ rateLimitRoute \} from "@\/lib\/rate-limit"/.test(follow));
check("W2 follow: 30/menit identifier bca-social-follow",
  /rateLimitRoute\(req, \{ maxRequests: 30, windowSeconds: 60, identifier: "bca-social-follow" \}\)/.test(follow));
check("W2 like: pakai rateLimitRoute", /import \{ rateLimitRoute \} from "@\/lib\/rate-limit"/.test(like));
check("W2 like: 30/menit identifier bca-social-like",
  /rateLimitRoute\(req, \{ maxRequests: 30, windowSeconds: 60, identifier: "bca-social-like" \}\)/.test(like));
check("W2 regresi: GET /social TIDAK di-rate-limit", !/rateLimitRoute/.test(social));

// ---- W1: atomic toggle via error code (bukan check-then-act sebagai sumber kebenaran) ----
check("W1 follow: create + P2002 => dianggap sudah follow", /create\(\{ data: \{ followerId: me\.id, followingId: id \} \}\)/.test(follow) && /code === "P2002"/.test(follow));
check("W1 follow: delete via composite key + P2025 => dianggap sudah unfollow",
  /followerId_followingId: \{ followerId: me\.id, followingId: id \}/.test(follow) && /code === "P2025"/.test(follow));
check("W1 like: create + P2002 => dianggap sudah disukai", /create\(\{ data: \{ likerId: me\.id, targetId: id \} \}\)/.test(like) && /code === "P2002"/.test(like));
check("W1 like: delete via composite key + P2025 => dianggap sudah tidak disukai",
  /likerId_targetId: \{ likerId: me\.id, targetId: id \}/.test(like) && /code === "P2025"/.test(like));
check("W1 kontrak: respon follow tetap { following, followerCount }", /NextResponse\.json\(\{ following, followerCount \}\)/.test(follow));
check("W1 kontrak: respon like tetap { liked, profileLikeCount }", /NextResponse\.json\(\{ liked, profileLikeCount \}\)/.test(like));

// ---- W4: notifikasi sosial hanya ke akun MURID ----
check("W4 follow: target di-select dgn role + isFounder", /select: \{ id: true, role: true, isFounder: true \}/.test(follow));
check("W4 follow: notif di-gate MURID non-founder", /following && target\.role === "MURID" && !target\.isFounder/.test(follow));
check("W4 like: target di-select dgn role + isFounder", /select: \{ id: true, role: true, isFounder: true \}/.test(like));
check("W4 like: notif di-gate MURID non-founder", /liked && target\.role === "MURID" && !target\.isFounder/.test(like));

// ---- W3: UI suka profil ----
check("W3: dead expression dihapus", !/socialFollowerCount \+ \(liked/.test(hero) && !/socialFollowerCount/.test(hero));
check("W3: label 'Suka · {count}' dengan id-ID", /\{liked \? "Disukai" : "Suka"\} · \{likeCount\.toLocaleString\("id-ID"\)\}/.test(hero));
check("W3: optimistic count +/- dengan rollback", /setLikeCount\(Math\.max\(0, prevCount \+ \(nextLiked \? 1 : -1\)\)\)/.test(hero) && /setLikeCount\(prevCount\);/.test(hero));
check("W3: sinkron state saat social datang belakangan (idle-only)", /useEffect\(\(\) => \{\s*if \(busyFollowRef\.current \|\| busyLikeRef\.current\) return;/.test(hero));

// ---- W5: showcase lencana di /murid/profile ----
check("W5: AchievementShowcase diimpor", /import AchievementShowcase from "@\/components\/profile\/AchievementShowcase"/.test(selfProfile));
check("W5: badge dari /api/player/badges (data asli, bukan hardcode)", /fetch\("\/api\/player\/badges"\)/.test(selfProfile));
check("W5: section Pencapaian dipasang setelah strip sosial", /Pencapaian/.test(selfProfile) && /AchievementShowcase badges=\{showcaseBadges\} max=\{9\}/.test(selfProfile));
check("W5: empty state (bukan data palsu)", /showcaseBadges\.some\(\(b\) => b\.unlocked\)/.test(selfProfile));
check("W5: komponen showcase dipertahankan", /b\.unlocked/.test(showcase) && /b\.rarity/.test(showcase));

// ---- Regresi kontrak & keamanan ----
check("Regresi: self-action tetap 409", /me\.id === id/.test(follow) && /status: 409/.test(follow) && /me\.id === id/.test(like));
check("Regresi: respond tanpa unlock/non-PII di hero", !/correctAnswer|jawaban/.test(hero));

// ---- Regresi DB: hardening TIDAK menambah migrasi baru ----
import { execSync } from "node:child_process";
try {
  const mig = execSync("git status --short prisma/migrations", { cwd: root, encoding: "utf8" }).trim();
  check("Regresi: tanpa migrasi/schema baru", mig === "", mig || "ada perubahan di prisma/migrations");
} catch {
  check("Regresi: tanpa migrasi/schema baru", false, "git status gagal");
}

console.log(`\nTest Sosial Hardening: ${checks.length - failures}/${checks.length} lulus`);
if (failures > 0) {
  for (const c of checks.filter((c) => !c.pass)) console.error(`  ✗ ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  process.exit(1);
}
process.exit(0);