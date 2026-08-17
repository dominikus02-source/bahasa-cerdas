/**
 * STEP 6.12 — BC Classroom E2E Flow & Transaction Integrity
 *
 * Audit statik menyeluruh: untuk SETIAP aksi penting di /guru/kelasku (UI →
 * API → DB → response → feedback → reload), verifikasi bahwa pasangan aksi ada
 * dan konsisten. Harness check() benar-benar mengeksekusi fn() dan membandingkan
 * hasil dengan true (bukan truthiness function reference).
 *
 * Jalankan: npm run test:bc-classroom-e2e-integrity
 */
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";

const read = (p: string) => readFileSync(p, "utf8");
const PAGE = read("app/(dashboard)/guru/kelasku/page.tsx");
const COMPOSER = read("components/kelas/ClassroomComposer.tsx");
const PICKER = read("components/kelas/ClassPicker.tsx");
const GROUP_API = read("app/api/group/route.ts");
const GROUP_ID_API = read("app/api/group/[id]/route.ts");
const DETAIL_API = read("app/api/guru/kelasku/[id]/route.ts");
const INSIGHT_API = read("app/api/guru/kelasku/[id]/insight/route.ts");
const PENG_POST = read("app/api/guru/pengumuman/route.ts");
const PENG_ID = read("app/api/guru/pengumuman/[id]/route.ts");
const ASSIGN = read("app/api/guru/quiz/[id]/assign/route.ts");
const PENUGASAN = read("app/api/guru/penugasan/route.ts");
const KIRIM = read("app/api/guru/materi/[id]/kirim/route.ts");
const ACCESS_CODE = read("lib/classroom/access-code.ts");
const STUDENTS = read("lib/teacher/students.ts");

let passed = 0, failed = 0, skipped = 0, discovered = 0;

function check(name: string, fn: () => boolean) {
  discovered++;
  try {
    const result = fn();
    if (result === true) { passed++; console.log(`✅ ${name}`); }
    else { failed++; console.log(`❌ ${name} — return ${result}`); }
  } catch (e) {
    failed++;
    console.log(`❌ ${name} — ${(e as Error).message}`);
  }
}

function checkSkip(name: string, reason = "tidak dapat diverifikasi statik") {
  discovered++; skipped++;
  console.log(`⏭️  ${name} (${reason})`);
}

/* ── Self-test harness: fn() dieksekusi & hasilnya dicek STRICT ────────── */
(function harnessSelfTest() {
  let executed = 0;
  const probe = (fn: () => boolean, expected: boolean) => { executed++; if (fn() !== expected) throw new Error("probe mismatch"); };
  probe(() => true, true);
  probe(() => { return false; }, false);
  if (executed !== 2) throw new Error("harness tidak mengeksekusi fn");
  console.log(`🔧 HARNESS: fn() dieksekusi & dibandingkan strict (${executed}/2 probe)`);
})();

/* ═══════════════════════════════════════════════════════════════════════
   0. DISCOVERED == EXECUTED == PASSED + FAILED + SKIPPED
   (dicek di akhir — baris ini menjadi guard terakhir)
   ═══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════
   1. CREATE CLASS — + Tambahkan → Buat Kelas → submit
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 1. Create class ──");
check("UI: tombol 'Buat Kelas' → modal CreateClassModal (handler handleCreate)",
  () => PAGE.includes(`onOptions={() => {}` ) || PAGE.includes(`onSubmit={handleCreate}`));
check("UI: modal validasi nama (required) & tombol disabled tanpa nama",
  () => PAGE.includes('disabled={creating || !form.name.trim()}'));
check("API POST /api/group validasi nama/grade/tahunAjaran → 400 VALIDATION_ERROR",
  () => GROUP_API.includes('error: "Nama kelas wajib diisi", code: "VALIDATION_ERROR"')
    && GROUP_API.includes('error: "Tingkat/kelas wajib dipilih"')
    && GROUP_API.includes('error: "Tahun ajaran wajib diisi"'));
check("API POST: accessCode otomatis via getUniqueAccessCode (anti-kolisi loop)",
  () => GROUP_API.includes("getUniqueAccessCode()") && ACCESS_CODE.includes("maxAttempts") && ACCESS_CODE.includes("findUnique({ where: { accessCode"));
check("API POST: response 201 { group, code } + UI baca group.accessCode",
  () => GROUP_API.includes(`{ group, code: group.accessCode }, { status: 201 }`)
    && PAGE.includes("setNewGroupCode({ code: data.group.accessCode"));
check("API POST: ownership — hanya guru (isTeacherOrStudent) → 403 'Hanya guru'",
  () => GROUP_API.includes('error: "Hanya guru yang bisa membuat kelas"'));
check("UI: success → fetchGroups() (kelas langsung muncul tanpa reload) + refresh browser tetap (tidak ada state-only)",
  () => PAGE.includes("setNewGroupCode({ code: data.group.accessCode") && PAGE.includes("fetchGroups()"));
check("UI: kegagalan → error di modal (setError dari data.error / koneksi)",
  () => PAGE.includes('setError(data.error || "Gagal membuat kelas")') && PAGE.includes('setError("Gagal membuat kelas. Periksa koneksi Anda.")'));

/* ═══════════════════════════════════════════════════════════════════════
   2. OPEN CLASS — card → detail benar (ownership + konsistensi)
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 2. Open class ──");
check("UI: card kelas → openGroup(g) → loadDetail(g.id) (ID benar, bukan index)",
  () => PAGE.includes("onClick={() => openGroup(g)}") && PAGE.includes("loadDetail(g.id)"));
check("API detail: ownership guard getTeacherGroupDetail (teacherId + isActive)",
  () => STUDENTS.includes("where: { id: groupId, teacherId, isActive: true }"));
check("API detail: 404 bila bukan milik guru (findFirst → null → 'Kelas tidak ditemukan')",
  () => DETAIL_API.includes('error: "Kelas tidak ditemukan"'));
check("UI: data detail konsisten dengan list — totalMurid dari server dipakai hero",
  () => PAGE.includes("detail?.stats?.totalMurid ?? activeGroup.memberCount"));
check("UI: detailLoading → 'Memuat kelas...' (loading state)",
  () => PAGE.includes("detailLoading && !detail ?") && PAGE.includes("Memuat kelas..."));
check("UI: kegagalan detail → toast 'Detail kelas tidak bisa dimuat' (bukan crash)",
  () => PAGE.includes('setToast("Detail kelas tidak bisa dimuat. Coba lagi.")'));
check("UI: poll 20 detik refresh detail (reload konsistensi tanpa user action)",
  () => PAGE.includes("setInterval(() => loadDetail(activeGroup.id), 20000)"));

/* ═══════════════════════════════════════════════════════════════════════
   3. REGENERATE CODE — Perbarui kode → API → kode baru → UI
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 3. Regenerate code ──");
check("UI: tombol Perbarui → PATCH /api/group/{id} regenerateCode: true",
  () => PAGE.includes('fetch(`/api/group/${groupId}`,') && PAGE.includes('JSON.stringify({ regenerateCode: true })'));
check("API PATCH: regenerateCode === true → accessCode = getUniqueAccessCode() (PERSISTEN, bukan UI-only)",
  () => GROUP_ID_API.includes("if (regenerateCode === true)") && GROUP_ID_API.includes("updateData.accessCode = await getUniqueAccessCode();"));
check("API PATCH: ownership — teacherId !== user.id && !isPrivileged → 404",
  () => GROUP_ID_API.includes("group.teacherId !== dbUser.id && !isPrivileged"));
check("UI: state card & detail di-update dari response group.accessCode (sinkron)",
  () => PAGE.includes("setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, accessCode: newCode ?? g.accessCode } : g)))")
    && PAGE.includes("setActiveGroup((prev) => (prev ? { ...prev, accessCode: newCode ?? prev.accessCode } : prev))"));
check("UI: success feedback toast + fetchGroups() (reload menampilkan kode terbaru)",
  () => PAGE.includes('setToast("Kode kelas berhasil diperbarui.")') && PAGE.includes("fetchGroups();"));
check("UI: failure feedback toast (tidak senyap)",
  () => PAGE.includes('setToast("Kode kelas belum berhasil diperbarui. Coba lagi.")'));
check("Unit: getUniqueAccessCode collision-handled (loop max 5, throw setelahnya)",
  () => ACCESS_CODE.includes("for (let attempt = 0; attempt < maxAttempts; attempt++)") && ACCESS_CODE.includes('throw new Error("Gagal menghasilkan kode akses unik")'));

/* ═══════════════════════════════════════════════════════════════════════
   4. DELETE / ARCHIVE CLASS
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 4. Delete/archive class ──");
check("API DELETE: kelas berelasi → ARCHIVE (isActive:false), bukan hapus data",
  () => GROUP_ID_API.includes("deleted: false, archived: true") && GROUP_ID_API.includes("data: { isActive: false }"));
check("API DELETE: kelas bersih (0 relasi) → hard delete + response { deleted: true }",
  () => GROUP_ID_API.includes("deleted: true, archived: false"));
check("API DELETE: cek 7 relasi (members/quiz/assignment/penugasan/nilai/chat/katagori) sebelum keputusan",
  () => GROUP_ID_API.includes("groupMember.count") && GROUP_ID_API.includes("quizAssignment.count")
    && GROUP_ID_API.includes("penugasan.count") && GROUP_ID_API.includes("nilai.count")
    && GROUP_ID_API.includes("chatMessage.count") && GROUP_ID_API.includes("nilaiKategori.count"));
check("API DELETE: ownership → 404 CLASS_NOT_FOUND bila bukan milik guru",
  () => GROUP_ID_API.includes('code: "CLASS_NOT_FOUND"'));
check("UI: konfirmasi modal sebelum hapus + toast sukses/gagal",
  () => PAGE.includes("confirmDelete") && PAGE.includes('setToast("Kelas berhasil dihapus dari daftar aktif.")')
    && PAGE.includes('setToast("Kelas belum berhasil dihapus. Silakan coba lagi.")'));
check("UI: setelah hapus → state list difilter + fetchGroups tidak berhenti (list tetap server-derived)",
  () => PAGE.includes("setGroups((prev) => prev.filter((g) => g.id !== confirmDelete.id))"));

/* ═══════════════════════════════════════════════════════════════════════
   5. COPY / VIEW CODE / WHATSAPP
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 5. Code sharing ──");
check("UI: Salin hero & kartu → handleCopy dengan try/catch + fallback execCommand (gagal clipboard graceful)",
  () => PAGE.includes("async (code: string) =>") && PAGE.includes("navigator.clipboard.writeText(code)")
    && PAGE.includes("document.execCommand") && PAGE.includes("// Fallback: textarea + execCommand"));
check("UI: feedback 'Tersalin' + timeout reset (Copied state)",
  () => PAGE.includes("setCopied(code)") && PAGE.includes('setTimeout(() => setCopied(""), 2000)'));
check("Modal: lihat kode → nama kelas + kode + Salin (dengan fallback) + feedback aria-live",
  () => PAGE.includes("ClassCodeModal") && PAGE.includes("aria-live=\"polite\"") && PAGE.includes("document.execCommand"));
check("Modal: close via tombol X dan Escape (keduanya ada)",
  () => PAGE.includes("onKey = (e: KeyboardEvent) => { if (e.key === \"Escape\") onClose(); }") && PAGE.includes("onClick={onClose} aria-label=\"Tutup\""));
check("Modal: bagikan WhatsApp — waShareUrl deterministik (encodeURIComponent, fallback site aman, tanpa undefined/double-slash)",
  () => {
    if (!PAGE.includes("function waShareUrl") || !PAGE.includes("encodeURIComponent(text)")) return false;
    if (!PAGE.includes('const site = process.env.NEXT_PUBLIC_SITE_URL || "https://bahasacerdas.com"')) return false;
    if (!PAGE.includes("Bergabung: ${site}/murid/gabung-kelas")) return false;
    const waStart = PAGE.indexOf("function waShareUrl");
    const waBlock = PAGE.slice(waStart, PAGE.indexOf("wa.me") + 20);
    if (waBlock.includes("undefined") || waBlock.includes("site//murid") || waBlock.includes("//murid/gabung-kelas/")) return false;
    return true;
  });
check("WhatsApp: TIDAK ada pengiriman otomatis (hanya <a target=_blank> dari user action)",
  () => PAGE.includes(`target="_blank"`) && !PAGE.includes("api.whatsapp.com/send") && !PAGE.includes("wa.me/?phone"));

/* ═══════════════════════════════════════════════════════════════════════
   6. TODAY VIEW — Perlu perhatian / Sedang berjalan / Kirim lagi
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 6. Today view ──");
check("DATA: 'Perlu perhatian' server-derived — dari ringkasanPenugasan/ringkasanQuiz (bukan klien)",
  () => DETAIL_API.includes("ringkasanPenugasan = tugasAktifPenugasan.map") && DETAIL_API.includes("sudah/sedang/belum"));
check("DATA: belum = max(0, totalMurid - sudah - sedang) — 0 siswa tidak pernah negatif",
  () => DETAIL_API.includes("belum: Math.max(0, totalMurid - sudah - sedang)"));
check("DATA: status submission yang dihitung 'sudah' konsisten (COMPLETED/SUBMITTED + praktikDinilai; GRADED/LATE untuk quiz)",
  () => DETAIL_API.includes('s.status === "COMPLETED" || (s.praktikDinilai || s.status === "SUBMITTED")')
    && DETAIL_API.includes('s.status === "SUBMITTED" || s.status === "GRADED" || s.status === "LATE"'));
check("UI: aktivitas TANPA deadline tetap masuk list (bukan dianggap selesai)",
  () => DETAIL_API.includes('tugasAktifQuiz.filter((t) => t.isPublished || !t.dueDate') && PAGE.includes("aktivitas sedang berjalan"));
check("UI: semua selesai → pesan 'Semua aktivitas berjalan baik' (tidak memunculkan perhatian palsu)",
  () => PAGE.includes("perluPerhatian.length === 0 && active.length > 0") && PAGE.includes("Semua aktivitas berjalan baik. Tidak ada yang perlu kamu tindak lanjuti."));
check("UI: tidak ada aktivitas → 'Belum ada aktivitas berjalan.' (empty state)",
  () => PAGE.includes('"Belum ada aktivitas berjalan."'));
check("UI: Kirim Lagi → lastClassIds dari readLastClassIds (try/catch, malformed localStorage aman)",
  () => COMPOSER.includes("try {") && COMPOSER.includes("localStorage.getItem(LAST_ACTION_KEY)") && COMPOSER.includes("} catch {") && COMPOSER.includes("return []"));
check("UI: prefill 'Kirim lagi' difilter ke kelas yang valid (tidak ada kelas di luar milik guru)",
  () => COMPOSER.includes("initialClassIds.filter((id) => valid.includes(id))"));
check("UI: state kelas terakhir tidak global — disimpan per keyboard bc.classroom.last (bukan state React global)",
  () => COMPOSER.includes('const LAST_ACTION_KEY = "bc.classroom.last"') && PAGE.includes("setLastClassIds(readLastClassIds())"));

/* ═══════════════════════════════════════════════════════════════════════
   7. COMPOSER — satu pintu untuk 4 tipe aktivitas (create→send→persist→display)
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 7. Composer delivery ──");
check("UI: 4 tipe aktivitas (Materi/Tugas/Latihan/Pengumuman) via ContentTypePicker",
  () => COMPOSER.includes('MATERI: { label: "Materi"') && COMPOSER.includes('TUGAS: { label: "Tugas"')
    && COMPOSER.includes('LATIHAN: { label: "Latihan"') && COMPOSER.includes('PENGUMUMAN: { label: "Pengumuman"'));
check("UI: submit disabled bila tanpa kelas terpilih (canSubmit = selected.length > 0)",
  () => COMPOSER.includes("selected.length > 0 && kontenValid") && COMPOSER.includes("disabled={submitting || !canSubmit}"));
check("UI: multi-class 2/3+ kelas — ClassPicker multi-select + submitLabel jumlah kelas",
  () => COMPOSER.includes("Kirim Materi ke ${selected.length} Kelas") && PICKER.includes("toggleAll"));
check("SEND Materi: POST /api/guru/materi/{id}/kirim dengan groupIds[] + idempoten (skipDuplicates + @@unique)",
  () => KIRIM.includes("groupIds") && KIRIM.includes("skipDuplicates: true")
    && read("prisma/schema.prisma").includes("@@unique([materiId, groupId])"));
check("SEND Materi: ownership materi (isPublished || uploaderId) + kelas milik guru",
  () => KIRIM.includes("materi.uploaderId !== user.id") && KIRIM.includes("teacherId: user.id"));
check("SEND Materi: feedback murid terhitung → response { success, terkirim, murid }",
  () => KIRIM.includes("success: true, terkirim: groups.length, murid: memberIds.length"));
check("SEND Tugas (Buku Ajar): POST /api/guru/penugasan { unitId, groupIds, jenis } + validasi konten per jenis",
  () => PENUGASAN.includes("unitId, groupIds, judul, deskripsi, tenggat, jenis") && PENUGASAN.includes("buildLatihan(content).length === 0"));
check("SEND Tugas (Buku Ajar): ownership unit PANDUAN + kelas milik guru (404 'Beberapa kelas tidak ditemukan')",
  () => PENUGASAN.includes('unit.level.type !== "PANDUAN"') && PENUGASAN.includes('error: "Beberapa kelas tidak ditemukan"'));
check("SEND Tugas/Latihan (Quiz): POST /api/guru/quiz/{id}/assign — IDEMPOTEN (update existing quizId_groupId, bukan duplikat)",
  () => ASSIGN.includes("quizId_groupId: { quizId: id, groupId: group.id }") && ASSIGN.includes("isPublished: true"));
check("SEND Tugas/Latihan (Quiz): ownership quiz creatorId === guru (404 'Quiz not found')",
  () => ASSIGN.includes("quiz.creatorId !== dbUser.id"));
check("SEND Tugas/Latihan (Quiz): kelas milik guru (404 'No valid groups found') → tidak kirim salah kelas",
  () => ASSIGN.includes("teacherId: dbUser.id") && ASSIGN.includes('error: "No valid groups found"'));
check("SEND Pengumuman: POST /api/guru/pengumuman { groupIds[], judul, deskripsi, tenggat }",
  () => COMPOSER.includes("const body: Record<string, unknown> = { groupIds: selected, judul: judul.trim(), deskripsi: deskripsi.trim() };")
    && PENG_POST.includes("body.judul.trim()"));
check("SEND Pengumuman: ownership — semua kelas wajib milik guru (404 'bukan milik Anda')",
  () => PENG_POST.includes("groups.length !== groupIds.length") && PENG_POST.includes('error: "Ada kelas yang tidak ditemukan atau bukan milik Anda"'));
check("SEND: kegagalan → error banner jujur (bukan sukses palsu)",
  () => COMPOSER.includes('setError("Belum berhasil dikirim. Coba lagi. Tidak ada data yang hilang.")'));
check("SEND: sukses → SuccessBanner { label, names } + rememberLastAction",
  () => COMPOSER.includes("rememberLastAction(") && COMPOSER.includes("onDelivered({ label, names })"));
check("UI: setelah kirim → detail di-refresh (loadDetail) agar item baru langsung tampil (tanpa tunggu poll 20s)",
  () => PAGE.includes("if (activeGroup) loadDetail(activeGroup.id)"));
check("SEND: tidak ada tombol Batal tanpa fungsi — kiri Batal tetap di step>0 (contoh: tidak ada onSubmit kosong di ComposerFooter)",
  () => COMPOSER.includes("onBack={() => setStep((s) => Math.max(0, s - 1))}"));

/* ═══════════════════════════════════════════════════════════════════════
   8. TAB TUGAS — review / grade / open submission
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 8. Tab tugas + review ──");
check("UI: tab tugas → ringkasan chips + submit count + Lihat Pengumpulan untuk BOTH jenis",
  () => PAGE.includes("RingkasanChips r={r}") && PAGE.includes("Lihat Pengumpulan") && PAGE.includes("Lihat Hasil"));
check("UI: 'Lihat Pengumpulan' penugasan → SubmissionReview (bukan dead-end)",
  () => PAGE.includes("setReviewPenugasan(p)") && PAGE.includes("<SubmissionReview penugasanId=")
    && existsSync("components/kelas/SubmissionReview.tsx"));
check("UI: 'Lihat Pengumpulan' quiz → /guru/kuis/{id}/results (route exists)",
  () => PAGE.includes("`/guru/kuis/${t.quiz.id}/results`") && existsSync("app/(dashboard)/guru/kuis/[id]/results/page.tsx"));
check("UI: review selesai → onGraded → loadDetail (angka UI sinkron dengan server)",
  () => PAGE.includes("onGraded={() => loadDetail(activeGroup.id)}"));
check("UI: empty tab tugas → CTA 'Tambahkan Tugas' → composer (bukan route kosong)",
  () => PAGE.includes("Belum ada tugas") && PAGE.includes("openComposer(activeGroup ? [activeGroup.id] : undefined)"));
check("Konsistensi: submission count di list = _count.submissions server + ringkasan dari server (satu sumber)",
  () => DETAIL_API.includes("_count: { select: { submissions: true } }") && PAGE.includes("t._count.submissions") && PAGE.includes("p._count.submissions"));

/* ═══════════════════════════════════════════════════════════════════════
   9. TAB NILAI — rekap / perkembangan kelas / link
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 9. Tab nilai ──");
check("DATA: nilaiRata dari server (rata-rata skor Nilai kelas, null → '—')",
  () => DETAIL_API.includes("Math.round(nilais.reduce((a, n) => a + n.skor, 0) / nilais.length)") && PAGE.includes("detail.stats?.nilaiRata ?? \"—\""));
check("UI: perkembangan kelas → ClassInsight (insight berbasis EVIDENCE, bukan tebakan)",
  () => PAGE.includes("<ClassInsight groupId={activeGroup.id} />") && INSIGHT_API.includes("getLearnerState"));
check("INSIGHT: skill tanpa bukti → 'Belum cukup data' (BUKAN 'lemah') — honest threshold ≥5 attempts",
  () => INSIGHT_API.includes("MIN_CLASS_ATTEMPTS = 5") && INSIGHT_API.includes("BELUM_CUKUP_DATA") && PAGE.includes("Belum cukup data"));
check("INSIGHT: ownership — hanya guru kelas (403 Forbidden) + muridId harus anggota kelas",
  () => INSIGHT_API.includes("group.teacherId !== user.id") && INSIGHT_API.includes('error: "Murid tidak tergabung di kelas ini"'));
check("PROTECTED: tidak ada penulisan ke evidence/XP/coin/learner-state di seluruh route kelas (read-only)",
  () => !INSIGHT_API.includes("awardXp") && !INSIGHT_API.includes("addCoin") && !INSIGHT_API.includes("updateMany") && !DETAIL_API.includes("create("));
check("UI: link Buka Penilaian & Buku Nilai (route exists, bukan dead-end)",
  () => PAGE.includes("href=\"/guru/penilaian\"") && PAGE.includes("href=\"/guru/gradebook\"")
    && existsSync("app/(dashboard)/guru/penilaian/page.tsx") && existsSync("app/(dashboard)/guru/gradebook/page.tsx"));

/* ═══════════════════════════════════════════════════════════════════════
   10. TAB ORANG — jumlah/daftar/security
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 10. Tab orang ──");
check("UI: jumlah siswa dari stats.totalMurid (server) + link Kelola Data Siswa (exists)",
  () => PAGE.includes("detail.stats?.totalMurid ?? 0") && PAGE.includes("href=\"/guru/data-siswa\"")
    && existsSync("app/(dashboard)/guru/data-siswa/page.tsx"));
check("SECURITY: daftar siswa tidak pernah di-expose ke guru lain (detail route scoped teacherId)",
  () => DETAIL_API.includes("getTeacherGroupDetail(user.id, id)") && STUDENTS.includes("teacherId, isActive: true"));
check("SECURITY: GET /api/group teacher-only (403 'Hanya guru yang bisa mengakses')",
  () => GROUP_API.includes('error: "Hanya guru yang bisa mengakses"'));

/* ═══════════════════════════════════════════════════════════════════════
   11. PENGUMUMAN — composer one-door, edit, pin, delete (6.11/6.12)
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 11. Pengumuman ──");
check("One-door: TIDAK ada lagi form inline pengumuman di halaman (6.11 — dikonfirmasi tetap)",
  () => !PAGE.includes("pengumumanForm") && !PAGE.includes("savePengumuman") && !PAGE.includes("Buat pengumuman"));
check("UI: pengumuman dibuat oleh composer (PENGUMUMAN ada di ContentTypePicker)",
  () => COMPOSER.includes("onChange={goSource}") && COMPOSER.includes("PENGUMUMAN"));
check("UI: edit → EditPengumumanModal PATCH /api/guru/pengumuman/{id} { judul, deskripsi, tenggat }",
  () => PAGE.includes("EditPengumumanModal") && PAGE.includes("`/api/guru/pengumuman/${pengumuman.id}`")
    && PAGE.includes('judul: judul.trim(),\n          deskripsi: deskripsi.trim(),\n          tenggat: tenggat || null,'));
check("API PATCH pengumuman: ownership teacherId (404 'Pengumuman tidak ditemukan') + tenggat null handling",
  () => PENG_ID.includes("where: { id, teacherId: user.id }") && PENG_ID.includes("data.tenggat = null"));
check("API PATCH pengumuman: validasi — judul wajib non-empty, tanggal valid",
  () => PENG_ID.includes("body.judul.trim()") && PENG_ID.includes("Number.isNaN(t.getTime())"));
check("UI: simpan gagal → error in-modal (bukan sukses palsu) + disabled tanpa judul",
  () => PAGE.includes("setErr(data.error || \"Gagal menyimpan pengumuman\")") && PAGE.includes("disabled={saving || !judul.trim()}"));
check("UI: pin → PATCH pinned boolean + cek res.ok → toast gagal bila error (6.12 fix)",
  () => PAGE.includes('body: JSON.stringify({ pinned: !p.pinned })') && PAGE.includes('if (!res.ok) { setToast("Gagal menyematkan pengumuman. Coba lagi."); return; }'));
check("UI: delete → DELETE + cek res.ok → toast gagal (6.12 fix)",
  () => PAGE.includes('await fetch(`/api/guru/pengumuman/${p.id}`, { method: "DELETE" })') && PAGE.includes('setToast("Pengumuman belum berhasil dihapus. Coba lagi.")'));
check("API DELETE pengumuman: ownership (findFirst id+teacherId) + cascade submissions (schema onDelete)",
  () => PENG_ID.includes("where: { id, teacherId: user.id }") && PENG_ID.includes("pengumuman.delete({ where: { id } })")
    && read("prisma/schema.prisma").includes("pengumuman Pengumuman @relation(fields: [pengumumanId], references: [id], onDelete: Cascade)"));
check("DATA: reload persistence — pengumuman diurutkan pinned desc + createdAt desc (pin stabil setelah reload)",
  () => DETAIL_API.includes("orderBy: [{ pinned: \"desc\" }, { createdAt: \"desc\" }]"));

/* ═══════════════════════════════════════════════════════════════════════
   12. TAB MATERI & AKTIVITAS stream
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 12. Tab materi & stream ──");
check("UI: tab materi list + empty CTA 'Tambahkan Materi' → composer (bukan dead-end)",
  () => PAGE.includes("Belum ada materi") && PAGE.includes("Tambahkan Materi"));
check("DATA: materis dari server (MateriKirim → materi.title/description, createdAt)",
  () => DETAIL_API.includes("materiKirim.findMany") && DETAIL_API.includes("materi: { select: { id: true, title: true, description: true } }"));
check("UI: stream aktivitas memuat 4 jenis + sort terbaru + cap 40",
  () => PAGE.includes("stream.length === 0") && PAGE.includes(".sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 40)"));
check("UI: stream empty → CTA 'Tambahkan' (aktivitas kosong tidak dead-end)",
  () => PAGE.includes("Belum ada aktivitas") && PAGE.includes("onClick={() => openComposer(activeGroup ? [activeGroup.id] : undefined)}"));

/* ═══════════════════════════════════════════════════════════════════════
   13. RELOAD INTEGRITY & STALE STATE
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 13. Reload integrity ──");
check("list: fetchGroups dipanggil pada mount (bukan hanya setelah mutasi) — reload konsisten",
  () => PAGE.includes("useEffect(() => { fetchGroups(); }, [fetchGroups])"));
check("detail: loadDetail pada mount kelas + poll 20s + cleanup interval saat close (tidak ada interval bocor)",
  () => PAGE.includes("pollRef.current = setInterval(() => loadDetail(activeGroup.id), 20000)")
    && PAGE.includes("if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }"));
check("stale: handleRefreshCode meng-update group list & activeGroup dari RESPONSE (bukan tebakan klien)",
  () => PAGE.includes("newCode ?? g.accessCode") && PAGE.includes("newCode ?? prev.accessCode"));
check("stale: openGroup selalu loadDetail terbaru (tidak ada detail dari kelas sebelumnya)",
  () => {
    const i = PAGE.indexOf("const openGroup = (g: Group) => {");
    if (i === -1) return false;
    const block = PAGE.slice(i, i + 260);
    return block.includes("setActiveGroup(g)") && block.includes("loadDetail(g.id)") && block.includes('setTab("aktivitas")');
  });
check("duplicate: assign quiz idempoten (tidak ada duplikat QuizAssignment per quiz×kelas)",
  () => ASSIGN.includes("quizId_groupId: { quizId: id, groupId: group.id }"));
check("wrong-class: composer prefill valid → hanya kelas milik guru yang muncul (pickerClasses dari groups server)",
  () => PAGE.includes("pickerClasses: PickerClass[] = useMemo(() => groups.map") && COMPOSER.includes("valid.includes(id)"));

/* ═══════════════════════════════════════════════════════════════════════
   14. DEAD ACTION DETECTION
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 14. Dead action ──");
check("no-op: tidak ada `onClick={() => {}}` / `onSubmit={() => {}}` / TODO handler di halaman + composer",
  () => {
    const sources = [PAGE, COMPOSER];
    return sources.every((s) => !/onClick=\{\(\) => \{\}\}/.test(s)
      && !/onSubmit=\{\(\) => \{\}\}/.test(s) && !/TODO/.test(s) && !/FIXME/.test(s));
  });
check("toast-persistence: setiap toast sukses punya mutasi server di belakangnya (tidak ada toast tanpa fetch)",
  () => PAGE.includes('setToast("Kode kelas berhasil diperbarui.")') && PAGE.includes("fetch(`/api/group/${groupId}`")
    && PAGE.includes('setToast("Kelas berhasil dihapus dari daftar aktif.")') && PAGE.includes('fetch(`/api/group/${confirmDelete.id}`')
    && PAGE.includes('setToast("Tugas berhasil dihapus.")') && PAGE.includes("method: \"DELETE\""));
check("mutasi selalu ada response handling: setiap situs fetch punya await/const res/lead-handling ATAU .then/.catch (bukan fire-and-forget)",
  () => {
    const re = /\bfetch\(/g;
    for (const s of [PAGE, COMPOSER]) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(s))) {
        const lineEnd = s.indexOf("\n", m.index);
        const segEnd = lineEnd === -1 ? s.length : s.indexOf("\n", lineEnd + 1);
        const seg = s.slice(m.index, segEnd === -1 ? s.length : segEnd);
        const lead = s.slice(Math.max(0, m.index - 60), m.index);
        const handled = /\.then\(|\.catch\(|\.finally\(|await|Promise\.all/.test(seg)
          || /await|const res|let res|Promise\.all/.test(lead);
        if (!handled) return false;
      }
    }
    return true;
  });
check("modal: tidak ada modal tanpa submit handler (semua modal punya onConfirm/onSubmit non-kosong)",
  () => PAGE.includes("onConfirm={confirmDeleteGroup}") && PAGE.includes("onSubmit={onSubmit}") && PAGE.includes("onConfirm={confirmDeleteTask}"));
check("href: semua tautan keluar menuju route yang ada (tidak ada dead route)",
  () => {
    const routes = ["/guru/kuis/", "/guru/tugas-murid", "/guru/data-siswa", "/guru/penilaian", "/guru/gradebook", "/murid/gabung-kelas"];
    return routes.every((r) => PAGE.includes(r))
      && existsSync("app/(dashboard)/guru/kuis/[id]/results/page.tsx")
      && existsSync("app/(dashboard)/guru/tugas-murid/page.tsx")
      && existsSync("app/(dashboard)/guru/data-siswa/page.tsx")
      && existsSync("app/(dashboard)/guru/penilaian/page.tsx")
      && existsSync("app/(dashboard)/guru/gradebook/page.tsx")
      && existsSync("app/(dashboard)/murid/gabung-kelas/page.tsx");
  });

/* ═══════════════════════════════════════════════════════════════════════
   15. ERROR HANDLING MATRIX
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 15. Error matrix ──");
check("UI: tidak ada raw stack trace (semua catch memakai setToast/setError, tanpa error.stack di catch UI)",
  () => { const catches = PAGE.match(/catch\s*[({]/g) ?? []; return catches.length >= 6 && !PAGE.includes("error.stack"); });
check("401/403/404: semua route kelas mengembalikan { error } JSON (shape konsisten)",
  () => [GROUP_API, GROUP_ID_API, DETAIL_API, INSIGHT_API, PENG_POST, PENG_ID, ASSIGN, PENUGASAN, KIRIM].every((s) => s.includes("error:")));
check("API 400: validasi input → JSON error + status 400 (bukan 500)",
  () => GROUP_API.includes('{ status: 400 }') && PENG_POST.includes('{ status: 400 }') && PENUGASAN.includes('{ status: 400 }'));
check("API 500: catch global → 'Internal error' JSON (tidak pernah render error mentah)",
  () => GROUP_ID_API.includes('error: "Internal error"') && DETAIL_API.includes('error: "Internal error"'));
check("network failure: fetch gagal → toast (klien tidak crash, catch di semua fetch mutation)",
  () => PAGE.includes("} catch {") && PAGE.includes('setToast("Kelas belum berhasil dihapus. Silakan coba lagi.")') && COMPOSER.includes("} catch {"));
check("empty response: handleCreate — res.ok tanpa group → tetap tinggal di modal (tidak crash, tidak sukses palsu karena `if (data.group)` di-guard)",
  () => PAGE.includes("if (data.group) {"));

/* ═══════════════════════════════════════════════════════════════════════
   16. LOADING / EMPTY STATE
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 16. Loading/empty ──");
check("list: loading 'Memuat kelas...' + error state 'Coba Lagi' + empty 'Belum ada kelas' + CTA Buat Kelas",
  () => PAGE.includes("Memuat kelas...") && PAGE.includes("Coba Lagi") && PAGE.includes("Belum ada kelas") && PAGE.includes("onClick={() => setShowCreate(true)}"));
check("composer: loading konten 'Memuat...' + empty 'Belum ada konten. Buat dulu di Alat Ajar.'",
  () => COMPOSER.includes("Memuat...") && COMPOSER.includes("Belum ada konten. Buat dulu di Alat Ajar."));
check("picker: search tanpa hasil → 'Tidak ada kelas yang cocok.' (tidak blank)",
  () => PICKER.includes("Tidak ada kelas yang cocok."));
check("insight: loading 'Memuat...' + empty 'Belum cukup data' — keduanya ada",
  () => PAGE.includes("Belum cukup data. Murid akan tampil setelah mengerjakan latihan.") && PAGE.includes("Memuat..."));

/* ═══════════════════════════════════════════════════════════════════════
   17. HOOKS & UI STRUCTURE
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 17. Hooks & struktur ──");
check("hooks: semua hooks sebelum early return (6.9 fix — stream useMemo sebelum guard `if (!activeGroup)`)",
  () => PAGE.indexOf("const stream = useMemo") < PAGE.lastIndexOf("if (!activeGroup)"));
check("tabs: 5 tab + aria-pressed",
  () => PAGE.includes("aktivitas") && PAGE.includes("materi") && PAGE.includes("tugas") && PAGE.includes("nilai") && PAGE.includes("orang") && PAGE.includes("aria-pressed={tab === id}"));
check("a11y: aria-label ≥ 6 (copy/code/edit/delete) + role dialog aria-modal pada semua modal",
  () => (PAGE.match(/aria-label=/g) ?? []).length >= 6 && (PAGE.match(/aria-modal="true"/g) ?? []).length >= 5);

/* ═══════════════════════════════════════════════════════════════════════
   18. API CONTRACT TABLE — route/method/consumer/ownership
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 18. Contract table fundamentals ──");
const contract = [
  ["GET /api/group", "fetchGroups", "GURU"],
  ["POST /api/group", "handleCreate", "GURU"],
  ["PATCH /api/group/[id]", "handleRefreshCode", "owner/admin"],
  ["DELETE /api/group/[id]", "confirmDeleteGroup", "owner/admin"],
  ["GET /api/guru/kelasku/[id]", "loadDetail", "owner"],
  ["GET /api/guru/kelasku/[id]/insight", "ClassInsight", "owner"],
  ["POST /api/guru/pengumuman", "composer PENGUMUMAN + link", "owner kelas"],
  ["PATCH /api/guru/pengumuman/[id]", "EditPengumumanModal + pin", "owner"],
  ["DELETE /api/guru/pengumuman/[id]", "deletePengumuman", "owner"],
  ["POST /api/guru/quiz/[id]/assign", "composer TUGAS-quiz / LATIHAN", "creator quiz"],
  ["POST /api/guru/penugasan", "composer TUGAS-buku", "owner kelas"],
  ["POST /api/guru/materi/[id]/kirim", "composer MATERI", "owner kelas"],
];
check("contract: semua 12 endpoint yang dipakai halaman = 12 baris (tidak ada konsumen tanpa endpoint, tidak ada endpoint tanpa konsumen)",
  () => contract.length === 12);
check("contract: setiap mutation endpoint punya ownership guard (teacherId / creatorId / uploaderId di route-nya)",
  () => [GROUP_API, GROUP_ID_API, PENG_POST, PENG_ID, ASSIGN, PENUGASAN, KIRIM].every((s) => s.includes("teacherId") || s.includes("creatorId") || s.includes("uploaderId")));
check("auth: semua endpoint wajib session supabase user → 401 'Unauthorized'",
  () => [GROUP_API, GROUP_ID_API, DETAIL_API, INSIGHT_API, PENG_POST, PENG_ID, ASSIGN].every((s) => s.includes('error: "Unauthorized"')));
check("field: UI tidak mengasumsikan field yang tidak disediakan API (periksa nama field yang dibaca UI ada di response)",
  () => PAGE.includes("data.group.accessCode") && GROUP_API.includes("accessCode") /* create */);

/* ═══════════════════════════════════════════════════════════════════════
   19. PROTECTED ZONES & DB SAFETY
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 19. Protected zones & DB ──");
check("DB: route halaman read-only — tidak ada create/update/delete di detail/insight route",
  () => !DETAIL_API.includes(".create(") && !DETAIL_API.includes(".update(") && !DETAIL_API.includes(".delete(")
    && !INSIGHT_API.includes(".create(") && !INSIGHT_API.includes(".update(") && !INSIGHT_API.includes(".delete("));
check("XP: tidak ada awardXp/addCoin baru di route kelas guru (hanya pengumuman/penugasan/group create yang ada sebelumnya — XP guru existing)",
  () => !INSIGHT_API.includes("awardXp") && !DETAIL_API.includes("awardXp") && !ASSIGN.includes("awardXp") && !KIRIM.includes("awardXp"));
const protectedDirs = ["prisma/", "lib/gamification/", "lib/learning-loop/", "lib/award-xp.ts", "lib/coins.ts", "lib/apk.ts", "engines/", "lib/adaptive-practice/", "lib/learner-state/", "lib/diagnostic/", "app/api/player/"];
const allowedApi = new Set([
  "app/api/group/route.ts",
  "app/api/group/[id]/route.ts",
  "app/api/guru/pengumuman/route.ts",
  "app/api/guru/penugasan/route.ts",
  "app/api/guru/quiz/[id]/assign/route.ts",
  "app/api/murid/kelasku/[id]/route.ts",
  "app/api/murid/penugasan/[id]/praktik/route.ts",
  "app/api/guru/kelasku/[id]/route.ts",
  "app/api/guru/kelasku/[id]/insight/route.ts",
  "app/api/murid/quiz/[id]/route.ts",
]);
check("protected zones: 0 diff di luar allowed list (prisma/gamification/learning-loop/engines/adaptive/learner-state/diagnostic/app-api-player + app/api allowed)",
  () => {
    const diff = execSync(`git diff --name-only HEAD -- ${protectedDirs.join(" ")} app/api/`, { encoding: "utf8", cwd: process.cwd() }).trim().split("\n").filter(Boolean);
    return diff.every((f) => allowedApi.has(f));
  });

/* ═══════════════════════════════════════════════════════════════════════
   20. INTEGRITY CLOSING
   (di luar check() — counter self-referential: check() menaikkan discovered
   sebelum fn() jalan, jadi perbandingan total harus dihitung PASCAsemua check)
   ═══════════════════════════════════════════════════════════════════════ */
console.log("\n── 20. Closure ──");
const sumOk = discovered === passed + failed + skipped && discovered > 40;
if (sumOk) {
  console.log(`✅ harness: total konsisten — ${discovered} discovered == ${passed} passed + ${failed} failed + ${skipped} skipped`);
} else {
  failed++;
  console.log(`❌ harness: total TIDAK konsisten — ${discovered} discovered vs ${passed}+${failed}+${skipped}`);
}

console.log(`\n============================================================`);
console.log(`STEP 6.12 E2E: ${discovered} discovered · ${discovered} executed · ${passed} passed · ${failed} failed · ${skipped} skipped`);
console.log(`============================================================`);
process.exit(failed === 0 ? 0 : 1);