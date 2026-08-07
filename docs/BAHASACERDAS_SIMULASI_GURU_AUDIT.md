# Audit Sistem Simulasi Guru — Hasil, Review, Dokumen (Phase 2)

Deliverable audit (AUDIT ONLY — tidak ada perubahan kode). Untuk modernisasi sistem simulasi guru gaya
Google Classroom + ExamSoft + AI Teaching Assistant: dashboard hasil, AI Review Center, repository dokumen,
export, dan filter global. Dibuat 7 Agustus 2026 oleh opencode. **Menunggu persetujuan founder sebelum
implementasi.**

---

## 1. Diagram Alur (Saat Ini)

```
MURID                                              GURU
─────                                              ────
/murid/simulasi/{ukbi,tka}                          /guru/simulasi/{ukbi,tka}   (landing paket)
   │ getUKBIPackages() / getTKAPackages()                │
   ▼                                                     │
/kompetisi/[paketId]/device-check                        │
   ▼                                                     │
/kompetisi/[paketId]   → TesScreen                        │
   │ GET  /api/kompetensi/[paketId]   (soal random+snapshot ter-sanitasi)
   │ POST /api/kompetensi/[paketId]/submit  (skoring + AI grade konstruktif)
   ▼                                                      │
/kompetisi/[paketId]/hasil → GET /api/kompetensi/[paketId]/hasil → TestResultPanel
   │ sertifikat dibuat bila lulus (UKBI ≥ 482 / TKA ≥ passingScore)
   ▼
/murid/dokumen-latihan → GET /api/user/sertifikat (dokumen hasil)

                                 GURU (fasilitasi yang akan dibenahi):
                                 ──────────────────────────────────────────
                                 /guru/hasil-simulasi   → server page query DB langsung → HasilSimulasiClient
                                 /guru/tinjau-simulasi  → GET /api/guru/tinjau-konstruktif + PATCH manual
                                 /guru/dokumen-latihan  → GET /api/guru/dokumen-siswa → card + preview
```

Alur `submit` (kunci pipeline):

```
POST /api/kompetensi/[paketId]/submit
  ├─ rate-limit 30/menit ("simulation-submit")
  ├─ TestSession upsert (status COMPLETED) + guard EMPTY_ANSWERS + idempotency progres
  ├─ buildAnswerRows: skor PG (weight difficulty UKBI / weight*10 TKA)
  ├─ construksi (Menulis/Berbicara):
  │    acquireAiSlot(pool: "grade-constructed") → gradeConstructed:
  │       MENULIS   → LLM (callWithFallback + response_format json) vs rubric
  │       BERBICARA → answer=URL rekaman → transcribeSpeaking(Groq Whisper) → LLM vs rubric
  │    AI gagal / saturated → score=0, isCorrect=null, sectionScores[seksi].pendingReview++
  ├─ $transaction batch (P2002-safe):
  │    deleteMany TestAnswer(session) → createMany TestAnswer → create ProgresKompetensi(COMPLETED)
  ├─ KompetensiCertificate (di luar tx, hanya bila lulus) + awardXp("KOMPETENSI", rawScore, paketId)
```

---

## 2. Model DB Relevan (`prisma/schema.prisma`)

| Model | Baris | Kolom penting |
|-------|-------|---------------|
| PaketKompetensi | 409 | title, type (UKBI_*/TKA_*), mode, duration, passingScore, passingGrade, sections(count by sec), totalQuestions, sectionsData, questionPool, attemptLimit, isActive, isPremium, creatorId |
| UKBIQuestion | 350 | text, options(JSON), correctAnswer, seksi, difficulty, cognitive, audioUrl/asset |
| TKAQuestion | 381 | text, options, correctAnswer, kompetensi, weight, unit |
| ProgresKompetensi | 438 | userId, paketId, attemptNumber, status(TestStatus), totalScore, rawScore, maxScore, percentage, predikat, predikatLama, sectionScores(JSON), seksiScores(JSON), answerDetails(JSON) [sync], startedAt, finishedAt, timeSpent, `@@unique([userId,paketId,attemptNumber])`, `@@index([userId,status])` |
| KompetensiCertificate | 465 | userId, paketId, progresId, score, predikat, percentage, certificateNo, qrCode, pdfUrl, issuedAt, expiresAt |
| TestSession | 484 | userId, paketId, status, currentSection, currentQuestion, answers(JSON), questionSnapshot(JSON sanitized), flagged, startedAt, finishedAt, expiresAt, `@@unique([userId,paketId])` |
| TestAnswer | 508 | userId, sessionId, paketId, questionId, questionType(PILIHAN…/CONSTRUCTED), answer (teks / URL audio), isCorrect(Boolean?), score(Float), seksi, sectionIndex, createdAt |
| Notifikasi | 1280 | userId, title, body, type, isRead, data |
| Group / GroupMember | 1295+ | kelas + murid |
| User | — | role(GURU/MURID/ADMIN), isFounder, fullName |

Integritas:
- TestSession unique [userId,paketId] → 1 sesi per murid/paket; retake = update sesi.
- ProgresKompetensi punya kolom attemptNumber → history per percobaan utuh.
- `answerDetails` berisi snapshot+scoring & TIDAK boleh dirender ke client (leakage), HANYA frontend server-side.
- Tidak ada field `feedback` untuk hasil grade AI Menulis/Berbicara — skor tersimpan di `TestAnswer.score`
  dan feedback dibuang. AI Review Center perlu menyimpan feedback (opsional kolom additif).

---

## 3. Peta API yang Sudah Ada

| API | Method | Pakai untuk | Auth |
|-----|--------|-------------|------|
| `/api/kompetensi` | GET/POST | list paket (pagination) / buat paket | pub / GURU |
| `/api/kompetensi/[paketId]` | GET | snapshot sanitasi soal + progress/session | login |
| `/api/kompetensi/[paketId]/hasil` | GET | hasil terakhir per user+paket + sertifikat | login |
| `/api/kompetensi/[paketId]/submit` | POST | skor + AI grading + tulis DB + XP | login, rate-limit |
| `/api/kompetensi/audio/[questionId]` | GET | proxy audio soal (seksi MEMDENGARKAN) | public |
| `/api/guru/tinjau-konstruktif` | GET/PATCH | daftar konstruktif (take 500) + simpan skor | GURU/ADMIN/founder |
| `/api/guru/dokumen-siswa` | GET | dokumen hasil (cert+progres sintetik) | GURU/ADMIN/founder |
| `/api/user/sertifikat` | GET | dokumen hasil milik user (cache Redis `sertifikat:v2:{id}`) | login |
| `/api/guru/dashboard/analytics` | GET | tren literasi mingguan WIB | GURU/ADMIN/founder |
| `/api/guru/game-hub` | GET | aktivitas game (punya filter/pagination template) | GURU/ADMIN/founder |
| `/api/guru/siswa` + `[id]` | GET/PATCH | data murid + noAbsen/NISN | GURU/ADMIN/founder |
| `/api/guru/leaderboard`, `/api/guru/nilai/export` | GET | peringkat Guru, export CSV/DOCX | GURU |

**Gap eksplisit di sisi guru (TIDAK ada endpoint):** filter global Kelas→Tanggal→Jenis→Status→Cari;
agregasi/analitik per kelas (rerata/terendah/tertinggi/distribusi predikat); AI summary per kelas; export
PDF/CSV dari daftar hasil; AI regrade batch `pendingReview`.

---

## 3a. Halaman Sisi Guru (basis audit)

| Halaman | Jenis | Sumber data | Kondisi saat ini |
|---------|-------|-------------|------------------|
| `app/(dashboard)/guru/hasil-simulasi/page.tsx` | Server (RSC, force-dynamic) | `db.progresKompetensi.where({status:COMPLETED, userId∈guruStudents(DB langsung)})`, take 50, order finishedAt desc, include user+paket, certMap | BASIC table. Guard role GURU/ADMIN. |
| `app/(dashboard)/guru/hasil-simulasi/client.tsx` | Client | props `results` | Tabel Murid/Paket/Skor/Predikat/Percobaan/Tgl/Dokumen (link ke `/guru/dokumen-latihan`). Client-only Filter jenis (Semua/UKBI/TKA) + search nama. Tidak ada pagination, analytics, AI. |
| `app/(dashboard)/guru/tinjau-simulasi/page.tsx` | Client | `GET /api/guru/tinjau-konstruktif` → items | List kartu, filter MENULIS/BERBICARA, input score + "Simpan" (PATCH angg). Manual per item. Tidak ada batch, tidak ada status pending, tidak ada summary/AI. |
| `app/(dashboard)/guru/dokumen-latihan/page.tsx` | Client | `GET /api/guru/dokumen-siswa` | Grid card (murid, paket, predikat, skor, %, tipe) + modal `GuruCertificatePreview`. Filter UKBI/TKA. Bukan repository: tidak ada search/cari, filter kelas, statistik per paket, export. |

Halaman lain yang terlibat (sebelah/konstat chain): `/guru/simulasi/{ukbi,tka}` (landing), `/kompetisi/[paketId]`
(test) + `/hasil` (result), `/murid/dokumen-latihan`, `components/kompetensi/{TestShell,TestHeader,
QuestionCard,QuestionNavigator,SectionProgress,SubmitConfirmModal,TestResultPanel,WritingAnswer,SpeakingRecorder,
ListeningAudioPlayer}`. Menu guru diproduksi `components/dashboard/GuruNav.tsx` (generasi fan GIM) dan **GuruSidebar
legacy masih ada (dipakai test lama, jangan sentuh)**. MuridSidebar sekarang inline di `murid/layout.tsx`.

---

## 4. Root Cause — Kenapa "Hasil Simulasi" Masih Basic / Review Manual

1. **AI grading SUDAH berjalan** di `submit` (Menulis/Berbicara via LLM/Whisper) tetapi hanya menghasilkan skor
   + eksclude penilaian pending dari rerata; tidak ada LAPORAN/agregasi/insight per kelas.
2. **hasil-simulasi hanya list `COMPLETED`** — tanpa kelas filter (tanpa SSOT), tanpa analytics, tanpa status
   pipeline (Menunggu Review / Sudah Direview), tanpa export, take 50 saja tanpa pagination.
3. **tinjau-simulasi manual per-item** — tidak memakai flag `pendingReview` (jawaban yang AI belum ternilai tak
   muncul terpisah), tidak ada AI summary di bawah jawaban, tanpa batch.
4. **dokumen-latihan hanya katalog** — tidak ada repository cari, statistik kelas, export.
5. Tidak ada **status pipeline resmi** di sisi guru (Belum Mulai / Sedang Dikerjakan / Selesai / Menunggu Review /
   Sudah Direview AI / Disetujui Guru) — hanya `TestStatus` mentah.
6. **Yang bisa diotomatisasi AI tanpa fitur baru**: ringkasan kelas (agent `grading`/`feedback`/`text-analysis`
   + `gradeConstructed`), regrade jawaban `pendingReview`.

---

## 5. Rekomendasi Otomatisasi (REUSE — jangan bangun baru)

| Aset ada | Lokasi | Pakai untuk |
|----------|--------|-------------|
| `gradeConstructed` + `transcribeSpeaking` | `lib/penilaian/ai-grade.ts` | Regrade batch jawaban `pendingReview` (AI Review Center) |
| Agent `grading` | `src/ai/agents/grading-agent.ts` | Skor + `rubricBreakdown` + feedbackForStudent + teacherNotes |
| Agent `feedback` | `src/ai/agents/feedback-agent.ts` | strengths/areasToImprove/revision tips (ringkasan kelas) |
| Agent `text-analysis` | `src/ai/agents/text-analysis-agent.ts` | analisis esai murid (detail) |
| `callWithFallback` + `acquireAiSlot` | `src/ai/core/provider.ts`, `lib/ai-concurrency.ts` | Pintu LLM ber-backpressure untuk batch AI |
| `usage-logger` + `ai-gateway` quota | `src/ai/core/usage-logger.ts`, `lib/ai-gateway/` | Catat pemakaian AI + kredit guru |
| `lib/teacher/students.ts` | SSOT wajib | Filter Kelas (kelas aktif + dedupe) untuk ketiga halaman |
| `lib/gamification/teacher-xp.ts` | GURU_XP / notify | XP + notif guru saat AI selesai review |
| Handler WIB + analytics | `app/api/guru/dashboard/analytics/route.ts` | `mondayWIB`, `weekLabel` → filter Tanggal (Hari Ini/7/30/custom) |
| Export template CSV/DOCX | `app/api/guru/nilai/export` + `lib/penilaian/upsert-nilai` | Export daftar hasil / dokumen |
| `Notifikasi` model + `NotifikasiBell` | — | Notifikasi AI review selesai |

→ Extra cost hanya 1-2 API aggregasi + 1 helper AI summary + wrapper endpoint; SEMUA engine reuse, tidak LLM baru.

---

## 6. Desain Target (proposal, perlu approve)

### 6.1 Dashboard `/guru/hasil-simulasi`
- Header stat: total attempt, rata-rata score, murid sudah/ belum mengerjakan paket apa (count distinct), predikat terdistribusi (bar).
- **Filter global QA shared** (sama di 3 halaman):
  - **Kelas** — dropdown dari `getTeacherStudents()` (dibalik `lib/teacher/students.ts`). WAJIB SSOT.
  - **Tanggal** — Hari Ini / 7 hari / 30 hari / custom (WIB, reuse pola `mondayWIB`).
  - **Jenis** — Semua / UKBI / TKA.
  - **Status** — Belum Mulai (NOT_STARTED) / Sedang dikerjakan (IN_PROGRESS via TestSession) / Selesai (COMPLETED) /
    Menunggu Review AI (`pendingReview>0`) / Sudah Direview AI / Disetujui Guru (PATCH manual).
  - **Cari murid** — by fullName (server-side, paginate).
- Tabel hasil (paginated page/limit, tak muat semua), kolom: Murid, Kelas, Paket, Skor, %, Predikat, Percobaan,
  Waktu, Tanggal, Status, Dokumen (link). Tombol **Export** (CSV / DOCX), link masuk ke repository dokumen.
- Performa: `ProgresKompetensi @index([userId,status])` plus filter kelas via SSOT IDs; query gabungan dengan `in`+paginate.

### 6.2 AI Review Center `/guru/tinjau-simulasi`
- Stats bar: Total konstruktif, Sudah direview AI (scored), Menunggu penilaian, Disetujui guru.
- Per kartu jawaban: siswa + kelas, seksi, soal, jawaban teks / audio player, **skor AI + feedback AI** (simpan bila ada, baru),
  status (Menunggu / Disetujui AI-setuju / Disetujui guru), kapan dinilai, siapa.
- Tombol **"Nilai AI lagi"** (batch) untuk item `pendingReview` → panggil `gradeConstructed` ulang via slot-concurrent +
  usage-log + simpan.
- Batch approve untuk skor yang sudah AI (mengubah menjadi "Disetujui Guru" + notif & XP guru).
- Export jawaban+skor (CSV/DOC).

### 6.3 Repository `/guru/dokumen-latihan`
- Filter kelas + cari nama/paket + jenis.
- StatisticPerPaket: jumlah dokumen, rerata, min/max skor, persentase lolos.
- Card tiap dokumen → preview (GuruCertificatePreview) → print / unduh PDF/CSV.
- Group view per murid (semua dokumen satu murid) atau per paket.

### 6.4 Status pipeline (tanpa enum baru)
Tentukan di server sebagai computed union, identik di 3 halaman:
`BELUM` (TestSession NOT_STARTED) · `IN_PROGRESS` · `SELESAI` · `MENUNGGU_REVIEW` (COMPLETED & TestAnswer isCorrect=null
atau sectionScores[seksi].pendingReview>0) · `DITINJAU_AI` · `DISETUJUI_GURU` (`TestAnswer.reviewedBy` set).
Terbit column opsional: `TestAnswer.aiFeedback TEXT?`, `TestAnswer.reviewedAt DateTime?`, `TestAnswer.reviewedBy String?`
(dan `ProgresKompetensi.aiReview Json?`) — sepenuhnya additive; jalankan via Supabase SQL Editor.

---

## 7. Mapping Fitur & API (additive, backward-compatible)

| Target | Ekspansi yang diperlukan |
|--------|--------------------------|
| hasil-simulasi | + `GET /api/guru/rekap-simulasi` (aggregator dashboard + full filter SSOT + list paginated + counts). JAGA `page.tsx` ada (test script check). |
| tinjau-simulasi | EXTENDED `/api/guru/tinjau-konstruktif` GET (kelas, tanggal, jenis, status, pagination) + `PATCH` batch + `ai-regrade` + `approve`. Kolom feedback/reviewed. |
| dokumen-latihan | EXTENDED `/api/guru/dokumen-siswa` + `?kelas&search&tipe&stats`, + endpoint export baru. |
| Skema | + `TestAnswer.aiFeedback/reviewedAt/reviewedBy`, opsional `ProgresKompetensi.aiReviewSummary Json` (additive manual SQL). |
| Menu | Pastikan `GuruNav.tsx` grup Simulasi tetap (hasil-simulasi, tinjau-simulasi, dokumen-latihan, bigt). |

---

## 8. Risiko & Mitigasi

| Risiko | Tinggi | Mitigasi |
|--------|--------|----------|
| Feedback AI grade tidak tersimpan (hanya skor) → panel review kosong | Medium | Tambah kolom `aiFeedback` (additif); atau untuk item lama tampilkan tombol "Nilai AI" yang meregenerate. |
| Biaya/latensi AI summary per kelas | Medium | `acquireAiSlot` + Redis cache (`ai-summary:class/paket/period` TTL) + usage-log quota; generate on-demand. |
| Mengubah status enum DB | Low-Med | Status computed dari data eksisting; kolom baru opsional & additif. `TestStatus` TIDAK diubah. |
| `test-*` lama | Med | `test-dokumen-latihan-sanitization` **SAAT INI FAIL** (assert guru page pakai `/api/user/sertifikat` padahal sekarang `/api/guru/dokumen-siswa`). `test-simulation-workflow` & `test-phase-...` **CRASH** membaca `MuridSidebar.tsx` (sudah pindah). Fix baseline script tersebut (assert ke `murid/layout.tsx` + `GuruNav.tsx`). |

---

## 9. Estimasi

| Blok | Unit |
|------|------|
| A. Data layer: extends & aggregator APIs (rekap-simulasi, tinjau filter+batch+regrade, dokumen stats/cari) | 2 |
| B. AI layer: ai-gateway hook + aiSummary (cache) + usage-log + kolom opsional (migrasi SQL) | 1 |
| C. UI: dashboard hasil, AI Review Center, repository dokumen, filter global reuse SSOT, pagination, export | 2.5 |
| D. Tes & QA (fix script stale + baru; `tsc`, lint, `test:guru-phase`, `test:gamification`, build) | 0.5 |
| **Total** | **± 6** |

Gate: `npx tsc --noEmit` 0, ESLint 0, `npm run test:guru-phase`, `npm run test:gamification-engine`, `npm run build` dummy env.

AUDIT SELESAI — menunggu approve untuk lanjut.