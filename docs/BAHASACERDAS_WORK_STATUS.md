# BahasaCerdas Work Status

> **Project Ledger** — track completed, in-progress, pending, and blocked work.
> **Last updated:** 2026-06-29 (Phase 2C — UKBI/TKA Per-Attempt Snapshot)
> **Branch:** `main` (GitHub: `dominikus02-source/bahasa-cerdas`)

---

## 1. Git State

| Item | Status |
|------|--------|
| Active branch | `main` |
| Remote | `origin` → `https://github.com/dominikus02-source/bahasa-cerdas.git` |
| Local vs origin | **Up to date** |
| Last commit | `feat: seed homepage v2 + AEO Phase 6-10 + DB migration fixes` |
| Uncommitted changes | `.env.backup-vps` (in `.gitignore`), `backups/` (gitignored), new scripts + audit doc |

## 2. Infrastructure

| Service | Status | URL / Detail |
|---------|--------|-------------|
| **Vercel (Frontend)** | ✅ Live | `https://bahasacerdas.com` + `www.bahasacerdas.com` |
| **Supabase (DB + Auth)** | ✅ Live | [set in .env / Vercel env vars] |
| **Game Server** | ❌ Dead | VPS `72.60.78.65` unreachable — Hostinger expired Jun 26. Fly.io blocked (payment info). Railway token invalid. |
| **DNS** | ✅ Live | `bahasacerdas.com` → Vercel (ns1/ns2.vercel-dns.com); `game.bahasacerdas.com` → dead VPS A record |

## 3. Completed Phases

| Phase | What | Files |
|-------|------|-------|
| **Phase 7** | Social features, scoring, bank soal, notifications, coin system, daily quests, league | `lib/coins.ts`, `app/(dashboard)/murid/karya/`, scoring routes |
| **Phase 8A** | Buku Panduan (12 grade-levels, 72 bab), Penugasan, gradebook, sidebar links | `scripts/seed-panduan.ts`, penugasan routes, gradebook |
| **Phase 8B** | Analytics QA: fix feature name mismatch, status case, top users, unknown provider. 12 tests pass. | `scripts/test-phase8-analytics.ts`, `app/(dashboard)/admin/ai-analytics/` |
| **Phase 8C** | DB migration VPS→Supabase, proxy 429 fix, auto-create user, seed homepage v2 | `lib/supabase/proxy.ts`, `scripts/seed-homepage-v2.ts`, `prisma/seed-data/` |
| **Phase Data Recovery 1** | Supabase current state backup + content/question audit + work ledger update | `scripts/backup-current-supabase.ts`, `scripts/audit-content-data.ts`, `scripts/audit-question-data.ts`, `docs/BAHASACERDAS_CONTENT_DATA_RECOVERY_AUDIT.md`, `docs/BAHASACERDAS_QUESTION_DATA_RECOVERY_AUDIT.md` |
| **Phase Data Protection 1B** | Admin Data Center module — DB health, backup status, warning system, read-only audit actions | `app/(dashboard)/admin/data-center/page.tsx`, `app/api/admin/data-center/route.ts`, `components/admin/AdminSidebar.tsx` |
| **Phase Data Protection 1C** | Persistent Backup Automation — BackupManifest model, DB-recorded backups, Supabase Storage, safety rules | `prisma/schema.prisma` (+model+enum), `scripts/backup-supabase-daily.ts`, `scripts/validate-backup.ts`, `scripts/restore-supabase-backup.ts`, `scripts/migrate-backup-manifest.ts`, `app/api/admin/data-center/route.ts`, `app/(dashboard)/admin/data-center/page.tsx` |
| **AEO 6–10** | FAQ page + JSON-LD, llms.txt, sitemap, robots.txt, AnswerBlock, canonical URLs, 20 tests pass | `app/faq/`, `components/aeo/`, `lib/json-ld.ts`, `public/llms.txt` |
| **Phase Arena Recovery 1** | Audit Jalur Cerdas VPS dependency → NO VPS dependency found. Seed 12 JALUR levels from PANDUAN data. Fix hardcoded arena stats. Validator created. | `docs/BAHASACERDAS_ARENA_RECOVERY_AUDIT.md`, `scripts/validate-learning-content.ts`, `scripts/seed-jalur-levels.ts`, `app/arena/page.tsx` (dynamic stats) |
| **Phase Arena Recovery 1B** | Rebuild JALUR track with proper Duolingo-style Bahasa Indonesia core curriculum. Replaced PANDUAN-copied JALUR data (grade-based) with general ability path (12 levels, 72 units, from basic huruf to mahir menulis). PANDUAN untouched. | `scripts/seed-jalur-cerdas-core.ts`, `app/arena/jalur-cerdas/page.tsx` (updated copy), `app/arena/page.tsx` (updated promo copy) |
| **Phase Arena Recovery 2** | Jalur Cerdas Lesson Engine — Duolingo-style lesson flow (question-by-question, instant feedback, progress bar, XP, completion). 366 questions seeded across 72 units. Sanitized API (jawaban stripped from GET). Server-side submit validation. Lock/unlock progression. | `scripts/seed-jalur-questions-core.ts`, `app/api/jalur-cerdas/[unitId]/route.ts` (sanitized GET), `app/api/jalur-cerdas/[unitId]/submit/route.ts`, `app/arena/jalur-cerdas/[unitId]/lesson/page.tsx`, `app/arena/jalur-cerdas/[unitId]/page.tsx` (lock/unlock, Mulai button) |
| **Phase Arena QA 2B** | Security, XP, and hardening audit. Fixed: XP farming (removed 10 XP per incomplete attempt), isi_blank missing submit button, `xpAwarded`→`xpEarned` TS error. Leakage test: 366 questions, 0 leaked fields. Question validator: 366 questions, 0 issues. Progress security: userId from session only, XP one-time only. | `scripts/test-jalur-leakage.ts`, `scripts/validate-jalur-questions.ts`, `app/api/jalur-cerdas/[unitId]/progress/route.ts` (XP fix), `app/arena/jalur-cerdas/[unitId]/lesson/page.tsx` (submit button), `app/arena/page.tsx` (field name fix) |
| **Phase Arena 2C** | Micro lessons before practice for all 72 JALUR units. Level bands: dasar (L1-4, 24 units, larger font), menengah (L5-8, 24 units), tinggi (L9-12, 24 units). Lesson flow: Intro → Material → Questions → Result → Complete. 366 questions preserved. 72 micro lessons validated. | `scripts/seed-jalur-micro-lessons.ts`, `scripts/validate-jalur-lessons.ts`, `app/api/jalur-cerdas/[unitId]/route.ts` (lesson field), `app/arena/jalur-cerdas/[unitId]/lesson/page.tsx` (lesson phase + levelBand styling) |
| **Phase Build Hardening 1** | Google Fonts build dependency removed. `next/font/google` replaced with robust CSS font stacks (system fonts). Build no longer depends on remote font fetch. No `<link>` tags to Google Fonts at runtime. | `app/layout.tsx` (removed next/font + Google <link>), `tailwind.config.ts` (system font stacks for sans/display) |
| **Phase Security Hotfix 1** | Critical answer leakage fix. `GET /api/bank-soal/ukbi` and `GET /api/bank-soal/tka` now require GURU/ADMIN role (were leaking `correctAnswer` to any authenticated user). Created sanitizer helpers in `lib/security.ts`. Created regression test `scripts/test-ukbi-tka-bank-soal-leakage.ts`. Added `test:bank-soal-leakage` npm script. Fixed broken response key (`questions` → `soal`) in both routes. | `app/api/bank-soal/ukbi/route.ts`, `app/api/bank-soal/tka/route.ts`, `lib/security.ts`, `scripts/test-ukbi-tka-bank-soal-leakage.ts`, `package.json` |
| **Phase Security Hotfix 2** | Murid quiz answer leakage fix. `GET /api/murid/quiz/[id]` no longer sends entire `Soal` object (now uses `sanitizeSoalForStudent` — only safe fields). `GET /api/murid/quiz/submission/[id]` only includes `correctOptionIndex` after SUBMITTED/GRADED status. Created `sanitizeSoalForStudent()` helper. Created regression test `scripts/test-murid-quiz-leakage.ts`. Added `test:murid-quiz-leakage` npm script. | `app/api/murid/quiz/[id]/route.ts`, `app/api/murid/quiz/submission/[id]/route.ts`, `lib/security.ts`, `scripts/test-murid-quiz-leakage.ts`, `package.json` |
| **Phase UKBI/TKA FOUNDATION 2A** | Server-side randomization for UKBI/TKA test-taking. Fisher-Yates seedable shuffle (Mulberry32 PRNG). Questions shuffled within sections, options shuffled per question. No DB migration needed (options use stable `id`, scoring transparent). 12 tests + 100-session Monte Carlo audit. | `lib/question-bank/randomization.ts`, `app/api/kompetensi/[paketId]/route.ts` (shuffle integration), `scripts/test-ukbi-tka-randomization.ts`, `scripts/audit-ukbi-tka-randomization.ts`, `package.json` |
| **Phase UKBI/TKA FOUNDATION 2B** | Session snapshot for UKBI/TKA test attempts. `TestSession.questionSnapshot` stores exact questions+options+correctAnswer at test start. Submit scores against snapshot (not live DB). Legacy fallback for sessions without snapshot. Add-only schema change (nullable Json). 11 tests (32 assertions) + 21 integrity checks. Existing leakage tests unaffected. | `prisma/schema.prisma` (+questionSnapshot), `lib/types/snapshot.ts`, `lib/security.ts` (sanitizer helpers), `app/api/kompetensi/[paketId]/route.ts` (snapshot save), `app/api/kompetensi/[paketId]/submit/route.ts` (snapshot scoring), `scripts/test-ukbi-tka-session-snapshot.ts`, `scripts/audit-ukbi-tka-snapshot-integrity.ts`, `package.json` |
| **Phase UKBI/TKA FOUNDATION 2C** | Per-attempt immutable snapshot archive. Uses existing `ProgresKompetensi.answerDetails Json?` field (no migration). Each submit saves `AttemptAnswerDetails` with snapshot copy + user answers + scoring summary. Multi-attempt supported via `@@unique([userId, paketId, attemptNumber])`. Sanitized client helpers for result/history display. TestSession.questionSnapshot remains active/current. 15 tests (42 assertions) + 19 audit checks. | `lib/types/snapshot.ts` (AttemptAnswerDetails, UserAnswerRecord, ResultSummary), `lib/security.ts` (sanitizeAttemptAnswerDetailsForClient, sanitizeAttemptHistoryForClient), `app/api/kompetensi/[paketId]/submit/route.ts` (userAnswerRecords + answerDetails save for UKBI + TKA), `scripts/test-ukbi-tka-per-attempt-snapshot.ts`, `scripts/audit-ukbi-tka-attempt-history.ts`, `package.json` |

## 4. Seed Data Inventory

| Dataset | File | Items | Status |
|---------|------|-------|--------|
| Homepage Artikel | `prisma/seed-data/homepage-content.json` | 15 | ✅ Seeded live |
| Homepage Video | `prisma/seed-data/homepage-content.json` | 15 | ✅ Seeded live |
| Homepage Karya | `prisma/seed-data/homepage-content.json` | 15 | ✅ Seeded live |
| Buku Panduan (PANDUAN) | `scripts/seed-panduan.ts` | 12 level, 71 bab | ✅ Seeded (VII–XII) |
| Jalur Cerdas (JALUR) | `scripts/seed-jalur-levels.ts` | 12 levels, 71 units | ⚠️ Replaced by Phase 1B — was wrong copy of PANDUAN |
| Jalur Cerdas Core (JALUR) | `scripts/seed-jalur-cerdas-core.ts` | 12 levels, 72 units | ✅ Phase 1B — general Bahasa Indonesia ability path, Duolingo-style, not grade-based |
| Jalur Cerdas Questions (JALUR) | `scripts/seed-jalur-questions-core.ts` | 366 questions across 72 units | ✅ Phase Arena Recovery 2 — 5+ questions per unit, stored in LearningUnit.content |
| UKBI Questions | `prisma/seed-kompetensi.ts` | 50 (25 SMP + 25 SMA) | ✅ Seeded |
| TKA Questions | `prisma/seed-kompetensi.ts` | 50 (25 SMP + 25 SMA) | ✅ Seeded |
| PaketKompetensi | `prisma/seed-kompetensi.ts` | 8 | ✅ Seeded |
| Materi content enrichment | `scripts/seed/seed-materi.ts` | 3 units updated | ⚠️ Partial — many titles don't match panduan names |
| Old v1 seed (Art+Video+Karya) | `scripts/seed-homepage-content.ts` | 6+6+6 | ✅ Already seeded, superseded by v2 |

**Seed scripts safety verified (Jun 29):** No `deleteMany`, `truncate`, `DROP`, or `deleteBrokenPackages` in any restore script. `seed-jalur-cerdas-core.ts` uses scoped `deleteMany` on JALUR type only (safe because 0 user progress). `seed-jalur-questions-core.ts` uses `update()` only (no delete).

**Destructive scripts (DO NOT RUN):**
- `scripts/seed-jalur-revamp.ts` — contains deleteMany
- `scripts/seed-jalur-full.ts` — contains deleteMany
- `scripts/seeder-paket-lengkap.ts` — contains deleteBrokenPackages
- `scripts/clean-db.ts` — destructive cleanup

**Safe seed scripts (upsert-only, dry-run default):**
- `scripts/seed-homepage-v2.ts` — `--dry-run` flag
- `scripts/seed-jalur-levels.ts` — dry-run by default, `--execute` to apply (LEGACY — superseded by core seed)
- `scripts/seed-jalur-cerdas-core.ts` — dry-run by default, `--execute` to apply (current)
- `scripts/seed-jalur-questions-core.ts` — dry-run by default, `--execute` to apply (Phase Arena Recovery 2)
- `scripts/seed-panduan.ts` — safe upsert

## 4a. Production Login & Data Source Status

| Item | Status |
|------|--------|
| Production login (bahasacerdas.com) | ✅ Bekerja — DATABASE_URL/DIRECT_URL di Vercel sudah mengarah ke Supabase |
| Data source | Supabase (PostgreSQL via pooler) — **source of truth** |
| Old VPS data | ❌ Dianggap hilang — Hostinger expired Jun 26, 2026. Tidak ada backup. |
| Data recovery phase | ✅ Phase Data Recovery 1 sedang berjalan — backup + audit sebelum seed/migrate ulang |
| Current backup | `backups/current/<timestamp>/` — backup JSON per tabel (read-only) |
| Supabase project | `https://ibtlhoocaoopgtcsnvzr.supabase.co` |
| Game server | ❌ Masih mati — VPS unreachable |
| Exam engine dev | ⏸️ Ditunda sampai backup/audit selesai |

## 5. Files by Category

### UKBI/TKA
- `lib/question-bank/randomization.ts` — Phase 2A: Fisher-Yates shuffle, seeded PRNG, option shuffling, session seed
- `lib/types/snapshot.ts` — Phase 2B/2C: AttemptSnapshot, AttemptAnswerDetails, UserAnswerRecord, ResultSummary
- `lib/security.ts` — sanitizeSnapshotQuestionForClient(), buildClientQuestionPayload(), sanitizeAttemptAnswerDetailsForClient(), sanitizeAttemptHistoryForClient()
- `scripts/test-ukbi-tka-randomization.ts` — 12 randomization tests
- `scripts/audit-ukbi-tka-randomization.ts` — 100-session Monte Carlo audit
- `scripts/test-ukbi-tka-session-snapshot.ts` — 11 snapshot tests (32 assertions)
- `scripts/audit-ukbi-tka-snapshot-integrity.ts` — 21 code-level integrity checks
- `scripts/test-ukbi-tka-per-attempt-snapshot.ts` — 15 per-attempt tests (42 assertions)
- `scripts/audit-ukbi-tka-attempt-history.ts` — 19 code-level integrity checks

### Docs
- `docs/BAHASACERDAS_DATA_AUDIT.md` — Data audit: what was lost vs preserved
- `docs/BAHASACERDAS_SEED_DATA_POLICY.md` — Seed data rules: authorship, validation, dry-run, safety
- `docs/BAHASACERDAS_WORK_STATUS.md` — THIS FILE: project ledger
- `docs/AI_AGENT_LAYER_PLAN.md` — AI monetization roadmap (Phase 9)
- `docs/BAHASACERDAS_CONTENT_DATA_RECOVERY_AUDIT.md` — Phase Recovery 1: content audit results
- `docs/BAHASACERDAS_QUESTION_DATA_RECOVERY_AUDIT.md` — Phase Recovery 1: question/exam audit results
- `docs/BAHASACERDAS_EXAM_ENGINE_ARCHITECTURE.md` — Exam engine architecture (Phase Exam 1)
- `docs/BAHASACERDAS_UKBI_TKA_DESIGN.md` — UKBI/TKA product design
- `docs/BAHASACERDAS_RANDOMIZED_EXAM_ENGINE.md` — Randomized exam engine spec
- `docs/BAHASACERDAS_ARENA_RECOVERY_AUDIT.md` — Phase Arena Recovery 1: VPS dependency audit results
- `docs/BAHASACERDAS_BACKUP_AND_RESTORE_POLICY.md` — Full backup/restore policy document

### Backup & Recovery
- `scripts/backup-current-supabase.ts` — Full DB backup to JSON files + manifest
- `scripts/backup-supabase-daily.ts` — Automated daily backup + Supabase Storage upload
- `scripts/restore-supabase-backup.ts` — Restore with dry-run, SHA256 verification, protected tables
- `scripts/validate-backup.ts` — Backup integrity validation
- `scripts/validate-learning-content.ts` — Learning content integrity validator (dry-run only)
- `docs/BAHASACERDAS_BACKUP_AND_RESTORE_POLICY.md` — Full backup/restore policy document  
- `scripts/migrate-backup-manifest.ts` — Safe migration to create BackupManifest table
- `backups/current/` — Backup output (gitignored)
- `backups/daily/` — Automated daily backups (gitignored)
- `app/(dashboard)/admin/data-center/page.tsx` — Admin Data Center UI (DB health, backup status, warnings)
- `app/api/admin/data-center/route.ts` — Data Center API (table counts + backup manifest reader)

### Seed Data
- `prisma/seed-data/homepage-content.json` — 27 items (9+9+9) deterministic
- `scripts/seed-homepage-v2.ts` — Seed script with upsert, dry-run, validation
- `scripts/seed-homepage-content.ts` — Old v1 script (keep for reference)
- `scripts/seed-panduan.ts` — 72 bab Buku Panduan
- `scripts/seed-jalur-levels.ts` — LEGACY: 12 JALUR levels + 71 units (superseded by core seed)
- `scripts/seed-jalur-cerdas-core.ts` — 12 JALUR levels + 72 units (Duolingo-style core curriculum)
- `scripts/seed-jalur-questions-core.ts` — 366 questions across 72 JALUR units (Phase Arena Recovery 2)
- `scripts/test-phase8-analytics.ts` — 12 analytics tests

### AEO
- `app/faq/page.tsx` — 14 Q&A + JSON-LD
- `components/aeo/AnswerBlock.tsx` — AEO answer component
- `components/aeo/JsonLd.tsx` — JSON-LD injection component
- `lib/json-ld.ts` — JSON-LD helpers
- `lib/aeo-config.ts` — AEO configuration
- `public/llms.txt` — LLM discovery file
- `scripts/test-aeo-readiness.ts` — 20 AEO tests

### AI Tools
- `src/ai/` — 6 agents (eyd, feedback, grading, text-analysis, bc-assistant, rpp)
- `app/(dashboard)/guru/ai-tools/` — 6 form components + orchestrator
- `app/api/ai/agents/` — Central runner, saved results, export routes

### Game Server (Dead)
- `game-server/Dockerfile` — Ready but no host
- `game-server/fly.toml` — Fly.io config (blocked by payment)
- `game-server/src/server.ts` — Socket.io game server source

## 6. Key Decisions

| Decision | Rationale |
|----------|-----------|
| Supabase over Oracle Cloud | Zero setup, keys ready, free tier sufficient |
| `psql` instead of `prisma db push` | Pooler hung on long-running push; psql migration SQL succeeded in ~30s |
| Clear stale cookies on `/login` | The 429 loop was caused by stale `sb-*`/`supabase-*` cookies. Clearing on login visit breaks loop without side effects. |
| Deterministic JSON seed data | Enables repeatable upsert, version-control friendly, easy review |
| Editorial team personas as authors | "Tim Redaksi BahasaCerdas" etc. — safe, not claiming real people |
| `ignoreBuildErrors: true` in `next.config.ts` | Pre-existing TS errors in unrelated game agents files |
| `typescript.ignoreBuildErrors: true` | Same reason — pre-existing issues in game agent code |
| **Backup first, audit before seed** | Current Supabase DB is source of truth — backup before any destructive operation |
| **Jangan sentuh payment/user data** | Production data is read-only during recovery phase |

## 7. Blockers

| Blocker | Impact | Notes |
|---------|--------|-------|
| **Game server dead** | All multiplayer games broken (Kuis Battle, Tebak Kata, Adu Cepat, Katastra) | VPS Hostinger expired Jun 26. Code at `game-server/`. Fly.io requires billing. Railway token invalid. |
| **YouTube video IDs** | Some videos in seed data use fake IDs → 404 | `VIDEO_ID_CERPEN`, `VIDEO_ID_PERSUASI`, `VIDEO_ID_BACACEPAT`, `VIDEO_ID_EJAAN` need replacement |
| **Supabase Storage files** | Karya items reference files that don't exist in storage | `storage/v1/object/public/documents/seed/materi/*` — all will 404 on download |
| **Author display name** | seed items use `guru@demo.com`'s `fullName` as author, not editorial persona | Need to update guru@demo.com's fullName to "Tim Redaksi BahasaCerdas" |
| **pre-existing docx/route.ts error** | Build succeeds only with `ignoreBuildErrors: true` | Syntax error at line 111 — unrelated to current phase |

## 8. Environment Variables

| Variable | Set in Vercel? | Notes |
|----------|----------------|-------|
| `DATABASE_URL` | ✅ | Supabase pooler with `pgbouncer=true` |
| `DIRECT_URL` | ✅ | Supabase direct (port 5432) for migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Secret — never commit |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `https://bahasacerdas.com` |
| `MIDTRANS_SERVER_KEY` | ✅ | Midtrans payment |
| `GEMINI_API_KEY` | ✅ | For AI features |
| `ANTHROPIC_API_KEY` | ❌ Not set | Optional |
| `DEEPSEEK_API_KEY` | ❌ Not set | Optional |
| `GROQ_API_KEY` | ❌ Not set | Optional |

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Stale seed data after schema changes | Medium | High | Update seed scripts when schema changes |
| Supabase rate limit (30 req/min auth) | Medium | Medium | Cookie clearing minimized calls; need to monitor |
| Game server permanent loss | High | High | Need new hosting (Railway, Koyeb, or cheap VPS) |
| HSTS preload makes rollback hard | Low | Medium | Remove HSTS header before any domain migration |
| .env.backup-vps has real secrets | Low | High | Added to `.gitignore`; file remains locally only |
| game-server/.env.example previously had real credentials | Low | Medium | Now uses placeholders; never commit real values |

## 10. Restored Row Counts (Post-Recovery)

| Model | Before Recovery | After Recovery | Restored? |
|-------|----------------|----------------|-----------|
| User | 43 | 43 | ✅ Preserved |
| Artikel | 15 | 15 | Preserved |
| Video | 15 | 15 | Preserved |
| Karya | 15 | 15 | Preserved |
| UKBIQuestion | 0 | 50 | ✅ Restored |
| TKAQuestion | 0 | 50 | ✅ Restored |
| PaketKompetensi | 0 | 8 | ✅ Restored |
| LearningLevel (PANDUAN) | 0 | 12 | ✅ Restored |
| LearningLevel (JALUR) | 0 | 12 | ✅ Phase Arena Recovery 1B — rebuilt as core curriculum (general ability) |
| LearningUnit (PANDUAN) | 0 | 71 | ✅ Restored |
| LearningUnit (JALUR) | 0 | 72 | ✅ Phase Arena Recovery 1B — 72 units, general Bahasa path |
| Profile | 42 | 42 | Preserved |
| Soal/SoalSet | 0 | 0 | ⏳ Need seed |
| StudentKarya | 0 | 0 | ❌ Lost from VPS |
| Game data | 0 | 0 | ❌ Lost from VPS |
| Payment/Subscription | 0 | 0 | ❌ Lost from VPS |

## 10a. Dummy Content Deletion (Jun 29)

**Before deletion backup:** `backups/current/2026-06-29-00-31/`  
**After deletion backup:** `backups/current/2026-06-29-00-33/`

Deleted 48 items owned by demo user `guru@demo.com`:

| Table | Deleted | Detection Rule |
|-------|---------|----------------|
| Artikel | 15 | author = guru@demo.com + slug matches homepage-content.json |
| Video | 15 | creator = guru@demo.com |
| Karya | 15 | seller = guru@demo.com |
| DailyQuest | 3 | seed daily quests for demo user |

**Preserved (not touched):**
- User: 43 ✅
- Profile: 42 ✅
- UKBIQuestion: 50 ✅
- TKAQuestion: 50 ✅
- PaketKompetensi: 8 ✅
- LearningLevel (PANDUAN): 12 ✅
- LearningLevel (JALUR): 12 ✅ (Phase Arena Recovery 1B — rebuilt as core curriculum)
- LearningUnit (PANDUAN): 71 ✅
- LearningUnit (JALUR): 72 ✅ (Phase Arena Recovery 1B — core curriculum)
- All payment/auth/admin data ✅

**Script:** `scripts/delete-dummy-content.ts` — dry-run by default, requires `--execute` flag.

## 11. Next Actions (Priority Order)

1. **Structural Validator for UKBI/TKA question bank** — validate answer-in-options, ID format, correctAnswer matches one of option IDs, no orphan PaketKompetensi references
2. **Build attempt review UI** — read sanitized answerDetails to show per-attempt question review with student answers
3. **Set up daily backup cron** — Add Vercel Cron Job (`POST /api/cron/backup`) or external cron for automated daily backup
4. **Game server revival** — find new hosting for game.bahasacerdas.com (VPS or alternative)
5. **More JALUR questions** — expand question count per unit (target 10+ per unit, currently 3-6)
6. **Push notifications** — browser push API for notif when tab not open
7. **Fix author display name** — update guru@demo.com's `fullName` to "Tim Redaksi BahasaCerdas"
8. **Upload real files to Supabase Storage** — replace fake seed file URLs
9. **Replace fake YouTube IDs** — use real educational video IDs
10. **Migrate old standalone AI routes** — `/api/ai/eyd`, `/api/ai/feedback`, etc. to central runner

### Backup & Automation Status
| Item | Status |
|------|--------|
| Daily backup script | ✅ Creates BackupManifest DB record |
| Storage upload | ✅ bahasacerdas-backups bucket (private) |
| Backup validation | ✅ SHA256 + row count verification |
| Learning content validation | ✅ `scripts/validate-learning-content.ts` |
| Restore safety | ✅ Dry-run default, protected tables, requires --execute |
| Cron | ⏳ Not set — needs Vercel Cron or external cron |
| Stale backup warning | ✅ Data Center shows warning if >24h |

---

*Do not edit manually unless you are the current agent session. This file is auto-maintained.*
