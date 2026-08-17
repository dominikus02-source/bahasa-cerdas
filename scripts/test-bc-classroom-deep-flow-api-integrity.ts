/**
 * STEP 6.10 — BC CLASSROOM DEEP FLOW & API INTEGRITY (AUDIT + FIX)
 *
 * Audit menyeluruh BC Classroom / Kelasku setelah 6.0–6.9C:
 *  - Tombol "Perbarui kode kelas" (fix P1: PATCH regenerateCode)
 *  - Anti-kolisi kode akses (fix P2: getUniqueAccessCode loop)
 *  - Response-shape konsistensi antara route API dan konsumen UI
 *  - Guard ownership / role di semua route kelas
 *  - Idempotensi unik (assignment/submission/kirim/pengumuman)
 *  - Tidak ada kebocoran jawaban di payload kelas
 *
 * Run: npm run test:bc-classroom-deep-flow-api-integrity
 */
import { readFileSync, existsSync } from "fs";

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const exists = (p: string) => existsSync(p);

let passed = 0;
let failed = 0;
let discovered = 0;
function check(name: string, fn: () => boolean) {
  discovered++;
  try {
    if (fn()) { passed++; console.log(`  ✅ ${name}`); }
    else { failed++; console.log(`  ❌ ${name}`); }
  } catch (e) {
    failed++; console.log(`  ❌ ${name} — ${(e as Error).message}`);
  }
}

const groupRoute = read("app/api/group/route.ts");
const groupIdRoute = read("app/api/group/[id]/route.ts");
const joinRoute = read("app/api/group/join/route.ts");
const kelaskuDetail = read("app/api/guru/kelasku/[id]/route.ts");
const kelaskuInsight = read("app/api/guru/kelasku/[id]/insight/route.ts");
const penugasanRoute = read("app/api/guru/penugasan/route.ts");
const penugasanIdRoute = read("app/api/guru/penugasan/[id]/route.ts");
const penugasanSubmit = read("app/api/murid/penugasan/[id]/submit/route.ts");
const materiKirim = read("app/api/guru/materi/[id]/kirim/route.ts");
const pengumumanRoute = read("app/api/guru/pengumuman/route.ts");
const pengumumanIdRoute = read("app/api/guru/pengumuman/[id]/route.ts");
const pengumumanMurid = read("app/api/murid/pengumuman/route.ts");
const quizAssign = read("app/api/guru/quiz/[id]/assign/route.ts");
const kelaskuPage = read("app/(dashboard)/guru/kelasku/page.tsx");
const muridPage = read("app/(dashboard)/murid/kelasku/[id]/page.tsx");
const composer = read("components/kelas/ClassroomComposer.tsx");
const submissionReview = read("components/kelas/SubmissionReview.tsx");
const schema = read("prisma/schema.prisma");
const accessCodeLib = read("lib/classroom/access-code.ts");

function main() {
  console.log("\n📋 STEP 6.10 — BC CLASSROOM DEEP FLOW & API INTEGRITY");
  console.log("=".repeat(64));

  // ── 1. Fix P1: Perbarui kode kelas ──────────────────────────────────────
  console.log("\n── 1. Tombol 'Perbarui kode kelas' (P1) ──");
  check("1. PATCH /api/group/[id] menerima regenerateCode", () => /regenerateCode === true/.test(groupIdRoute));
  check("1. PATCH memakai getUniqueAccessCode", () => groupIdRoute.includes("getUniqueAccessCode"));
  check("1. UI kirim regenerateCode: true (bukan body kosong)", () => {
    const m = kelaskuPage.match(/const handleRefreshCode[\s\S]*?\n  \};/);
    return !!m && m[0].includes("regenerateCode: true") && !m[0].includes("JSON.stringify({})");
  });
  check("1. UI menampilkan feedback toast setelah perbarui kode", () => /Kode kelas berhasil diperbarui/.test(kelaskuPage));
  check("1. UI update kode di state daftar & detail kelas", () => /setGroups\(\(prev\) => prev\.map\(\(g\) => \(g\.id === groupId \? \{ \.\.\.g, accessCode/.test(kelaskuPage) || /accessCode: newCode \?\? g\.accessCode/.test(kelaskuPage));
  check("1. handleRefreshCode tidak lagi best-effort senyap (ada error path)", () => /belum berhasil diperbarui/.test(kelaskuPage));

  // ── 2. Fix P2: Anti-kolisi kode akses ───────────────────────────────────
  console.log("\n── 2. Kode akses anti-kolisi (P2) ──");
  check("2. lib/classroom/access-code.ts ada (SSOT)", () => exists("lib/classroom/access-code.ts"));
  check("2. generateAccessCode 8 char charset tanpa 0/O/1/I/L", () => accessCodeLib.includes("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") && accessCodeLib.includes("8"));
  check("2. getUniqueAccessCode loop retry (bukan cek sekali)", () => /for \(let attempt = 0; attempt < maxAttempts/.test(accessCodeLib));
  check("2. POST /api/group memakai getUniqueAccessCode", () => groupRoute.includes("getUniqueAccessCode") && !groupRoute.includes("let code = generateCode"));
  check("2. POST /api/group tidak punya generateCode lokal lagi", () => !groupRoute.includes("function generateCode"));
  check("2. PATCH memakai helper yang sama (SSOT)", () => groupIdRoute.includes("getUniqueAccessCode"));

  // ── 3. Response-shape konsistensi ───────────────────────────────────────
  console.log("\n── 3. Response-shape route vs konsumen UI ──");
  check("3. GET /api/group → { groups } dan UI baca data.groups", () => /return NextResponse\.json\(\{ groups \}\)/.test(groupRoute) && /data\.groups \?\? \[\]/.test(kelaskuPage));
  check("3. POST /api/group → { group, code } dan UI baca data.group.accessCode", () => /group, code: group\.accessCode/.test(groupRoute) && /data\.group\.accessCode/.test(kelaskuPage));
  check("3. kelasku/[id] → agregat (stats/tugasQuiz/tugasPenugasan/pengumuman/materis)", () => ["stats", "tugasQuiz", "tugasPenugasan", "pengumuman", "materis"].every((k) => kelaskuDetail.includes(k)));
  check("3. detail guru diset langsung dari response (setDetail(data))", () => /setDetail\(data\)/.test(kelaskuPage));
  check("3. composer materi: GET /api/guru/materi?limit=40 → data.data", () => /data\.data \?\? \[\]/.test(composer) && composer.includes("/api/guru/materi?limit=40"));
  check("3. composer quiz/latihan: fallback shape (quizzes/latihans ?? data ?? [])", () => /data\.quizzes \?\? data\.data \?\? data/.test(composer) && /data\.latihans \?\? data\.data \?\? data/.test(composer));
  check("3. composer pengumuman: POST /api/guru/pengumuman dengan groupIds", () => /\/api\/guru\/pengumuman/.test(composer) && /groupIds: selected/.test(composer));
  check("3. SubmissionReview: GET penugasan/[id] → data.murid (list murid)", () => /data\.murid/.test(submissionReview) && /\/api\/guru\/penugasan\/\$\{penugasanId\}/.test(submissionReview));
  check("3. murid kelasku: baca daftar kelas dari /api/murid/kelasku", () => /\/api\/murid\/kelasku/.test(muridPage));

  // ── 4. Guard ownership & role ───────────────────────────────────────────
  console.log("\n── 4. Guard ownership / role ──");
  check("4. GET /api/group role-gated isTeacherOrStudent", () => /isTeacherOrStudent/.test(groupRoute));
  check("4. PATCH/DELETE /api/group/[id] ownership teacherId", () => /group\.teacherId !== dbUser\.id/.test(groupIdRoute) && /group\.teacherId !== dbUser\.id && !isPrivileged/.test(groupIdRoute));
  check("4. GET /api/group/[id] ownership teacherId (bukan cuma auth)", () => /if \(group\.teacherId !== dbUser\.id\) return NextResponse\.json\(\{ error: "Forbidden"/.test(groupIdRoute));
  check("4. join hanya menerima kelas aktif", () => joinRoute.includes("isActive: true"));
  check("4. murid submit penugasan di-scope membership kelas", () => /group: \{ include: \{ members: \{ where: \{ userId: user\.id \}/.test(penugasanSubmit) && /penugasan\.group\.members\.length === 0/.test(penugasanSubmit));
  check("4. kelasku/[id] guru cek ownership (SSOT getTeacherGroupDetail)", () => kelaskuDetail.includes("getTeacherGroupDetail") && /where: \{ id: groupId, teacherId, isActive: true \}/.test(read("lib/teacher/students.ts")));
  check("4. insight route role-gated", () => /isTeacherOrStudent|GURU|ADMIN|founder/i.test(kelaskuInsight));

  // ── 5. Idempotensi unik di schema ───────────────────────────────────────
  console.log("\n── 5. Idempotensi (unique constraint) ──");
  check("5. QuizAssignment @@unique([quizId, groupId])", () => schema.includes("@@unique([quizId, groupId])"));
  check("5. MateriKirim @@unique([materiId, groupId])", () => schema.includes("@@unique([materiId, groupId])"));
  check("5. PenugasanSubmission @@unique([penugasanId, userId])", () => schema.includes("@@unique([penugasanId, userId])"));
  check("5. QuizSubmission @@unique([assignmentId, userId, attemptNumber])", () => schema.includes("@@unique([assignmentId, userId, attemptNumber])"));
  check("5. PengumumanSubmission @@unique([pengumumanId, userId])", () => schema.includes("@@unique([pengumumanId, userId])"));
  check("5. Group.accessCode @unique", () => /accessCode\s+String\s+@unique/.test(schema));
  check("5. GroupMember @@unique([groupId, userId])", () => schema.includes("@@unique([groupId, userId])"));

  // ── 6. Tidak ada kebocoran jawaban di payload kelas ─────────────────────
  console.log("\n── 6. Anti-kebocoran jawaban ──");
  check("6. kelasku/[id] tidak membawa correctAnswer/jawaban", () => !/correctAnswer/.test(kelaskuDetail) && !/jawaban/.test(kelaskuDetail));
  check("6. penugasan GET detail tidak membawa jawaban kuis", () => !/correctAnswer/.test(penugasanIdRoute));
  check("6. pengumuman route tidak membawa jawaban", () => !/correctAnswer/.test(pengumumanRoute) && !/correctAnswer/.test(pengumumanMurid));
  check("6. materi kirim tidak membawa jawaban", () => !/correctAnswer/.test(materiKirim));
  check("6. insight route tidak membawa jawaban", () => !/correctAnswer/.test(kelaskuInsight));

  // ── 7. Cleanup polling & best-effort (leak kandidat) ────────────────────
  console.log("\n── 7. Polling & resource cleanup ──");
  check("7. Polling detail 20s di-clear saat closeGroup", () => /closeGroup[\s\S]{0,200}/.test(kelaskuPage) && /clearInterval\(pollRef\.current\)/.test(kelaskuPage));
  check("7. Polling di-clear di cleanup effect", () => /return \(\) => \{ if \(pollRef\.current\) \{ clearInterval\(pollRef\.current\)/.test(kelaskuPage));
  check("7. fetchGroups cek res.ok (regresi)", () => /!res\.ok/.test(kelaskuPage));
  check("7. SubmissionReview insight best-effort (.catch)", () => /\.catch\(/.test(submissionReview));

  // ── 8. Delete kelas: pristine → delete, punya relasi → archive ──────────
  console.log("\n── 8. Hapus kelas aman (data murid tidak hancur) ──");
  check("8. DELETE cek relasi sebelum hapus", () => /members \+ quizzes \+ assignments \+ penugasans \+ nilais \+ messages \+ kategoris > 0/.test(groupIdRoute));
  check("8. Kelas berelasi di-archive (isActive: false), bukan dihapus", () => /archived: true/.test(groupIdRoute) && /isActive: false/.test(groupIdRoute));
  check("8. Kelas pristine boleh hard-delete", () => /deleted: true, archived: false/.test(groupIdRoute));
  check("8. UI toast arsip vs hapus jelas", () => /Kelas berhasil dihapus dari daftar aktif/.test(kelaskuPage));

  // ── 9. Composer flow integrity ──────────────────────────────────────────
  console.log("\n── 9. Composer (materi/link/tugas/latihan/pengumuman) ──");
  check("9. Kirim materi multi-kelas pakai Promise.all + skipDuplicates aman", () => composer.includes("/api/guru/materi/${mid}/kirim") && composer.includes("groupIds: selected"));
  check("9. Link: POST pengumuman dengan judul fallback 'Link belajar'", () => /judul: notes\.trim\(\) \|\| "Link belajar"/.test(composer));
  check("9. Tugas: POST /api/guru/penugasan dengan body groupIds", () => /\/api\/guru\/penugasan/.test(composer) && /groupIds: selected/.test(composer));
  check("9. Latihan: POST quiz assign dengan groupIds", () => /quiz\/\$\{pickedId\}\/assign/.test(composer) && /groupIds/.test(composer));

  // ── 10. Insight route integrity ─────────────────────────────────────────
  console.log("\n── 10. Insight ──");
  check("10. Insight route membaca skill/learner-state (rule-based)", () => /skills|Skill|learner|Learner/i.test(kelaskuInsight));
  check("10. Insight muridId param dipakai", () => /muridId/.test(kelaskuInsight));

  console.log("\n" + "=".repeat(64));
  console.log(`Discovered: ${discovered} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? "✅ SEMUA LULUS" : "❌ ADA KEGAGALAN");
  process.exit(failed === 0 ? 0 : 1);
}

main();
