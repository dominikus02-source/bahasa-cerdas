/**
 * test-profile-social-stats.ts — URGENT BUGFIX: statistik sosial profil murid
 * (LIKE / PENGIKUT / MENGIKUTI tampil 0 padahal data Follow/ProfileLike nyata).
 *
 * Tanpa DB — static analysis file (konsisten gaya test-social-hardening.ts).
 * Memastikan kontrak semantik + wiring konsumen:
 *   1.  GET /social membalas 404 untuk target yang tidak ada
 *   2.  followerCount = COUNT Follow dengan followingId = pemilik (pengikut)
 *   3.  followingCount = COUNT Follow dengan followerId = pemilik (diikuti)
 *   4.  profileLikeCount = COUNT ProfileLike dengan targetId = pemilik
 *       (BUKAN likerId — jangan tertukar)
 *   5.  preview follower/following maks 6 (tidak pernah dipakai sebagai total)
 *   6.  isFollowing/isLiked: null tanpa auth, boolean dengan auth
 *   7.  respon sosial tidak memuat PII target (email / fullName penuh)
 *   8.  /social sengaja no-cache (bukan cache 300s seperti /profile/[id])
 *   9.  konsumen self (/murid/profile) memakai authenticated user id (me.id),
 *       bukan string "me" / undefined
 *  10.  kegagalan API TIDAK disamarkan sebagai nol valid: ada branching
 *       (res.ok vs else) + logging pada jalur gagal
 *  11.  kartu LIKE di PlayerStatsGrid memakai social.profileLikeCount saat
 *       sosial tersedia (bukan user.totalLikes karya); fallback legacy hanya
 *       di cabang request gagal
 *  12.  kartu PENGIKUT/MENGIKUTI = social.followerCount / followingCount
 *       (bukan panjang array preview)
 *  13.  SocialConnections menerima count numerik (bukan followers.length)
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

const SOCIAL = join(root, "app/api/user/profile/[id]/social/route.ts");
const SELF_PROFILE = join(root, "app/(dashboard)/murid/profile/page.tsx");
const CONNECTIONS = join(root, "components/profile/SocialConnections.tsx");
const MIGRATION = join(root, "prisma/migrations/manual/2026-08-10_profile_follow.sql");

for (const [label, p] of Object.entries({ social: SOCIAL, selfProfile: SELF_PROFILE, connections: CONNECTIONS, migration: MIGRATION })) {
  if (!existsSync(p)) { check(`file ada: ${label}`, false, `${p} tidak ditemukan`); process.exit(1); }
}

const social = readFileSync(SOCIAL, "utf8");
const selfProfile = readFileSync(SELF_PROFILE, "utf8");
const connections = readFileSync(CONNECTIONS, "utf8");

// 1 — target tidak ada => 404 (bukan 200 kosong / bukan 500)
check("1: /social 404 untuk user tidak ada", /NextResponse\.json\(\{ error: "User tidak ditemukan" \}, \{ status: 404 \}\)/.test(social));

// 2 — follower = yang MENGIKUTI target (followingId = pemilik profil)
check("2: followerCount = count Follow followingId = pemilik", /db\.follow\.count\(\{ where: \{ followingId: id \} \}\)/.test(social));

// 3 — following = yang DIIKUTI target (followerId = pemilik profil)
check("3: followingCount = count Follow followerId = pemilik", /db\.follow\.count\(\{ where: \{ followerId: id \} \}\)/.test(social));

// 4 — like profil = ProfileLike dengan targetId = pemilik (bukan likerId)
check("4: profileLikeCount = count ProfileLike targetId = pemilik", /db\.profileLike\.count\(\{ where: \{ targetId: id \} \}\)/.test(social));

// 5 — preview maks 6, hanya untuk avatar stack
check("5: preview followers/following dibatasi take 6", (social.match(/take: 6/g) ?? []).length === 2);

// 6 — viewer flags: null tanpa auth, boolean dengan auth
check("6: isFollowing/isLiked null tanpa auth, boolean dengan auth",
  /isFollowing: me \? !!viewerFollow : null/.test(social) && /isLiked: me \? !!viewerLike : null/.test(social));

// 7 — privasi: payload respon sosial hanya { id, displayName, avatar, rank }
const socialPayload = social.slice(social.lastIndexOf("return NextResponse.json("));
check("7: respon /social tanpa PII (email/fullName) di payload", !/email/.test(socialPayload) && !/fullName/.test(socialPayload));

// 8 — no-cache: tidak ada header Cache-Control / revalidate pada respon
check("8: /social tidak memakai cache (tanpa Cache-Control/revalidate)",
  !/Cache-Control/.test(social) && !/revalidate/.test(social) && !/unstable_cache/.test(social));

// 9 — self-profile memakai authenticated user id dari /api/user/me
check("9: konsumen self memakai me.id (bukan 'me' string)", /fetch\(`\/api\/user\/profile\/\$\{me\.id\}\/social`\)/.test(selfProfile) && !/profile\/me\/social/.test(selfProfile));

// 10 — kegagalan tidak disamarkan sebagai nol valid: branching + logging
check("10: branching res.ok vs else + console.warn pada jalur gagal",
  /if \(socRes\.ok\) \{/.test(selfProfile) &&
  /console\.warn\(/.test(selfProfile) &&
  /console\.error\("Gagal memuat statistik sosial", e\)/.test(selfProfile));

// 11 — LIKE = profileLikeCount saat sosial tersedia; fallback legacy totalLikes
check("11: kartu LIKE memakai social.profileLikeCount saat tersedia",
  /social \? social\.profileLikeCount : user\.totalLikes \|\| 0/.test(selfProfile));

// 12 — PENGIKUT/MENGIKUTI dari count API (bukan panjang array preview)
check("12: kartu Pengikut/Mengikuti = followerCount/followingCount",
  /label: "Pengikut", value: social\?\.followerCount \?\? 0/.test(selfProfile) &&
  /label: "Mengikuti", value: social\?\.followingCount \?\? 0/.test(selfProfile));

// 13 — SocialConnections menerima count numerik (dari props, bukan preview.length)
check("13: SocialConnections pakai count numerik, bukan preview.length",
  /followerCount: social\.followerCount/.test(selfProfile) &&
  /followingCount: social\.followingCount/.test(selfProfile) &&
  /extraFollowers = Math\.max\(0, followerCount - followers\.length\)/.test(connections));

console.log(`\nTest Profile Social Stats: ${checks.length - failures}/${checks.length} lulus`);
if (failures > 0) {
  for (const c of checks.filter((c) => !c.pass)) console.error(`  ✗ ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  process.exit(1);
}
process.exit(0);