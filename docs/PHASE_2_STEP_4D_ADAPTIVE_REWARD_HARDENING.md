# PHASE 2 — STEP 4D — Adaptive Practice Reward Hardening & XP Integration

**Status:** VERIFIED (menunggu Founder Review — NO COMMIT otomatis, NO PUSH)
**Tanggal:** Aug 15, 2026

---

## A. Objective

Lengkapi Adaptive Practice dengan reward XP yang aman:

1. **P0 — Completion gate**: sesi hanya bisa diselesaikan (`COMPLETED`) jika SEMUA soal
   sesi punya LearningEvidence milik user yang sama untuk sesi yang sama.
2. **P0 — Start rate limit**: pembatasan pembuatan sesi (action=start) memakai
   infrastruktur rate-limit existing.
3. **P0 — XP exactly-once**: 1 sesi terselesaikan → 1 XP (reference = session.id),
   idempoten via `@@unique([userId, source, reference])` di XPTransaction.

**DEFERRED (keputusan founder):**
4. Coin reward.
5. Migrasi/constraint unik CoinTransaction.

## B. Founder Decision

| Item | Keputusan |
|------|-----------|
| Completion gate | ✅ Implement |
| Start rate limit | ✅ Implement |
| XP exactly-once per sesi | ✅ Implement |
| Coin reward | ⏸ DEFERRED |
| CoinTransaction unique migration | ⏸ DEFERRED |
| Migration/schema Prisma | ❌ DILARANG |
| Production DB write | ❌ DILARANG |
| Commit/push otomatis | ❌ DILARANG (menunggu review) |

## C. Completion Gate

`completeSession()` di `app/api/player/adaptive-practice/route.ts`:

1. Validate `sessionId` (string, wajib).
2. **Atomic claim**: `updateMany({ where: { id, userId, status: "IN_PROGRESS", expiresAt: { gt: now } }, data: { status: "COMPLETED", completedAt } })`.
3. **Gate evidence** (hanya untuk pemenang claim): daftar soal = `session.questionIds`
   (dari SERVER, bukan klien); evidence diambil `where: { userId, activityId: sessionId, questionId: { in: assigned } }`.
   - `answeredCount < assigned.length` → revert ke `IN_PROGRESS` + `completedAt: null` + **409** `"Sesi belum dikerjakan sepenuhnya (N dari M soal dijawab)"` + **0 XP**.
   - `assigned.length === 0` → revert + **409** `"Sesi tidak memiliki soal"` + **0 XP**.
4. Sesi yang sudah bukan milik user / bukan IN_PROGRESS / expired → **409** `"Sesi tidak ditemukan atau sudah berakhir"`.

Sesi TIDAK pernah dibiarkan `COMPLETED` saat coverage tidak lengkap (revert eksplisit).

## D. Server-Authoritative Scoring

Klien HANYA boleh mengirim `{ action: "complete", sessionId }`. Server menentukan:

- assigned question IDs → `session.questionIds` (DB)
- evidence → `learningEvidence` (DB)
- answered count → distinct `questionId` pada evidence sesi
- correct count → `evidenceRows.filter((row) => row.isCorrect).length`
- score/XP → `Math.round(ADAPTIVE_SESSION_BASE_XP * correctCount / assigned.length)`
- completion state → claim atomik
- reward state → query `XPTransaction`

Klien TIDAK dipercaya untuk: `score`, `status`, `evidenceCount`, `correctAnswer`,
`correctCount`, `xp`, `coin`, `reward amount`. (Test 8–10, 18–22.)

## E. Evidence Coverage

- `LearningEvidence` (contract Step 3C, TIDAK diubah): `@@unique([userId, source, activityId, questionId])`, `activityId = session.id`.
- Coverage = jumlah distinct `questionId` pada evidence `(userId, activityId)`.
- Setiap `answer` memakai `upsertLearningEvidence` (idempoten).
- Tidak ada sistem evidence kedua.

## F. Atomic Completion Claim

`updateMany` dengan predicate sempit (`id + userId + IN_PROGRESS + expiresAt > now`)
menjamin di antara N permintaan compete yang bersamaan, **tepat satu pemenang**
(`count === 1`). Yang kalah masuk jalur recovery (G) — tidak pernah 2× XP.

## G. XP Exactly-Once Mechanism

- Pemenang claim → `awardXp(userId, ADAPTIVE_XP_SOURCE, xpAmount, sessionId)`.
- `awardXp` (lib/award-xp.ts — pintu XP TUNGGAL) memeriksa `XPTransaction @@unique([userId, source, reference])` dulu; reference NULL → selalu cair (tapi di sini reference SELALU = session.id).
- Compound key Prisma: `userId_source_reference` (pattern fieldame bawaan Prisma untuk `@@unique([userId, source, reference])`).
- Retry/replay/double-submit → `xpDiberikan: 0` dari awardXp sendiri; plus gate client-side di route.

## H. XP Source Registration

Daftar sumber XP yang TIDAK memerlukan migrasi (source = String):

| File | Perubahan |
|------|-----------|
| `lib/gamification/xp-engine.ts` | + `"ADAPTIVE_PRACTICE"` ke `XP_SOURCES` |
| `lib/xp-guard.ts` | + `ADAPTIVE_PRACTICE: 200` ke `BATAS_XP_PER_SUBMIT` (safety ceiling — BUKAN reward) |
| `lib/gamification/xp-config.ts` | + `ADAPTIVE_PRACTICE` ke `XpSourceName` + `XP_CONFIG` (`baseXp: 50`, label `"Latihan Adaptif"`) |
| `lib/gamification/source-labels.ts` | + label `"Latihan Adaptif"` + ikon `"🎯"` |

**Formula XP aktual:** `round(50 * correctCount / assigned.length)`
(100% → 50 XP, 60% → 30 XP, 0% → 0 XP). Tidak ada XP per-soal.

## I. Rate Limit (Start Only)

- Infra: `rateLimitRoute(req, { maxRequests, windowSeconds, identifier })`
  (`lib/rate-limit.ts`) → `NextResponse | null`; key via `getClientKey(req)`
  (`lib/security.ts`) — **session-scoped, bukan IP** (cocok NAT sekolah).
- Threshold: `ADAPTIVE_START_RATE_LIMIT = { maxRequests: 10, windowSeconds: 1800, identifier: "bca-adaptive-start" }` (10 sesi/30 menit/user).
- Hanya `action === "start"` — `answer`/`complete` TIDAK di-rate-limit (keduanya
  idempoten; rate limit tidak diperlukan dan akan mengganggu penyelesaian sah).
- Urutan: **AUTH → ACTION VALIDATION → START RATE LIMIT → START LOGIC**.
- Rate limit gagal → kembalikan langsung `NextResponse` (429) dari `rateLimitRoute` — tanpa logika start jalan.
- Redis down → rateLimit fallback `success: true` (fail-open); jaring pengaman
  terakhir tetap **kuota harian 5.000 XP** (`lib/xp-guard.ts` via XpLedger).

## J. Retry/Replay Behavior

| Skenario | Hasil |
|----------|-------|
| Normal complete (sesi lengkap) | XP sekali (200 OK) |
| Refresh/retry setelah COMPLETED | `{ ok, status: "COMPLETED", xpEarned: 0, replay: true, alreadyRewarded: true }` — 0 XP tambahan |
| Duplicate complete (klik ganda) | Sama seperti retry — 0 XP tambahan (claim kedua count=0, reward sudah ada) |
| Recovery (COMPLETED tanpa XP transaction — crash window) | Gate ulang evidence → XP sekali lewat awardXp (reference tetap unique) — TIDAK bisa double reward |
| Sesi langsung COMPLETED tapi coverage kurang | 409 + revert IN_PROGRESS + 0 XP |

## K. Concurrency Behavior

- Dua `complete` bersamaan: updateMany claim → satu `count === 1`; yang kalah
  findFirst → status sudah COMPLETED → cek XPTransaction:
  - sudah ada → replay response (0 XP)
  - belum ada (kalah balapan sebelum award) → recovery path → awardXp idempoten (0 atau 1×)
- Tidak ada jalur menuju 2× XP dalam bentuk apa pun.

## L. Failure Recovery

- Crash antara `updateMany(COMPLETED)` dan `awardXp` → sesi tetap COMPLETED,
  XP belum tercatat. Complete berikutnya: claim kalah → recovery path → gate
  coverage → awardXp (sekali). Aman.
- Crash antara `awardXp` parsl (User.xp updated tapi XPTransaction gagal) →
  transaksi DB awardXp rollback total (single `$transaction`) → tidak ada parsl state.
- Infra learner-state/metadata unavailable → 503 `ADAPTIVE_PRACTICE_UNAVAILABLE` (existing).

## M. Security Model

- Auth wajib (`getUser()` → 401).
- Sesuatu milik user lain / expired / sudah selesai → 409, 0 XP.
- Semua nilai reward diturunkan dari DB (session + evidence), bukan body.
- Per-submit cap 200 (xp-guard) + kuota harian 5.000 (XpLedger) + rate limit start (10/30m).
- Tidak ada `correctAnswer` yang dikirim ke klien (test adaptif existing tetap hijau).

## N. Coin Reward — DEFERRED

**TIDAK ada coin reward di Step 4D.** Alasan dictatat: `CoinTransaction` belum punya
jaminan unik (userId, source, reference) setingkat `XPTransaction` — menambah reward
koin sekarang berisiko double-award tanpa perlindungan DB yang sama. Deferred sampai
migrasi unik CoinTransaction disetujui founder.

## O. Schema/Migration Status

- **NO MIGRATION — NO prisma schema change — NO production DB write.**
- `XPTransaction @@unique([userId, source, reference])` — sudah ada (tidak diubah).
- `LearningEvidence` — sudah ada (tidak diubah).
- `AdaptivePracticeSession`, `AdaptivePracticeAnswer` — tidak diubah.
- `CoinTransaction` — TIDAK disentuh.

## P. Protected Zones

TIDAK diubah: UKBI/TKA, Jalur Cerdas, LearningEvidence contract (lib/learning-loop/
evidence.ts), QuestionMetadata, LearnerState, adaptive selector, leaderboard,
CoinTransaction, Student Home, Premium, Arena core (engine, xp-boost, levels, ranks,
season, badges, achievements, quests, player APIs).

## Q. Tests

| Script | Cakupan |
|--------|---------|
| `scripts/test-adaptive-practice.ts` | 25 checks adaptif select (existing, masih hijau) |
| `scripts/test-adaptive-reward-hardening.ts` | **BARU — 41 checks**: completion gate, ownership/IN_PROGRESS/expired, server-authoritative scoring, evidence coverage, atomic claim, XP exactly-once (reference=session.id, source=ADAPTIVE_PRACTICE, awardXp pintu tunggal), replay/retry 0 XP, concurrency satu pemenang, recovery path, rate limit start (threshold + scoping + urutan), tidak ada per-answer XP, tidak ada coin, klien tidak bisa kirim score/XP/coin/correctAnswer/evidenceCount, tidak ada migrasi/schema touching |

Run: `npm run test:adaptive-reward-hardening` → **41/41 PASS**

## R. Final Gate Status

| Gate | Status |
|------|--------|
| Full verification (tsc, lint, build, regressions) | ✅ Lihat hasil di bawah |
| Production DB | 0 write |
| Migration | 0 |
| Coin reward | 0 (deferred) |
| Git | uncommitted — menunggu Founder Review |

---

## Verification (dijalankan di repo lokal, dummy env)

| Check | Hasil |
|-------|-------|
| `npm run test:adaptive-reward-hardening` | ✅ 41/41 |
| `npm run test:adaptive-practice` | ✅ (lihat output) |
| `npm run test:adaptive-simulation` | ✅ (lihat output) |
| `npm run test:step3c-evidence` | ✅ (lihat output) |
| `npm run test:question-metadata` | ✅ (lihat output) |
| `npm run test:learner-state` | ✅ (lihat output) |
| `npm run test:my-day-home` | ✅ (lihat output) |
| `npm run test:student-home` | ✅ (lihat output) |
| `npm run test:arena-web` | ✅ (lihat output) |
| `npm run test:gamification-engine` | ✅ (lihat output) |
| `npm run test:premium-economy` | ✅ (lihat output) |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ (dummy env) |
| `git diff --check` | ✅ bersih |
| `git status --short` | lihat report |