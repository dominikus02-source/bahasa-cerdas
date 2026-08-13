/**
 * AI BC 2.1 — ROLE-SAFE PERSONA & STUDENT EXPERIENCE (test suite).
 *
 * A. STUDENT persona — "Teman Belajarmu", tanpa kapabilitas guru.
 * B. TEACHER persona — "Teman Guru", kapabilitas guru tersedia.
 * C. ROLE ISOLATION — peran HANYA dari sesi (server); payload klien hanya
 *    messages; getPersonaForUser memetakan role Prisma + isFounder.
 * D. ARENA (student surface) — /arena/ai SELALU student; tanpa CTA guru.
 * E. GURU — /guru/ai-bc hanya untuk GURU/founder, persona teacher.
 * F. PUBLIK — /ai-bc netral (redirect dijaga, tanpa CTA guru default).
 *
 * Anti-klise guard: pola "sebagai ai," (huruf kecil + koma) supaya frasa sah
 * "perkenalkan dirimu sebagai AI BC" tidak kena false positive.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");

let pass = 0;
let fail = 0;
const failures: string[] = [];

function ok(cond: boolean, label: string): void {
  if (cond) {
    pass++;
  } else {
    fail++;
    failures.push(label);
    console.error(`  ✗ ${label}`);
  }
}

function includes(cond: string, needle: string, label: string): void {
  ok(cond.toLowerCase().includes(needle.toLowerCase()), `${label} (harus memuat "${needle}")`);
}

function excludes(cond: string, needle: string, label: string): void {
  ok(!cond.toLowerCase().includes(needle.toLowerCase()), `${label} (tidak boleh memuat "${needle}")`);
}

function read(file: string): string {
  const p = join(ROOT, file);
  if (!existsSync(p)) return "";
  return readFileSync(p, "utf8");
}

const personas = read("src/ai/bc/personas.ts");
const context = read("lib/ai-bc/context.ts");
const knowledge = read("src/ai/bc/knowledge.ts");
const route = read("app/api/ai/bc/chat/route.ts");
const stream = read("components/ai-bc/ai-bc-stream.ts");
const types = read("components/ai-bc/ai-bc-types.ts");
const moduleFile = read("components/ai-bc/AiBcModule.tsx");
const view = read("components/ai-bc/AiBcChatView.tsx");
const arena = read("app/arena/ai/page.tsx");
const guru = read("app/(dashboard)/guru/ai-bc/page.tsx");
const publik = read("app/ai-bc/page.tsx");
const layout = read("app/ai-bc/layout.tsx");
const homeCard = read("components/student-home/AIBCHomeCard.tsx");
const identity = read("lib/ai/knowledge/bahasa-cerdas-identity.ts");

const TEACHER_KEYWORDS = [
  "rpp",
  "modul ajar",
  "perangkat pembelajaran",
  "kisi-kisi",
  "administrasi guru",
  "mengelola kelas",
  "mengelola siswa",
  "buat kelas",
  "buat soal guru",
  "buat soal untuk guru",
  "materi ajar",
];

/* ------------------------------------------------------------------ */
/* A. STUDENT persona                                                  */
/* ------------------------------------------------------------------ */

console.log("A. STUDENT persona");
ok(/STUDENT_PERSONA/.test(personas), "A1 STUDENT_PERSONA didefinisikan");
ok(/title:\s*"Teman Belajarmu"/.test(personas), "A2 title = Teman Belajarmu");
ok(/TEACHER_PERSONA/.test(personas) && /title:\s*"Teman Guru"/.test(personas), "A3 TEACHER_PERSONA title = Teman Guru");
ok(
  personas.includes("Teman cerdas untuk belajar dan mengajar Bahasa Indonesia."),
  "A4 tagline identitas tunggal ada"
);
ok(/getPersonaForUser/.test(personas), "A5 getPersonaForUser ada");
ok(/buildPersonaPrompt/.test(personas), "A6 buildPersonaPrompt ada");
ok(/assertRoleSafePrompt/.test(personas), "A7 assertRoleSafePrompt ada");
ok(/ROLE_CAPABILITIES/.test(personas), "A8 ROLE_CAPABILITIES ada");
ok(/PERSONAS/.test(personas), "A9 PERSONAS registry ada");

// Prompt murid TIDAK boleh memuat kapabilitas guru.
const studentCaps =
  personas.match(/student: \[([\s\S]*?)\],\n  teacher:/)?.[1] ?? personas;
for (const kw of TEACHER_KEYWORDS) {
  excludes(studentCaps, kw, `A10 kapabilitas guru "${kw}" tidak ada di ROLE_CAPABILITIES.student`);
}
const studentBlock =
  personas.match(/export const STUDENT_PERSONA[\s\S]*?systemPrompt: composePrompt\([^)]*ROLE_CAPABILITIES\.student\)/)?.[0] ?? "";
ok(studentBlock.length > 0, "A11 blok STUDENT_PERSONA berhasil diekstrak");
excludes(studentBlock, "rpp", "A12 blok STUDENT_PERSONA tidak memuat rpp");

/* ------------------------------------------------------------------ */
/* B. TEACHER persona                                                  */
/* ------------------------------------------------------------------ */

console.log("B. TEACHER persona");
const teacherCaps =
  personas.match(/teacher: \[([\s\S]*?)\],\n  founder:/)?.[1] ?? "";
ok(teacherCaps.length > 0, "B0 ROLE_CAPABILITIES.teacher berhasil diekstrak");
for (const kw of ["rpp", "soal dan asesmen", "kisi-kisi", "kriteria penilaian"]) {
  includes(teacherCaps, kw, `B1 kapabilitas guru "${kw}" ada di ROLE_CAPABILITIES.teacher`);
}
ok(/getPersonaForRole/.test(personas), "B2 getPersonaForRole legacy dipertahankan");
ok(/role === "GURU" \|\| role === "ADMIN" \|\| role === "FOUNDER"/.test(personas), "B3 legacy mapping guru → teacher");

/* ------------------------------------------------------------------ */
/* C. ROLE ISOLATION                                                   */
/* ------------------------------------------------------------------ */

console.log("C. Role isolation");
// Route: peran HANYA dari sesi (getUser), bukan body/query/localStorage.
includes(route, "const user = await getUser();", "C1 route mengambil sesi server");
excludes(route, "req.json().role", "C2 role tidak dibaca dari body");
excludes(route, "searchParams", "C3 role tidak dibaca dari query");
excludes(route, "localStorage", "C4 tidak ada localStorage di route");
includes(route, "getPersonaForUser({ role: user.role, isFounder: user.isFounder })", "C5 route memakai getPersonaForUser (sesi)");
includes(route, "buildPersonaPrompt", "C6 route memakai buildPersonaPrompt (guard)");
includes(route, "buildBcKnowledgeBlock", "C7 route memakai buildBcKnowledgeBlock");

// Klien: payload hanya { messages } — tipe request TIDAK punya peran/mode.
includes(stream, "body: JSON.stringify({ messages: req.messages })", "C8 body klien hanya { messages }");
const reqType = stream.match(/export interface BcStreamRequest[\s\S]*?}/)?.[0] ?? "";
ok(reqType.length > 0, "C9 tipe BcStreamRequest terdefinisi");
ok(!/\n\s*role\??:/.test(reqType), "C9 tipe request klien tanpa kunci peran top-level");
ok(!/\n\s*mode\??:/.test(reqType), "C10 tipe request klien tanpa kunci mode top-level");

// Pemetaan SSOT.
includes(personas, 'if (role === "MURID") return STUDENT_PERSONA;', "C11 MURID → student");
includes(personas, 'if (role === "GURU") return TEACHER_PERSONA;', "C12 GURU → teacher");
includes(personas, "isFounder ? FOUNDER_PERSONA : ADMIN_PERSONA", "C13 ADMIN + isFounder → founder");
includes(personas, "return NEUTRAL_PERSONA;", "C14 unknown → neutral");

// Pengetahuan per peran (student block TIDAK memuat alur kerja guru).
includes(knowledge, "buildBcKnowledgeBlock", "C15 buildBcKnowledgeBlock ada");
includes(knowledge, "buildBahasaCerdasIdentityInstruction", "C16 knowledge me-reuse SSOT identitas");
for (const kw of ["rpp", "modul ajar", "kisi-kisi", "administrasi guru"]) {
  excludes(
    knowledge.split("student: [")[1]?.split("teacher: [")[0] ?? "",
    kw,
    `C17 peta produk student tidak memuat "${kw}"`
  );
}

// Identitas SSOT tidak memuat kapabilitas guru (aman untuk prompt murid).
for (const kw of TEACHER_KEYWORDS) {
  excludes(identity, kw, `C18 identitas SSOT tidak memuat "${kw}"`);
}

/* ------------------------------------------------------------------ */
/* D. ARENA (student surface) — /arena/ai SELALU student               */
/* ------------------------------------------------------------------ */

console.log("D. Arena student surface");
ok(/role="student"/.test(arena), "D1 /arena/ai selalu student");
excludes(arena, "teacher", "D2 /arena/ai tidak memilih persona teacher");
includes(arena, 'getBcHints(user, "student")', "D3 hints murid dipaksa (roleOverride)");
excludes(arena, "isTeacher", "D4 tidak ada CTA guru di arena");
excludes(arena, "buat rpp", "D5 tanpa CTA buat RPP");
excludes(arena, "buat materi ajar", "D6 tanpa CTA materi ajar");
excludes(arena, "buat kelas", "D7 tanpa CTA buat kelas");
excludes(arena, "administrasi guru", "D8 tanpa CTA administrasi guru");
excludes(arena, "buat soal guru", "D9 tanpa CTA buat soal guru");
excludes(arena, "kisi-kisi", "D10 tanpa CTA kisi-kisi guru");

// Komponen murid — tanpa alur guru.
excludes(types.split("export const TEACHER_QUICK_ACTIONS")[0] ?? "", "rpp", "D11 quick action murid tanpa RPP");
includes(types, '"Belajar"', "D12 quick action murid: Belajar");
includes(types, '"Latihan"', "D13 quick action murid: Latihan");
includes(types, '"Jelaskan"', "D14 quick action murid: Jelaskan");
includes(types, '"Tantang Aku"', "D15 quick action murid: Tantang Aku");
includes(types, "Mau tanya apa?", "D16 gelembung idle murid");
includes(types, "Sebentar, aku pikirkan…", "D17 gelembung thinking murid");
includes(types, "Ada lagi yang mau kamu tanyakan?", "D18 penutup respons murid");
excludes(types, "Mau aku bantu buat soal?", "D19 murid tidak ditawari buat soal");
includes(types, "Tanya apa saja tentang Bahasa Indonesia", "D20 placeholder murid");
includes(homeCard, "Teman Belajarmu", "D21 kartu beranda murid = Teman Belajarmu");
excludes(homeCard, "RPP", "D22 kartu beranda murid tanpa RPP");

// Chat view: peran klien hanya memilih TONES, bukan kapabilitas.
excludes(view, "buat rpp", "D23 chat view tanpa CTA RPP");
excludes(view, "buat materi ajar", "D24 chat view tanpa CTA materi ajar");

// Anti-klise: tidak ada pembukaan "Sebagai AI, ..." di prompt murid.
const studentLower = (studentBlock + types).toLowerCase();
excludes(studentLower, "sebagai ai,", "D25 anti-klise 'sebagai ai,' tidak ada di permukaan murid");

/* ------------------------------------------------------------------ */
/* E. GURU — teacher surface                                           */
/* ------------------------------------------------------------------ */

console.log("E. Guru teacher surface");
includes(guru, '"teacher"', "E1 /guru/ai-bc persona teacher");
includes(guru, "GURU", "E2 guard peran guru ada");
includes(guru, "redirect", "E3 non-guru redirect");
includes(guru, '"/arena/ai"', "E4 redirect murid → /arena/ai");
includes(moduleFile, 'role === "teacher"', "E5 module membedakan teacher");
includes(types.split("export const STUDENT_QUICK_ACTIONS")[1] ?? "", '"Buat Materi"', "E6 quick action guru: Buat Materi");
includes(types, '"Buat Soal"', "E7 quick action guru: Buat Soal");
includes(types, '"Rancang Pembelajaran"', "E8 quick action guru: Rancang Pembelajaran");
includes(types, '"Cari Ide"', "E9 quick action guru: Cari Ide");

/* ------------------------------------------------------------------ */
/* F. PUBLIK — /ai-bc netral, redirect dijaga                          */
/* ------------------------------------------------------------------ */

console.log("F. Public landing");
includes(publik, 'redirect(isTeacher ? "/guru/ai-bc" : "/arena/ai")', "F1 redirect publik dipertahankan");
includes(publik, 'user.role === "GURU" || user.role === "ADMIN" || user.isFounder', "F2 isTeacher dari sesi (persis)");
excludes(publik, "RPP", "F3 landing publik tanpa CTA RPP default");
excludes(publik, "asesmen", "F4 landing publik tanpa CTA asesmen guru");
excludes(publik, "strategi mengajar", "F5 landing publik tanpa CTA strategi mengajar guru");
excludes(publik, "Rancang satu pertemuan materi puisi", "F6 contoh guru dihapus dari landing");
includes(publik, "Menulis & berkarya", "F7 fitur netral/murid pengganti");
includes(publik, "Jelaskan perbedaan puisi dan pantun.", "F8 contoh netral pengganti");
excludes(layout, "RPP", "F9 metadata publik tanpa RPP");
includes(layout, "Teman cerdas untuk belajar dan mengajar Bahasa Indonesia", "F10 metadata tagline tetap");
includes(types, "Teman cerdas untuk belajar dan mengajar Bahasa Indonesia.", "F11 AI_BC_TAGLINE tetap");

/* ------------------------------------------------------------------ */
/* SUMMARY                                                             */
/* ------------------------------------------------------------------ */

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error("\nFailed assertions:");
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
process.exit(0);
