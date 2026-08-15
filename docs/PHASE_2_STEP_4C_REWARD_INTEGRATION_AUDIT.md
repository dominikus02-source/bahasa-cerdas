# PHASE 2 — STEP 4C: REWARD INTEGRATION AUDIT

**READ-ONLY AUDIT — 0 kode diubah, 0 produksi DB ditulis, 0 commit/push.**
**Menunggu keputusan founder sebelum implementasi apa pun.**

- Tanggal: 15 Agustus 2026
- Scope: Arsitektur reward (XP/Koin) untuk **Adaptive Practice** (`app/api/player/adaptive-practice`, `App/arena/adaptive-practice/[sessionId]`, `lib/adaptive-practice/*`, `lib/learner-state/*`, `lib/learning-loop/evidence.ts`) terhadap engine reward existing (`lib/award-xp.ts`, `lib/xp-guard.ts`, `lib/gamification/*`, `lib/coins.ts`, `lib/learning-loop/*`).
- Pertanyaan utama: **"Bisakah satu sesi Adaptive Practice yang selesai memberi XP tepat satu kali secara aman (tanpa replay, tanpa manipulasi klien, tanpa duplikat, tanpa inflasi)?"**

---

## A. VERDICT

| Aspek | Status | Catatan |
|-------|--------|---------|
| Satu sesi → XP tepat satu kali | ✅ **YA, layak tanpa migrasi schema** | `XPTransaction.reference` + `@@unique([userId, source, reference])` sudah ada; `session.id` cukup dijadikan `reference`. |
| Aman dari manipulasi klien | ✅ **YA — sudah** | Semua nilai reward (XP/koin/skor/bobot/`correctAnswer`) dihitung & diverifikasi server-side hari ini. Klien tidak pernah mengirim salah satunya. |
| Aman dari replay/double-submit | ✅ **YA (XP)** / ⚠️ **hati-hati (Koin)** | XP di-idempotenkan constraint DB unik. CoinTransaction **tidak punya** constraint unik — idempotensi koin hanya di level kode (`findFirst` dalam transaksi; window race kecil). |
| Aman dari inflasi | ⚠️ **Perlu aturan baru** | Saat ini nil (tanpa reward). Saat reward dipasang, wajib: sekali per sesi (`reference=session.id`), berbatas, tercakup kuota harian, tanpa reward per-soal. |
| Tautan evidence ↔ reward | ⚠️ **Perlu perhatian** | `upsertLearningEvidence` (transaksi sendiri) dan pemberian reward (transaksi sendiri) tidak atomik hari ini. Tidak ada sinkronisasi. |
| Holes yang ditemukan | ⚠️ 3 | (1) `complete` TIDAK memverifikasi semua soal dijawab; (2) `start` tanpa rate limit → spam sesi; (3) reward kosong bila dipasang ke status `COMPLETED` tanpa cek evidence. |
| Kondisi produksi | ⚠️ | `LearningEvidence`/`AdaptivePracticeSession` baru dipakai; data riil hampir nol. Tidak ada risiko terhadap data produksi eksisting. |

**VERDICT UMUM: YELLOW — layak dan aman diimplementasikan dengan desain minimal (§I), dengan catatan wajib (gate evidence, idempotensi coin, entry source baru, rate limit start). Belum ada implementasi.**

---

## B. METODE & SCOPE

1. Inventaris schema: `XPTransaction`, `CoinTransaction`, `XpLedger`, `LearningEvidence`, `AdaptivePracticeSession`, `QuestionMetadata`, `Soal` (termasuk `correctAnswer` + index/constraint unik).
2. Inventaris engine: `lib/award-xp.ts` (satu-satunya pintu XP), `lib/xp-guard.ts`, `lib/gamification/{xp-engine,xp-config,coin-engine,levels,ranks,season,rank-assets,rank-up,teacher-xp}.ts`, `lib/coins.ts`, `lib/xp-boost.ts`, `lib/learning-loop/evidence.ts` (+ `activity.ts`), `lib/adaptive-practice/{config,selector}.ts`, `lib/learner-state/service.ts`.
3. Audit kepatuhan klien: `app/arena/adaptive-practice/[sessionId]/page.tsx`, `components/student-home/ContinueLearningCard.tsx`, `components/student-home/home-data.tsx`.
4. Pemetaan 8 pola reward existing: `app/api/game/xp`, `game/result`, `game/menara`, `katastra/submit`, `jalur-cerdas/[unitId]/progress`, `kompetensi/[paketId]/submit`, `penugasan` (via `lib/penilaian`), `/player/xp` (admin-only).
5. Analisis idempotensi, replay, inflasi, kegagalan/transaksi (seksi E–H).
6. Desain minimal untuk keputusan founder (seksi I) + daftar hal yang WAJIB tidak berubah (seksi L).

**Prinsip audit:** tidak ada file produksi yang diubah; semua kesimpulan berbasis sumber kode; setiap ketidakpastian diberi label **UNVERIFIED**.

---

## C. PETA AKTIVITAS → REWARD (CANONICAL EXISTING)

Semua reward XP saat ini lewat **satu pintu**: `awardXp(userId, source, xpMentah, reference)` (`lib/award-xp.ts`), yang dalam SATU transaksi:

1. Pangkas ke batas per-submit per sumber (`lib/xp-guard.ts` `BATAS_XP_PER_SUBMIT`).
2. Tolak duplikat via `XPTransaction` `@@unique([userId, source, reference])` (findUnique di dalam transaksi).
3. Cek kuota harian 5.000 XP dari `XpLedger` (WIB, `awalHariWIB`), dihitung dalam transaksi.
4. Terapkan XP Boost (×2 jika barang aktif; baca di luar transaksi; error → 1).
5. Update `User.xp` + `PlayerProfile` (totalXP cermin, level/rank dari kurva resmi `levels.ts`/`ranks.ts`), koin level-up (`LEVEL_UP_COIN_REWARD=20`) & milestone (`MILESTONE_COIN_REWARD=50`), tulis `XPTransaction` + `XpLedger` + `CoinTransaction` (reason `LEVEL_UP`).

| Caller (route) | Source | Formula (server-side) | Reference (idempotensi) | Batas per-submit |
|---|---|---|---|---|
| `/api/game/xp` (solo) | `GAME` | `floor(skor/10)`, guru → `GURU_GAME` 10 | `gameType-randomUUID()` | 120 |
| `/api/game/result` (battle) | `GAME` | `baseXp` hasil server | `session.id` | 120 |
| `/api/game/menara` | `MENARA` | skor server | tanpa reference (selalu cair, cap 120) | 120 |
| `/api/katastra/submit` | `KATASTRA` | skor server /10 | `katastra-randomUUID()` | 400 |
| `/api/jalur-cerdas/[unitId]/progress` | `JALUR_CERDAS` | `unit.xpReward ?? 50`, hanya first completion ≥70% | `unitId` | 200 |
| `/api/kompetensi/[paketId]/submit` | `KOMPETENSI` | UKBI `round(rawScore/10)`, TKA `rawScore`; hanya first-complete CUMLATIVE/awal | `paketId` | 1000 |
| Penugasan (score) | `PENUGASAN` | skor server | `penugasan.id` | 500 |
| `/player/xp` | any | `amount` klien hanya usulan, dipangkas | wajib reference | per source |

**Koin** (`lib/coins.ts` `awardCoins` legacy + `lib/gamification/coin-engine.ts` `addCoin` modern): `addCoin` idempoten via `findFirst({ userId, reason: BCA_<reason>, reference })` dalam transaksi, prefiks `BCA_` memisahkan dari koin `User.coins` legacy. `COIN_REWARDS` yang relevan: `MAIN_GAME: 5`, `MENJAWAB_KUIS` (quest), level-up 20, milestone 50.

**Observasi penting untuk adaptive:**
- **Reference pola kuat**: jalur cerdas (unit), kompetensi (paket), battle (session) — semua memakai **identifier domain unik yang ada di server**. Untuk adaptive, `AdaptivePracticeSession.id` adalah padanan langsung → **nol perubahan schema untuk idempotensi XP.**
- **Pola jalur-cerdas = templat terbaik**: reward hanya saat first completion, `reference=unitId`, koin dicairkan server-side, `xpEarned/coinEarned` dikirim balik untuk UI.
- **`XP_SOURCES` (`lib/gamification/xp-engine.ts`) belum memuat `ADAPTIVE_PRACTICE`** — kolom `source` di DB adalah `String` bebas, jadi penambahan **tidak butuh migrasi**; tapi wajib ditambahkan ke daftar agar `/player/xp` dan audit konsisten.

---

## D. MATRIKS KEPERCAYAAN KLIEN (TRUST TABLE)

| Field | Asal | Trust | Bukti (kode) |
|---|---|---|---|
| `userId` | Sesi Supabase | **TRUSTED SERVER** | `getUser()` di POST/GET; klien tidak pernah mengirim `userId` (test #3). |
| `sessionId` | Server (start) | **SERVER-ISSUED**; klien hanya memilih sesi miliknya | `findFirst({ id: sessionId, userId })` → 404 bila bukan miliknya. |
| `questionId` | Server (dari `session.questionIds`) | **SERVER-BOUND** | Dicek `questionIds.includes(questionId)` → 403 bila di luar sesi. |
| `answer` | Klien | **UNTRUSTED, diverifikasi** | `String(answer) === String(question.correctAnswer)` — `correctAnswer` diambil server via `db.soal.findUnique(select: { correctAnswer: true })`, TIDAK pernah dikirim ke klien (test #22). |
| `size` (start) | Klien | **UNTRUSTED, sanitized** | Hanya 5/10/15 `ADAPTIVE_ALLOWED_SIZES` (test #20-21). |
| `action` | Klien | **UNTRUSTED, whitelist** | `start`/`answer`/`complete` saja. |
| `xp` / `xpEarned` | Klien | **SAFE-IGNORED** | Tidak ada field `xp*` yang diterima route; seluruh XP lewat `awardXp`. |
| `coin` / koin | Klien | **SAFE-IGNORED** | Tidak ada field koin di body. |
| `correctAnswer` / kunci jawaban | Klien | **SAFE-IGNORED (tidak pernah dikirim)** | `select` soal mengecualikan `correctAnswer`; test #22 menegaskan. |
| `score` / `rawScore` | Klien | **SAFE-IGNORED** | Adaptive tidak memakai skor klien; `score` evidence = 1/0 dari kebenaran server. |
| `skill`, `difficulty`, `targetSkill`, `questionIds`, reward amounts | Klien | **SAFE-IGNORED** | Test #4-6 menegaskan tidak ada `body.skill`/`body.difficulty`/`body.questionIds`. |
| `metadata` evidence | Server | **SERVER-DERIVED** | `skill` dari QuestionMetadata APPROVED; `difficulty` dari metadata; `score` dari `isCorrect` server. |

**Kesimpulan D:** klien saat ini **tidak bisa** memengaruhi apa pun yang relevan untuk reward — termasuk dengan sesi/jawaban yang di-flood. Satu-satunya hal yang bisa dilakukan klien adalah (a) menjawab benar/salah, (b) menyelesaikan sesi, (c) memulai banyak sesi (lihat E-5, tanpa rate limit).

---

## E. MATRIKS REPLAY (A–J)

| # | Skenario | Perilaku hari ini | Risiko reward kelak | Verdict |
|---|----------|-------------------|---------------------|---------|
| A | **Retry network sama persis** (answer sama, sesi sama) | Evidence: `@@unique([userId, source, activityId, questionId])` → update baris sama, tanpa duplikat. Reward (kelak): `XPTransaction` unik `reference=session.id` → tolak. | Aman | ✅ |
| B | **Complete tanpa menjawab** | `completeSession` `updateMany` → status `COMPLETED` **tanpa cek evidence coverage** | **JIKA reward dipasang pada status COMPLETED tanpa gate evidence → sesi kosong dapat reward.** | ⚠️ WAJIB gate |
| C | **Jawab soal di luar sesi** | 403 `"Soal bukan bagian dari sesi"` | Aman (tidak menghasilkan evidence/reward) | ✅ |
| D | **Jawab/complete sesi yang sudah COMPLETED atau expired** | 409 `"Sesi sudah berakhir"` — `expiresAt` 30 menit + status IN_PROGRESS | Aman; tidak ada reward kedua | ✅ |
| E | **Spam `start` (banyak sesi)** | **Tidak ada rate limit** di route | OpenAI: bisa membuat banyak sesi; reward per-sesi + reference unik → XP tetap dibatasi kuota harian 5.000, tapi **koin tidak punya kuota harian** dan jumlah sesi tak terbatas | ⚠️ rate limit + cap sesi aktif |
| F | **Replay answer lama setelah complete** | 409 | Aman | ✅ |
| G | **Double-submit jawaban berbeda pada soal sama** | Evidence: update baris sama (nilai benar/salah terakhir menang); tidak ada duplikat | Reward per-sesi (bukan per-soal) → netral | ✅ (dengan desain §I) |
| H | **Klien mengirim XP/koin/skor sendiri** | Ditolak diam-diam — tidak ada field yang dipakai | Aman | ✅ |
| I | **Akses sesi user lain** | `findFirst({ id, userId })` → 404 | Aman | ✅ |
| J | **Sesi lama setelah daftar 10 sesi berikutnya** | 409 (expiry); sesi lama tetap di DB | Aman (tidak cair) | ✅ |

**Temuan tambahan (produksi safety):**
- `getSessionPayload` (GET) dan `answerSession` memakai `findFirst({ id, userId })` — ownership diverifikasi. ✅
- `completeSession` `updateMany` idempotent (kedua kalinya `count=0` → 409). ✅
- `startSession` TIDAK membatasi sesi IN_PROGRESS aktif per user. ⚠️ (kapasitas kecil, tapi jadi permukaan spam reward kelak).

---

## F. ANALISIS IDEMPOTENSI

### XP — DIPERPANJANG OLEH CONSTRAINT DB (aman)
- `XPTransaction`: `@@unique([userId, source, reference])` + `awardXp` melakukan `findUnique` dengan kunci itu **di dalam transaksi** sebelum menulis → retry/double-submit/replay basi **tidak pernah** menambah XP dua kali (test: bukti dari jalur cerdas/kompetensi/battle).
- `reference` untuk adaptive: **`session.id` langsung** — String nullable sudah ada, tanpa migrasi.
- Konsekuensi: jawaban berganda dalam sesi yang sama → reference sama → **XP dicairkan sekali per sesi**, tidak peduli berapa kali `complete` dipanggil. Ini persis perilaku yang diinginkan.

### Koin — IDEMPOTENSI LEVEL KODE, TANPA CONSTRAINT DB (hati-hati)
- `CoinTransaction`: **tidak ada** `@@unique`; `addCoin` memakai `findFirst({ userId, reason: BCA_<reason>, reference })` **di dalam transaksi** sebelum insert.
- **Window race**: dua panggilan nyaris simultan dengan `(reason, reference)` sama bisa sama-sama lolos `findFirst` lalu **mencair dua kali** (mutasi `PlayerProfile.coin` increment bukan conditional-on-check).
- Risiko praktis untuk adaptive: rendah (satu `complete` per sesi, klien tidak bisa memicu ganda karena 409 setelah COMPLETED), tapi tetap **dicatat sebagai gap**; opsi fix (butuh keputusan founder): tambah index unik `@@unique([userId, reason, reference])` pada `CoinTransaction` — **ini satu-satunya perubahan schema yang mungkin diperlukan** dan TIDAK dieksekusi dalam audit ini.
- Catatan: `awardXp` menulis koin level-up lewat `coinTransaction.create` langsung dengan reference `level-<lv>-<weekKey>` — unique secara semantik karena level tidak bisa turun.

### Evidence — IDEMPOTEN (aman)
- `LearningEvidence`: `@@unique([userId, source, activityId, questionId])` + `upsertLearningEvidence` → retry menulis ulang baris sama, tidak pernah duplikat. `activityId = session.id` sudah terisi dengan benar di `answerSession`.

---

## G. ANALISIS FORMULA & INFLASI

### Formula reward existing (rujukan batas wajar)
| Fitur | XP per penyelesaian | Per-submit cap | Kuota harian |
|---|---|---|---|
| Jalur Cerdas unit | 50 (xpReward unit, once) | 200 | 5.000 |
| Game solo | skor/10 (max ~120) | 120 | 5.000 |
| Battle | baseXp server | 120 | 5.000 |
| UKBI/TKA | round(rawScore/10) / rawScore | 1000 | 5.000 |

### Risiko inflasi untuk adaptive
1. **Reward per-soal vs per-sesi**: 5–15 soal/sesi. Reward per-soal (mis. 10 XP × 15 soal = 150/sesi, tanpa henti) = mesin cetak XP. **Harus per-sesi.** 
2. **XP tanpa kualitas**: jika reward hanya berbasis jumlah soal dijawab (bukan benar/total), sesi asal-klik = reward penuh. **Gunakan `correctCount/size`** (evidence `isCorrect` server-side).
3. **Reward berdasarkan status COMPLETED tanpa gate evidence** → sesi kosong lolos (lihat E-B).
4. **Memo tempat sesi tanpa batas** (E-E) → rate limit `start` + cap sesi IN_PROGRESS aktif (mis. 3) disarankan.
5. **Kuota harian 5.000 XP** tetap berlaku sebagai jaring terakhir (XpLedger, WIB) — **tidak ada alasan mengecualikan adaptive** dari kuota ini.
6. **Koin tidak punya kuota harian** — jumlah koin per sesi kecil (mis. ≤5) agar tidak jadi jalur farming koin; idempotensi `reference=session.id` menutup replay.
7. **Difficulty/score tidak mempengaruhi reward di fitur lain** (jalur cerdas flat 50) — konsisten: adaptive flat per-sesi boleh, atau bonus kecil untuk HARD/VERY_HARD (diputuskan founder; tidak diimplementasikan).
8. `XP_SOURCES`/`BATAS_XP_PER_SUBMIT`/`XP_CONFIG` harus mendapat entry `ADAPTIVE_PRACTICE` — kolom `String` bebas, **tanpa migrasi**; ini mencegah nilai sumber tak dikenal di audit/UI.

---

## H. ANALISIS KEGAGALAN & TRANSAKSI

| Skenario kegagalan | Perilaku hari ini | Risiko reward kelak | Mitigasi desain (diputuskan founder) |
|---|---|---|---|
| `upsertLearningEvidence` sukses, panggilan reward gagal (network/DB timeout) | Evidence tersimpan; tidak ada reward | Sesi dikerjakan tapi XP tidak cair (loss, bukan duplikat) | `awardXp` idempoten `reference=session.id` → **retry aman dan tidak menggandakan**; client `complete` dapat di-retry (409 sudah dihindari false karena gate status) |
| Reward sukses dicairkan, evidence gagal (urutan terbalik) | Tidak mungkin hari ini (belum ada reward); kelak urutan & transaksi harus evidence dulu | XP tanpa evidence (orphan) | Dalam desain §I: reward **hanya setelah evidence**, dan jika reward gagal → evidence tetap ada, `complete` retry aman |
| `complete` gagal setelah sudah COMPLETED | `updateMany` count=0 → 409 | Aman | Client menampilkan 409 sebagai "sudah selesai" |
| Transaksi `awardXp` gagal di tengah | Rollback penuh (User/PlayerProfile/XpLedger/XPTransaction) | Aman — tidak ada partial write | — |
| Evidence & reward **tidak atomik** (transaksi terpisah) | fakta desain; dipakai di semua fitur (jalur cerdas juga menulis progress lalu awardXp terpisah) | Konsisten dengan codebase; risiko hanya loss/tidak ada duplikat karena idempotensi | Terima sebagaimana pola existing; JANGAN memperkenalkan transaksi cross-table yang lebih besar (risiko lock) |

**Kesimpulan H:** kegagalan semua bersifat **loss-safe** (reward hilang bisa di-retry; reward ganda diblokir), **tidak ada skenario duplikat dengan desain §I**. Ini sama dengan pola jalur cerdas/kompetensi yang sudah produksi selama berbulan-bulan.

---

## I. DESAIN MINIMAL (PROPOSAL UNTUK KEPUTUSAN FOUNDER — BELUM DIIMPLEMENTASIKAN)

Tujuan: satu sesi adaptive selesai → XP **tepat satu kali** (+ opsional koin kecil), aman dari replay/inflasi/manipulasi, dengan perubahan minimal.

1. **Waktu reward: di `complete`, bukan per-answer.** `completeSession` setelah `updateMany` sukses:
   - Hitung evidence coverage: `db.learningEvidence.count({ where: { userId, activityId: session.id } })` — **WAJIB ≥ jumlah soal sesi** (atau ≥ ambang founder, mis. 100%) sebelum memberi reward; bila kurang → `409` "Sesi belum dikerjakan sepenuhnya" dan `complete` ditolak (menutup E-B).
   - Hitung `correctCount` dari evidence `isCorrect=true`.
   - XP = fungsi server: mis. `round(30 × (correctCount / size))` (flat, tanpa per-soal; angka final keputusan founder) → `awardXp(user.id, "ADAPTIVE_PRACTICE", xp, session.id)` — **reference = `session.id`**.
   - Koin opsional: `addCoin(user.id, 4, "ADAPTIVE_PRACTICE", session.id)` (idempoten kode-level).
2. **Register sumber**: tambah `ADAPTIVE_PRACTICE` ke `XP_SOURCES` (`xp-engine.ts`), `BATAS_XP_PER_SUBMIT` (mis. 200, `xp-guard.ts`), dan `XP_CONFIG` (`xp-config.ts`) — semua **tanpa migrasi** (kolom String).
3. **Gate anti-kosong**: gate evidence pada `complete` (butir 1) + tetap pertahankan 409 untuk sesi non-IN_PROGRESS/expired.
4. **Rate limit `start`** (opsional tapi disarankan): limit 5 sesi baru / 5 menit + cap maks 3 sesi IN_PROGRESS aktif per user; mencegah spam sesi (E-E) dan membatasi permukaan reward.
5. **Koin**: gunakan `addCoin` (engine modern, prefiks `BCA_`), reference `session.id`; jumlah kecil (≤5) karena tidak ada kuota koin harian.
6. **UI**: halaman adaptive lama menampilkan hasil server (`xpEarned` dari response `complete`) — pola `progress/route.ts` jalur cerdas; tanpa angka dari klien.
7. **(Opsional, butuh migrasi)** `@@unique([userId, reason, reference])` pada `CoinTransaction` — menutup window race coin; SATU-SATUNYA perubahan schema yang mungkin; TIDAK dieksekusi dalam audit.

**Batasan desain**: tidak menambah tabel; tidak mengubah `LearningEvidence`/`AdaptivePracticeSession`/`QuestionMetadata`; tidak menyentuh engine gamifikasi; reward tetap lewat `awardXp`/`addCoin`.

---

## J. FILE YANG AKAN BERUBAH (HANYA JIKA FOUNDER MENYETUJUI §I)

| File | Perubahan proposional |
|---|---|
| `app/api/player/adaptive-practice/route.ts` | `completeSession`: gate evidence → hitung XP → `awardXp` + `addCoin`; response sertakan `xpEarned/coinEarned` |
| `lib/gamification/xp-engine.ts` | + `ADAPTIVE_PRACTICE` di `XP_SOURCES` |
| `lib/xp-guard.ts` | + `ADAPTIVE_PRACTICE: 200` di `BATAS_XP_PER_SUBMIT` |
| `lib/gamification/xp-config.ts` | + entry `ADAPTIVE_PRACTICE` (baseXp dsb.) |
| `app/arena/adaptive-practice/[sessionId]/page.tsx` | Tampilkan reward dari response `complete` (server-derived) |
| `scripts/test-adaptive-practice.ts` | + asersi: gate evidence, reference = session.id, tidak ada klien field reward, coverage ≥ ambang, rate limit start (jika diadopsi) |
| (opsional) `prisma/schema.prisma` + migrasi | `@@unique([userId, reason, reference])` CoinTransaction — HANYA dengan persetujuan founder |
| docs | `docs/PHASE_2_STEP_4C_REWARD_INTEGRATION_AUDIT.md` (ini) |

---

## K. TES YANG DIPERLUKAN (SETELAH IMPLEMENTASI, BUKAN SEKARANG)

1. Sesi kosong `complete` → 409 (gate evidence) — B tertutup.
2. `complete` dua kali → 409 kedua; total XP tetap 1× (idempotensi reference).
3. Replay `answer` setelah complete → 409; tidak ada XP tambahan.
4. Sesi user lain → 404 (ownership) — I.
5. Soal di luar sesi → 403 — C.
6. `size` invalid → 400 (sudah ada, test #21).
7. XP ≤ cap per submit & ≤ kuota harian (XpLedger) — bootstrap dengan `awardXp` unittest-style.
8. `reference` pada XPTransaction = `session.id` (string, bukan uuid acak) — konsistensi pattern jalur cerdas.
9. Tidak ada field `xp`/`coin`/`score`/`correctAnswer` di body yang diterima route (static scan, pola test #3-6, #22).
10. (Jika diadopsi) rate limit `start`: >N sesi/menit → 429; cap sesi aktif → 409.
11. Koin: `addCoin` duplikat reference → `duplicate: true`, saldo 1×.
12. Regresi penuh: `test:gamification-engine`, `test:adaptive-practice`, `test:guru-phase`, leakage suites — semua harus tetap hijau.

---

## L. ZONA TERLINDUNG (TIDAK BOLEH DIUBAH DALAM FASE INI)

- `prisma/schema.prisma` + semua migrasi (kecuali keputusan founder opsional §I-7)
- `lib/award-xp.ts`, `lib/xp-guard.ts`, `lib/xp-boost.ts`, `lib/coins.ts`
- `lib/gamification/*` (engine BC Arena; konsumsi saja)
- `lib/learning-loop/*` (evidence, activity, journey, next-action, recommend, session, skills)
- `lib/adaptive-practice/*`, `lib/learner-state/*`, `lib/question-metadata/*`
- Semua rute reward existing (`/api/game/*`, `/api/katastra/*`, `/api/jalur-cerdas/*`, `/api/kompetensi/*`, `/api/penugasan/*`)
- Semua test suite existing (tidak dilemahkan)

---

## M. DEKLARASI KONDISI

- **Kode diubah pada audit ini: 0 file produksi.** (Satu dokumen dibuat: file ini.)
- **Produksi DB: 0 tulis.**
- **Commit/push: NONE** (menunggu keputusan founder).
- **Verifikasi dijalankan**: `npx tsc --noEmit` — hasil di bawah; `npm run lint` — hasil di bawah; `git diff --check` — hasil di bawah.

## LAMPIRAN — HASIL VERIFIKASI

| Check | Hasil |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors (exit 0) |
| `npm run lint` | ✅ 0 violations (exit 0) |
| `git diff --check` | ✅ bersih (exit 0) |
| Git status | M: `AGENTS.md`, `package.json`; untracked: 4A/4B/4B.5/4B.6/4C artifacts (dokumen + script QA), `reviews.json`, manifest + audit JSONL — **semua TIDAK di-commit** |
| Kode produksi diubah | ✅ **0 file** (audit ini hanya menambah 1 dokumen: file ini) |
| Produksi DB | ✅ 0 tulis |

### Files inspected (read-only)
| File | Peran |
|---|---|
| `app/api/player/adaptive-practice/route.ts` | start/preview/answer/complete; server-side correctAnswer; evidence; ownership |
| `app/arena/adaptive-practice/[sessionId]/page.tsx` | klien: hanya `{action, sessionId, questionId, answer}` |
| `components/student-home/ContinueLearningCard.tsx`, `home-data.tsx` | entry My Day → `start`/`preview` |
| `lib/award-xp.ts`, `lib/xp-guard.ts`, `lib/xp-boost.ts` | pintu XP tunggal, cap/kuota/boost |
| `lib/gamification/{xp-engine,xp-config,coin-engine,levels,ranks,season,teacher-xp}.ts` | engine reward |
| `lib/coins.ts`, `lib/learning-loop/evidence.ts` | koin legacy + evidence idempoten |
| `lib/adaptive-practice/{config,selector}.ts`, `lib/learner-state/service.ts` | seleksi deterministik, learner state via SQL |
| `prisma/schema.prisma` | XPTransaction/CoinTransaction/XpLedger/LearningEvidence/AdaptivePracticeSession/Soal |
| `scripts/test-adaptive-practice.ts` | 25 asersi existing (baseline untuk §K) |
| Reward callers: `game/xp`, `game/result`, `katastra/submit`, `jalur-cerdas/progress`, `kompetensi/submit`, `player/xp` | pola reference & formula |