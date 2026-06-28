# BahasaCerdas Work Status

> **Project Ledger** — track completed, in-progress, pending, and blocked work.
> **Last updated:** 2026-06-29
> **Branch:** `main` (GitHub: `dominikus02-source/bahasa-cerdas`)

---

## 1. Git State

| Item | Status |
|------|--------|
| Active branch | `main` |
| Remote | `origin` → `https://github.com/dominikus02-source/bahasa-cerdas.git` |
| Local vs origin | **Up to date** |
| Last commit | `feat: seed homepage v2 + AEO Phase 6-10 + DB migration fixes` |
| Uncommitted changes | `.env.backup-vps` (in `.gitignore`), `backups/` (gitignored), new scripts |

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
| **AEO 6–10** | FAQ page + JSON-LD, llms.txt, sitemap, robots.txt, AnswerBlock, canonical URLs, 20 tests pass | `app/faq/`, `components/aeo/`, `lib/json-ld.ts`, `public/llms.txt` |

## 4. Seed Data Inventory

| Dataset | File | Items | Status |
|---------|------|-------|--------|
| Homepage Artikel | `prisma/seed-data/homepage-content.json` | 15 | ✅ Seeded live |
| Homepage Video | `prisma/seed-data/homepage-content.json` | 15 | ✅ Seeded live |
| Homepage Karya | `prisma/seed-data/homepage-content.json` | 15 | ✅ Seeded live |
| Buku Panduan | `scripts/seed-panduan.ts` | 12 level, 71 bab | ✅ Seeded (VII–XII) |
| UKBI Questions | `prisma/seed-kompetensi.ts` | 50 (25 SMP + 25 SMA) | ✅ Seeded |
| TKA Questions | `prisma/seed-kompetensi.ts` | 50 (25 SMP + 25 SMA) | ✅ Seeded |
| PaketKompetensi | `prisma/seed-kompetensi.ts` | 8 | ✅ Seeded |
| Materi content enrichment | `scripts/seed/seed-materi.ts` | 3 units updated | ⚠️ Partial — many titles don't match panduan names |
| Old v1 seed (Art+Video+Karya) | `scripts/seed-homepage-content.ts` | 6+6+6 | ✅ Already seeded, superseded by v2 |

**Seed scripts safety verified (Jun 29):** No `deleteMany`, `truncate`, `DROP`, or `deleteBrokenPackages` in any restore script.

**Destructive scripts (DO NOT RUN):**
- `scripts/seed-jalur-revamp.ts` — contains deleteMany
- `scripts/seed-jalur-full.ts` — contains deleteMany
- `scripts/seeder-paket-lengkap.ts` — contains deleteBrokenPackages
- `scripts/clean-db.ts` — destructive cleanup

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

### Backup & Recovery
- `scripts/backup-current-supabase.ts` — Full DB backup to JSON files + manifest
- `scripts/audit-content-data.ts` — Content inventory audit
- `scripts/audit-question-data.ts` — Question/exam data audit
- `backups/current/` — Backup output (gitignored)

### Seed Data
- `prisma/seed-data/homepage-content.json` — 27 items (9+9+9) deterministic
- `scripts/seed-homepage-v2.ts` — Seed script with upsert, dry-run, validation
- `scripts/seed-homepage-content.ts` — Old v1 script (keep for reference)
- `scripts/seed-panduan.ts` — 72 bab Buku Panduan
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
| LearningLevel | 0 | 12 | ✅ Restored |
| LearningUnit | 0 | 71 | ✅ Restored |
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
- LearningLevel: 12 ✅
- LearningUnit: 71 ✅
- All payment/auth/admin data ✅

**Script:** `scripts/delete-dummy-content.ts` — dry-run by default, requires `--execute` flag.

## 11. Next Actions (Priority Order)

1. **Phase Data Recovery 2** — analyze audit results, fix title mismatches in seed-materi.ts, run seed-panduan-sd.ts
2. **Phase Data Recovery 3** — restore additional content (SD class, more materi units)
3. **Phase Data Recovery 4** — verify restored data in production (www.bahasacerdas.com)
4. **Game server revival** — find new hosting (Railway with valid token, new VPS, or Koyeb)
5. **Fix author display name** — update guru@demo.com's `fullName` to "Tim Redaksi BahasaCerdas"
6. **Upload real files to Supabase Storage** — replace fake seed file URLs
7. **Replace fake YouTube IDs** — use real educational video IDs
8. **Migrate old standalone AI routes** — `/api/ai/eyd`, `/api/ai/feedback`, etc. to central runner
9. **Phase 9 monetization** — see `docs/AI_AGENT_LAYER_PLAN.md`
10. **Push notifications** — browser push API

---

*Do not edit manually unless you are the current agent session. This file is auto-maintained.*
