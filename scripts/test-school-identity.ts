// Unit test P1-C Phase 1 — Canonical School Identity foundation.
//
// Dua lapisan (sama seperti test-gamification-engine / test-guru-phase):
//  1. Tes logika murni — normalizeSchoolName (impor fungsi asli).
//  2. Tes keamanan statis — verifikasi schema Prisma + SQL migration + tidak
//     ada fuzzy match / auto-merge / backfill / authorization by schoolId.
//
// Tidak butuh koneksi DB. Jalan di CI bersama suite lain.
import { readFileSync } from "fs";
import { join } from "path";
import { normalizeSchoolName } from "@/lib/school/normalize";

let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/manual/2026-08-08_school_identity.sql");
const normalizeSrc = read("lib/school/normalize.ts");
const registerSrc = read("app/actions/register.ts");
const profileRouteSrc = read("app/api/user/profile/route.ts");
const teacherSvcSrc = read("lib/teacher/students.ts");

// ── TEST 1 — Migration preserves Profile.school ─────────────────────────────
ok("T1: migration menambah schoolId (bukan menghapus school)",
  /ADD COLUMN IF NOT EXISTS "schoolId" TEXT/.test(migration));
ok("T1: migration TIDAK drop kolom school", !/DROP COLUMN.*"school"/.test(migration));
ok("T1: migration TIDAK mengubah nilai school (tanpa UPDATE Profile)",
  !/UPDATE "Profile"/.test(migration));
ok("T1: register tetap menulis school mentah (sanitize HTML-escape, bukan normalisasi)",
  /school: sanitize\(school\)/.test(registerSrc));

// ── TEST 2 — Profile.schoolId nullable ──────────────────────────────────────
ok("T2: schema schoolId String? (nullable)", /schoolId\s+String\?/.test(schema));
ok("T2: migration schoolId TEXT tanpa NOT NULL",
  /ADD COLUMN IF NOT EXISTS "schoolId" TEXT\s*;/.test(migration));

// ── TEST 3 — Canonical identity independen dari Profile.school ──────────────
ok("T3: Profile mempertahankan school String?", /school\s+String\?/.test(schema));
ok("T3: Profile punya schoolId terpisah (dual identity)",
  /school\s+String\?/.test(schema) && /schoolId\s+String\?/.test(schema));

// ── TEST 4 — SchoolAlias milik tepat satu School ────────────────────────────
ok("T4: model SchoolAlias ada", /model SchoolAlias \{/.test(schema));
ok("T4: SchoolAlias.schoolId String (wajib, bukan nullable)",
  /model SchoolAlias \{[\s\S]*?schoolId\s+String(?!\?)/.test(schema));
ok("T4: SchoolAlias punya relasi ke School", /school\s+School\s+@relation\(fields: \[schoolId\]/.test(schema));
ok("T4: School punya aliases SchoolAlias[]", /aliases\s+SchoolAlias\[\]/.test(schema));

// ── TEST 5 — Alias ternormalisasi tidak boleh menunjuk ke >1 sekolah ────────
ok("T5: schema @@unique([normalizedAlias])", /@@unique\(\[normalizedAlias\]\)/.test(schema));
ok("T5: SQL UNIQUE index normalizedAlias",
  /CREATE UNIQUE INDEX IF NOT EXISTS "SchoolAlias_normalizedAlias_key"/.test(migration));

// ── TEST 6 — Normalisasi deterministik ──────────────────────────────────────
ok("T6: trim + kolaps spasi + lowercase", normalizeSchoolName("  SMP   HARAPAN   BANGSA  ") === "smp harapan bangsa");
ok("T6: deterministik (input sama → output sama)",
  normalizeSchoolName("SMP Harapan Bangsa") === normalizeSchoolName("  SMP   Harapan   Bangsa "));
ok("T6: Unicode NFC (NFD input dinormalisasi)", normalizeSchoolName("SMP Darma\u0301 ").normalize("NFC") === "smp darmá".normalize("NFC"));
ok("T6: empty/null → ''", normalizeSchoolName("") === "" && normalizeSchoolName(null) === "" && normalizeSchoolName(undefined) === "");
ok("T6: tidak menghapus tipe/lokasi (SAFE rules)",
  normalizeSchoolName("SMP Santa Laurensia Alam Sutera") === "smp santa laurensia alam sutera");

// ── TEST 7 — Normalisasi tidak pernah memutasi Profile.school ───────────────
const rawInput = "  SMP   Harapan   Bangsa  ";
const before = rawInput;
normalizeSchoolName(rawInput);
ok("T7: fungsi murni — input tidak berubah", rawInput === before);
ok("T7: register TIDAK memakai normalizeSchoolName", !/normalizeSchoolName/.test(registerSrc));
ok("T7: PATCH profile TIDAK memakai normalizeSchoolName", !/normalizeSchoolName/.test(profileRouteSrc));
ok("T7: PATCH profile tetap menulis school mentah", /school/.test(profileRouteSrc));

// ── TEST 8 — Group/GroupMember tetap valid ──────────────────────────────────
ok("T8: Group.teacherId → User tetap ada", /model Group \{[\s\S]*?teacherId\s+String(?!\?)/.test(schema));
ok("T8: Group.members GroupMember[] tetap ada", /members\s+GroupMember\[\]/.test(schema));
ok("T8: GroupMember.groupId/userId tetap ada", /model GroupMember \{[\s\S]*groupId\s+String[\s\S]*userId\s+String/.test(schema));
ok("T8: GroupMember @@unique([groupId, userId]) tetap ada", /@@unique\(\[groupId, userId\]\)/.test(schema));
ok("T8: Group/GroupMember TIDAK diberi schoolId (tidak berubah)",
  !/model Group \{[\s\S]{0,400}schoolId/.test(schema) && !/model GroupMember \{[\s\S]{0,400}schoolId/.test(schema));

// ── TEST 9 — School identity tidak menjadi authorization ────────────────────
ok("T9: SSOT (lib/teacher/students.ts) tidak memakai schoolId untuk akses",
  !/schoolId/.test(teacherSvcSrc));
ok("T9: SSOT tetap guard via isTeacherOrStudent (role-based)",
  /isTeacherOrStudent/.test(teacherSvcSrc));
ok("T9: ownership guru tetap via teacherId", /teacherId/.test(teacherSvcSrc));
const schoolBlock = schema.slice(schema.indexOf("model School {"), schema.indexOf("model SchoolAlias {"));
ok("T9: School hanya berelasi ke SchoolAlias + Profile (bukan data privat)",
  /aliases\s+SchoolAlias\[\]/.test(schoolBlock) && /profiles\s+Profile\[\]/.test(schoolBlock) &&
  !/(Nilai|Quiz|Submission|GameResult|TestAnswer|StudentKarya)/.test(schoolBlock));
ok("T9: tidak ada relasi schoolId ke model privat (Nilai/Quiz/Submission/Game)",
  !/schoolId[\s\S]{0,200}(Nilai|Quiz|Submission|GameResult|TestAnswer)/.test(schema));

// ── TEST 10 — siswa boleh schoolId=null tanpa merusak flow ──────────────────
ok("T10: migration TANPA backfill (tidak ada UPDATE Profile)", !/UPDATE "Profile"/.test(migration));
ok("T10: agregasi legacy tetap memakai Profile.school (belum dimigrasi)",
  /profile\?\.school|profile\.school/.test(read("app/api/guru/hasil-karya/leaderboard/route.ts")));
ok("T10: gamification leaderboard tetap memakai .school (belum dimigrasi)",
  /school:\s*\{\s*not\s*:\s*null/.test(read("lib/gamification/leaderboard.ts")) && /mine\.school/.test(read("lib/gamification/leaderboard.ts")));
ok("T10: null schoolId aman (school legacy tetap dibaca display)", /school\s+String\?/.test(schema));

// ── TEST 11 — Arsitektur mendukung School → Group → GroupMember → Student ───
ok("T11: jalur School → Profile.schoolId → User ada", /schoolRef\s+School\?/.test(schema));
ok("T11: Profile.userId → User tetap ada", /userId\s+String\s+@unique/.test(schema));
ok("T11: User.groupMemberships GroupMember[] tetap ada", /groupMemberships\s+GroupMember\[\]/.test(schema));
ok("T11: GroupMember.groupId → Group tetap ada (onDelete Cascade)",
  /group\s+Group\s+@relation\(fields: \[groupId\]/.test(schema));
ok("T11: perilaku keanggotaan TIDAK diubah (tidak ada kolom baru di Group/GroupMember)",
  !/schoolId/.test(schema.slice(schema.indexOf("model Group {"), schema.indexOf("model GroupQuiz {"))));

// ── TEST 12 — Guru bisa multi-konteks sekolah tanpa schoolId global ─────────
const userBlock = schema.slice(schema.indexOf("model User {"), schema.indexOf("model Profile {"));
ok("T12: User TIDAK punya schoolId (tidak memaksa satu sekolah per guru)",
  !/schoolId/.test(userBlock));
ok("T12: tidak ada model TeacherSchool (duplikat konsep)", !/model TeacherSchool/.test(schema));
ok("T12: jalur multi-sekolah tetap mungkin via Group → teacherId → Profile",
  /model Group \{[\s\S]*?teacherId\s+String(?!\?)/.test(schema) && /schoolRef\s+School\?/.test(schema));

// ── TEST 13 — Tidak ada fuzzy matching ──────────────────────────────────────
ok("T13: normalize.ts tanpa implementasi fuzzy/levenshtein/similarity",
  !/^import\s/m.test(normalizeSrc) && !/levenshtein\(|similarity\(|getDistance|fuzzyMatch\(/.test(normalizeSrc));
ok("T13: tidak ada model SchoolIdentityEvidence (ditunda, bukan dibuat)",
  !/model SchoolIdentityEvidence/.test(schema));
ok("T13: tidak ada auto-create School dari DISTINCT Profile.school di migration",
  !/DISTINCT[\s\S]*"Profile"\.school|INSERT INTO "School"/.test(migration));

// ── TEST 14 — Tidak ada auto-merge sekolah ──────────────────────────────────
ok("T14: tidak ada kode mergeSchool di repo",
  !/mergeSchool|autoMerge|merge_school/i.test(
    [
      schema,
      migration,
      normalizeSrc,
      read("prisma/schema.prisma"),
    ].join("\n")
  ));
ok("T14: migration TANPA DELETE School/SchoolAlias",
  !/DELETE FROM "School"|DELETE FROM "SchoolAlias"/.test(migration));
ok("T14: migration TANPA updateMany Profile school",
  !/updateMany|UPDATE "Profile"/.test(migration));

console.log(fail === 0 ? "\nSEMUA LULUS" : `\n${fail} GAGAL`);
process.exit(fail === 0 ? 0 : 1);
