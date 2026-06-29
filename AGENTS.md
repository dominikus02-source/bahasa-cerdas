<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Behavior (Autonomous Mode)

Kamu adalah **Senior Full-Stack Engineer** yang sangat autonomous, teliti, dan bertanggung jawab penuh atas project bahasacerdas.com.

- **Autonomous Mode**: Langsung eksekusi, edit file, dan jalankan command tanpa menunggu approval kecuali ada resiko tinggi (hapus file penting, ubah schema database, security-related).
- Jika menemukan error, **fix sendiri** otomatis sampai berhasil.
- Setelah selesai task: jalankan `npm run build`, lalu test jika ada. Beri summary singkat.
- Think step-by-step sebelum coding, tapi eksekusi cepat.
- Jangan verbose saat menjelaskan, fokus ke solusi.

## Coding Standards
- Gunakan **TypeScript strict** (no `any`)
- **Functional components** + React Server Components semaksimal mungkin
- Naming: `camelCase` untuk variable/function, `PascalCase` untuk component
- `export default` untuk halaman dan component utama
- **Early return** untuk clean code
- Error handling user-friendly, jangan crash
- Semua fitur baru harus responsive (mobile-first)
- Ikuti shadcn/ui conventions

## Architecture Rules
- Logic bisnis di `/lib` atau `/server`
- API routes → Route Handlers (`app/api`)
- Server Actions untuk mutasi data jika memungkinkan
- Pisahkan: UI, Business Logic, Data Access
- Setiap halaman besar harus punya loading state + error boundary

## Git Commit Convention
- `feat:` fitur baru
- `fix:` perbaikan bug
- `refactor:` perubahan kode tanpa ubah fungsi
- `chore:` maintenance
- `docs:` dokumentasi

## Priority
1. Kebenaran fungsi (working code)
2. Clean & maintainable code
3. Performance
4. User Experience

---

# BahasaCerdas Project Status
## Last Updated: June 29, 2026 (Phase Build Hardening 1)

## Goal
Transform BahasaCerdas into a social-creative platform for Bahasa Indonesia where students write daily (puisi, cerpen, artikel, anekdot, pantun), showcase works in social-style portfolios, earn Coin Cerdas, and compete in weekly leagues — UKBI/TKA as supporting features, not core.

## Tech Stack
- Next.js 16.2.6 with TypeScript, App Router, Tailwind CSS
- Supabase for auth + PostgreSQL (cloud, NOT self-hosted — VPS dead)
- Game server: Socket.io — currently DEAD (was on VPS, Hostinger expired)
- Midtrans for payment
- Prisma ORM with PostgreSQL (via Supabase pooler)
- Vercel for frontend (live at bahasacerdas.com)
- Guru color: emerald/green, Murid color: violet/purple

## Critical Context

### VPS (Hostinger) — DEAD since June 26, 2026
- IP: 72.60.78.65 — completely unreachable (port 22, 5432, 3001 all timeout)
- Hostinger subscription not renewed
- All services on VPS are down: PostgreSQL, game server, NGINX
- No database backup was taken before it went down

### Supabase (Cloud — Live)
- URL: [set in .env / Vercel env vars]
- Database: PostgreSQL via Supabase pooler (pooler URL: [set in .env / Vercel env vars])
- DATABASE_URL uses pooler port 6543 (PgBouncer) — actual value: [set in .env / Vercel env vars]
- DIRECT_URL uses port 5432 (direct connection for migrations) — actual value: [set in .env / Vercel env vars]
- SERVICE_ROLE_KEY: [set in Supabase dashboard — never commit]
- Password: [rotated — see Supabase dashboard]
- Prisma schema pushed via psql (83 tables — prisma db push timed out on pooler)
- Auth: 50 existing users preserved + 2 demo accounts

### Environment Variables
- DATABASE_URL: [set in .env / Vercel env vars — uses pooler port 6543 with pgBouncer]
- DIRECT_URL: [set in .env / Vercel env vars — uses direct port 5432 for migrations]
- NEXT_PUBLIC_SUPABASE_URL: [lihat Supabase dashboard]
- NEXT_PUBLIC_SUPABASE_ANON_KEY: [lihat Supabase dashboard]
- NEXT_PUBLIC_SITE_URL: https://bahasacerdas.com
- NEXT_PUBLIC_GAME_SERVER_URL: https://game.bahasacerdas.com (DEAD)
- MIDTRANS_SERVER_KEY: [lihat Midtrans dashboard]
- NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: [lihat Midtrans dashboard]
- NEXT_PUBLIC_MIDTRANS_MERCHANT_ID: [lihat Midtrans dashboard]
- ANTHROPIC_API_KEY: [belum diset]
- DEEPSEEK_API_KEY: [belum diset]
- GROQ_API_KEY: [belum diset]
- GEMINI_API_KEY: [diset untuk Vercel, lihat vault]
- SUPABASE_SERVICE_ROLE_KEY: [lihat Supabase dashboard — simpan aman]

### DNS
- Main site: bahasacerdas.com → Vercel (live, nameservers ns1/ns2.vercel-dns.com), www.bahasacerdas.com also aliased
- Game subdomain: game.bahasacerdas.com → 72.60.78.65 (A record, points to dead VPS)
- Old: game.bahasacerdas.site → deprecated, NGINX config disabled

### Game Server — DEAD (VPS Hostinger expired)
- Previously: Socket.io on port 3001, PM2, NGINX reverse proxy
- All multiplayer game features broken: Kuis Battle, Tebak Kata, Adu Cepat, dll.
- game.bahasacerdas.com unreachable
- Code still exists at game-server/ directory in project root
- No backup of compiled dist/server.js
- Need new hosting to bring back (VPS or alternative)

### Auth Users (Supabase)
- 50 existing users from previous registrations
- All have Prisma User records now (script created them)
- Demo accounts: guru@demo.com/guru123 (role: GURU), murid@demo.com/murid123 (role: MURID)
- Prisma User supabaseId matches Auth user id
- GET /api/user/me now auto-creates User record if missing (fix deployed)

## Build Config
- next.config.ts: typescript.ignoreBuildErrors: true, eslint.ignoreDuringBuilds: true
- Build command: prisma generate && next build
- Uses npm (NOT pnpm — pnpm workspace caused build failures)

## Completed Features

### Core
- Next.js deployed to Vercel (live at bahasacerdas.com)
- Supabase auth integration (middleware + supabase SSR)
- Role-based routing (guru/murid dashboard)
- Tailwind theme with emerald/violet color system
- 413 Payload Too Large fix: Supabase Storage bucket `file_size_limit` set to 50MB via Management API; `configureBucket()` in `lib/upload.ts` auto-configures buckets on every upload; admin page uses client-side upload (bypasses Vercel 4.5MB limit) + server action for metadata only
- RLS fix needed: admin page shows error message instructing user to run SQL in Supabase dashboard to create INSERT policy on storage.objects for documents bucket

### Game System (Kuis Battle)
- Socket.io game server on VPS
- Game pages: guru/game/lobby, murid/game/lobby, murid/game/play, game/[code]
- Components: components/game/GameLobby.tsx, GamePlay.tsx
- Socket client: lib/game/socket.ts
- API routes: /api/game/room, /api/game/result, /api/game/history
- Prisma models: GameRoom, GameQuestion, GameSession, GameResult
- Game types: KUIS_BATTLE, TEBAC_KATA, KATA_SERU, KOSAKATA_HARIAN
- 6-char alphanumeric room codes, auto-generated

### UKBI/TKA System
- PaketKompetensi model with 6 test packages
- Predikat mapping (Kemdikbud): Istimewa→Marginal→Terbatas
- TKA grades: A (≥85%), B (≥70%), C (≥55%), D (<55%)
- Seeding: prisma/seed-kompetensi.ts (25 UKBI + 25 TKA questions)

### Class Management (KelasKu)
- Guru creates groups with access codes
- Murid joins via code
- GroupQuiz assignment system
- Progress tracking per student

### Marketplace & Finance
- Karya model with 8 types (RPP, Modul, PPT, Soal, Video, Ebook, Administrasi, Lainnya)
- Midtrans integration for paid purchases
- 80% seller / 20% platform commission
- 3 free uploads for all, unlimited for premium
- Seller earnings and withdrawal system

### Community
- Community model with 5 types (MGMP, KKG, Publikasi, Study Group, Lainnya)
- CommunityPost with likes/comments
- CommunityMember with roles

### Buku Panduan Guru (Grade-Based Content)
- **Schema**: added `type` field ("JALUR"/"PANDUAN") to `LearningLevel`, `grade`/`semester`/`kd` to `LearningUnit`, removed `@unique` from `level` (replaced with `@@unique([type, level])`)
- **New models**: `Penugasan` (assign unit → group) + `PenugasanSubmission` (student status/score per assignment)
- **Seed**: `scripts/seed-panduan.ts` — 12 grade-levels (VII-1 s.d. XII-2), 72 bab units with content (belajar + latihan + praktik + kuis)
- **Teacher page**: `/guru/panduan-guru` — expandable grade cards → semester → bab list → "Kirim" button per bab. Search, filtered by grade/semester
- **Assign modal**: select classes, set tenggat, batch send to multiple groups
- **API**: `POST /api/guru/penugasan` — creates Penugasan records for selected groups
- **Student page**: Ruang Tugas (`/arena/tugas`) now shows Penugasan alongside QuizAssignments in Tersedia tab → links to Belajar page
- **API**: `GET /api/murid/penugasan` + `PATCH /api/murid/penugasan` — list + update submission status
- **Gradebook**: `/guru/gradebook` — select class → table (students × assigned units) with scores/completion, export CSV
- **API**: `GET /api/guru/gradebook` — returns groups summary or detailed per-group data
- **Sidebar**: added "Buku Panduan" and "Buku Nilai" links under "Belajar & Materi"
- Reuses existing Belajar/Latihan/Praktik/Kuis rendering (no rewrite needed)
- 57+ models including User, Profile, UKBIQuestion, TKAQuestion, PaketKompetensi, StudentKarya, StudentKaryaLike, StudentKaryaComment, CoinTransaction, DailyQuest, StoreItem, UserItem, Penugasan, PenugasanSubmission, etc.
- 20+ enums

### Auto-Matchmaking (Adu Cepat)
- Full flow: Cari Lawan → Searching → Match Found → Countdown 3-2-1 → Battle → Result + XP → Main Lagi
- Page: `/arena/game/adu-cepat` (client component)
- Game server: added `join-queue`, `leave-queue`, `rematch` events + matchmaking queue + auto room creation
- Socket client: added `onMatchFound`, `onMatchCountdown`, `onQueueStatus`, `onQueueTimeout`, `joinQueue`, `leaveQueue`, `rematch`
- Game hub: added "Adu Cepat" card as first option with hot badge
- Reuses existing GamePlay component during battle
- Server deployment: `bash scripts/deploy-game-server.sh` (requires SSH access to VPS)

### Content Writing Convention (Belajar Page)
The Belajar page auto-detects content types in `isi[]` strings:
- `✓ teks` → green checkmark (benar/correct)
- `✗ teks` → red X (salah/incorrect)
- `1. teks` → numbered step with circle badge
- `• teks` → bullet point
- `PENTING: teks` → amber warning box
- Lines starting with `BENAR:` / `SALAH:` → color-coded
- `Tips ...` → blue tip box with Brain icon
- Empty lines → spacer
- `catatan` field → blue info box with Sparkles icon
- `contoh[]` → amber-tinted section with examples
- `rangkuman[]` → green summary box at end

### Perbaikan Game Pages
- Added `.game-fullscreen` CSS class: expands main container, hides bottom nav for game pages
- All 4 game wrappers (kuis-tempur, tebak-kata, susun-kata, katastra) use consistent back button style
- Katastra: now renders in Arena (no redirect), fixed mobile layout (grid rewards, compact sizing)

### Ruang Tugas
- Page: `/arena/tugas` with 3 tabs (Tersedia/Dikerjakan/Selesai)
- Card on Beranda: `TugasCard` component showing pending assignment count
- Links to existing `/murid/tugasku/[id]/take` and `/murid/tugasku/[id]/result`
- API: reuses existing `/api/murid/tugas`

### Social Features (Student Karya)
- **Database**: `StudentKarya` model (PUISI, CERPEN, ARTIKEL, ANEKDOT, PANTUN, OPINI), `StudentKaryaLike`, `StudentKaryaComment`, `CoinTransaction`, `DailyQuest`, `StoreItem`, `UserItem`
- User model: added `coins`, `totalLikes`, `totalViews`
- **API Routes**: CRUD karya, like toggle, comment, quests, store, transactions, league
- **Pages**: Beranda (feed), Profile (portofolio), Karya detail, Tulis karya, Quest harian, Toko koin

### Scoring System
- **NilaiKategori model** (groupId, nama, bobot) + **Nilai model** (userId, kategoriId, skor, sumberType, sumberId)
- Feed karya grading, bulk input, kuis manual grading, rapor A-E
- Dashboard widget: rata-rata per kategori + "blm dinilai" count

### Bank Soal Improvements
- AI generate form: Kesulitan (Mudah/Sedang/Sulit) + KD dropdown
- Manual create soal form (PG) with options + correct answer
- Topik merged into Deskripsi on SoalSet
- "Lihat Soal" link after AI generation

### Featured System
- `PATCH /api/siswa/karya/[id]` — toggle `isFeatured` (GURU only)
- Guru feed: "Pilih/Pilihan" buttons
- Murid beranda: "Karya Pilihan" section

### Notification System
- Like/comment routes → creates `Notifikasi` records
- NotificationBell component in Murid sidebar
- Existing: Notifikasi model, CRUD API, guru & arena notification pages

### Supply
- `lib/coins.ts` — awardCoins(), spendCoins(), getBalance(), getTransactions(), getOrCreateDailyQuests(), trackQuestProgress(), claimQuestReward(), trackDailyStreak()

### AI Tools Suite for Guru (Phase 6A)
- **AI Agents** in `src/ai/`: eyd-agent (perbaiki EYD), feedback-agent (feedback karangan), grading-agent (nilai otomatis), text-analysis-agent (analisis kebahasaan), bc-assistant-agent (asisten BC), plus shared core (agent-types, rate-limit)
- **6 specialized forms** in `app/(dashboard)/guru/ai-tools/_components/forms/`: eyd-form, feedback-form, grading-form, text-analysis-form, bc-assistant-form, reuse ai-chat-form
- **UI**: `alat-ai-client.tsx` (orchestrator with tab switching), `history-panel.tsx` (search, filter by agent, title editing, inline delete confirm, export buttons), `agent-result-panel.tsx` (rich result display)
- **Page**: `/guru/ai-tools` with tabs for each AI tool
- **API**: `/api/ai/agents/run` for universal execution, `/api/ai/agents/saved` for history
- **DB**: `AiSavedResult` model (single canonical model — no duplicate `SavedAiResult`)
- **Export**: DOCX for RPP/Soal, PPTX for PPT, PDF for RPP/Soal

### Phase 6B — Architecture Drift Audit & Consolidation
- **Audit**: Verified Prisma schema — only `AiSavedResult` exists (no duplicate `SavedAiResult`)
- **Audit**: Verified API routes — no `/api/ai/saved-results` duplicate exists
- **Audit**: Verified UI helpers use canonical routes (`/api/ai/agents/run`, `/api/ai/agents/saved`, `/api/ai/agents/export/*`)
- **Fix**: Added `eyd`, `feedback`, `grading`, `text-analysis` to `AGENT_IDS` in `/api/ai/agents/saved/route.ts` (was blocking new agents from saving)
- **Verified**: All 9 agents registered in central registry, visible in `GET /api/ai/agents`
- **Verified**: New agents (eyd, feedback, grading, text-analysis) use central runner
- **Test script**: `scripts/test-phase6-consolidation.ts` — all 9 tests pass
- **Old legacy routes left unchanged**: `/api/ai/eyd`, `/api/ai/feedback`, `/api/ai/grading`, `/api/ai/text-analysis`
- **Old legacy pages left unchanged**: `/guru/ai-tools/eyd`, `/guru/ai-tools/feedback`, `/guru/ai-tools/grading`, `/guru/ai-tools/text-analysis`

## Pitch Deck & Financials (May 27, 2026)
- `pitch-deck.html` — 14-slide English HTML pitch deck
- `Bahasacerdas_Pitch_Deck.pptx` — 12-slide PPTX (dark theme, premium)
- `bikin_deck.py` — Python PPTX generator
- `BahasaCerdas Final Pitch Deck-fixed.py` — user's alternate PPTX generator
- `2-bahasacerdas_financial_plan_fixed.html` — detailed revenue model & financial plan
- `Bahasacerdas_Financial_Plan.pdf` — PDF export of financial plan
- **Key numbers**: Seed Rp 4B, Pre-money Rp 18B, Equity 18.2%, M18 run-rate Rp 3.14B/mo, ARR Y1 Rp 5.76B → Y2 Rp 24B → Y3 Rp 80B, Gross margin 90.1%
- **File locations**: `/Users/user/Documents/bahasa-cerdas/` for main files, `/Users/user/Documents/BC-Bahasa Cerdas Master/Financial BC/` for financial model

## Completed Phase 8B — Analytics QA & Data Integrity

### Fixed critical bugs:
1. **Feature name mismatch**: `usage-logger.ts` stores feature as `agent:rpp` but analytics API queried raw `rpp` → agent usage always returned 0. Fixed by prefixing with `agent:` in queries.
2. **Status case mismatch**: `usage-logger.ts` stores status as lowercase `"success"` but analytics API used uppercase `"SUCCESS"` → success/failed counts always 0. Fixed to lowercase.
3. **Top users query**: Used bare agent IDs without `agent:` prefix → most-used-agent always empty. Fixed.
4. **Unknown/null provider**: Records with null provider were invisible in provider breakdown. Added `"unknown"` group.

### Optimizations:
- Daily usage query rewritten to raw SQL `DATE(created_at)` group by instead of loading all rows in-memory
- Added `latencyMs` tracking to export events (DOCX/PDF/PPTX)
- Export routes now measure and log latency

### Verified:
- `npx tsc --noEmit` — 0 new errors
- `npx eslint` on modified files — 0 violations
- `npx prisma validate` — valid
- 12 automated tests in `scripts/test-phase8-analytics.ts`

### New files created:
- `app/(dashboard)/admin/ai-analytics/page.tsx` — admin AI analytics dashboard
- `app/api/admin/ai-analytics/route.ts` — analytics API with Prisma aggregation
- `scripts/test-phase8-analytics.ts` — 12 QA tests
- `docs/AI_AGENT_LAYER_PLAN.md` — updated with Phase 8B

### Files modified:
- `components/admin/AdminSidebar.tsx` — added AI Analytics nav item
- `app/(dashboard)/admin/page.tsx` — added "Ringkasan AI Hari Ini" widget
- `src/ai/core/usage-logger.ts` — added `latencyMs` to export events
- `app/api/ai/agents/export/docx/route.ts` — added latency tracking
- `app/api/ai/agents/export/pdf/route.ts` — added latency tracking
- `app/api/ai/agents/export/pptx/route.ts` — added latency tracking
- `prisma/schema.prisma` — verified AIUsage extended fields (unchanged)

### Known limitations:
1. N+1 agent/provider queries (9+3 parallel) — acceptable for admin panel
2. Streaming runs report 0 tokens (no count from SSE)
3. Old standalone routes still bypass AIUsage logging
4. No daily usage zero-fill — only dates with data appear
5. Export events lack provider info

## Phase 8C — DB Migration & Content Recovery (June 28, 2026)

### Done
- **Database migrated from dead VPS to Supabase**: DATABASE_URL changed from VPS PostgreSQL to Supabase pooler. DIRECT_URL added for migrations (port 5432). Password rotated — see Supabase dashboard.
- **Prisma schema pushed**: `prisma db push` timed out on pooler → used `psql` with migration SQL from `prisma migrate diff --from-empty --to-schema-datamodel`. 83 tables created.
- **Auth users preserved**: 50 existing users confirmed in Supabase Auth. 2 demo accounts (guru@demo.com, murid@demo.com) created.
- **Prisma User records created**: Script created records for all 50 Auth users with matching supabaseId.
- **Demo user roles fixed**: guru@demo.com set to GURU role via direct SQL.
- **Middleware 429 fix**: proxy.ts catch block clears stale sb-*/supabase-* cookies when session invalid, breaking the refresh-token loop.
- **GET /api/user/me auto-create**: Now calls findOrCreateUser if no Prisma record exists (like POST handler).
- **Content seeded**: `scripts/seed-homepage-content.ts` created — 6 Artikel, 6 Video, 6 Karya (marketplace) items using guru user as author/seller.
- **Homepage now shows content**: KaryaPopulerSection, Artikel, and Video sections populated with realistic Indonesian educational content.
- **Vercel deployed & aliased**: bahasacerdas.com + www.bahasacerdas.com both live.

### Remaining
1. User must clear browser cookies for bahasacerdas.com to break 429 loop (or wait for rate limit reset).
2. Game server completely dead — all multiplayer features broken. Need new VPS or alternative hosting.
3. Homepage content is sample data — may need to be curated or enriched further.

## Phase 9 — Backup & Restore Policy (June 29, 2026)

### Done
- **Backup Automation**: `scripts/backup-supabase-daily.ts` — exports all 67 Prisma models to JSON with SHA256 checksum manifest. Writes to `backups/daily/YYYY-MM-DD-HH-mm/`. Optionally uploads to Supabase Storage (`bahasacerdas-backups` bucket). Properly handles binary/JSON fields (JSON.stringify). Rate-limited to 5 tables/sec. Retention: 30 backups.
- **On-demand Backup**: `scripts/backup-current-supabase.ts` — same logic as daily, saves to `backups/current/` instead. Per-bucket backup: `--bucket game` saves only game-related tables.
- **Restore Script**: `scripts/restore-supabase-backup.ts` — dry-run by default, requires `--execute`. SHA256 verification before restore. Protected tables (`User`, `Profile`) excluded unless `--tables User,Profile` explicitly set. Table allowlist via `--tables A,B,C`. Overwrite mode via `--overwrite`. Email masked in dry-run output.
- **Validation Script**: `scripts/validate-backup.ts` — validates latest backup in `backups/daily/` or `backups/current/`. Checks: manifest valid JSON, all files exist, SHA256 checksums match, row counts match. Prints summary with non-zero tables.
- **Policy Document**: `docs/BAHASACERDAS_BACKUP_AND_RESTORE_POLICY.md` — covers frequency, format, locations (local + Supabase Storage), restore safety rules, recovery scenarios, validation, security.
- **Package scripts**: `npm run backup:daily`, `npm run backup:current`, `npm run restore:backup`, `npm run validate:backup` added to `package.json`.

### New Files Created
- `scripts/backup-supabase-daily.ts` — daily backup with Supabase Storage upload
- `scripts/restore-supabase-backup.ts` — restore with dry-run + protected tables
- `scripts/validate-backup.ts` — integrity validation
- `docs/BAHASACERDAS_BACKUP_AND_RESTORE_POLICY.md` — full policy documentation

### Files Modified
- `package.json` — added 4 backup/restore/validate scripts
- `AGENTS.md` — updated with Phase 9 status

### Key Design Decisions
1. **Local-first, storage-second**: Always saves locally first, then attempts Supabase Storage upload (best-effort). Ensures backup works even without storage access.
2. **SHA256 in manifest**: Each table export has checksum in manifest. Restore refuses to proceed if any checksum is wrong (detect corruption).
3. **Protected tables**: `User` and `Profile` are excluded by default. Must explicitly name them in `--tables` to restore. Prevents accidental user data overwrite.
4. **Dry-run default**: Restore script prints plan without writing. Only writes with `--execute`. Safety first.
5. **Rate-limited export**: 5 tables exported per second avoids overwhelming Prisma/Database.
6. **Auto-cleaning**: Keeps only 30 most recent daily backups. Oldest removed automatically.

## Next Steps (Priority Order)
1. **Game server revival** — find new hosting for game.bahasacerdas.com (VPS or alternative)
2. **Push notifications** — browser push API for notif when tab not open
3. **Set up daily cron** — Add Vercel Cron Job (`POST /api/cron/backup`) or external cron for automated daily backup
4. **Expand JALUR questions** — increase 6 low-count units to 5+ questions each
5. **Old standalone routes** — migrate `/api/ai/eyd`, `/api/ai/feedback`, `/api/ai/grading`, `/api/ai/text-analysis` to central runner
6. **Content enrichment** — add more latihan/kuis to each bab (ongoing)

## Blockers
- Game server dead (VPS Hostinger expired) — all multiplayer games broken
- Pre-existing `docx/route.ts(111,1)` syntax error on main branch (unrelated to Phase 8C/9)

## GitHub
- Repo: https://github.com/dominikus02-source/bahasa-cerdas
- .env NOT pushed (secrets removed)
- Branch: main

## Color Theme
- Guru = emerald/green (from Tailwind emerald-500 range)
- Murid = violet/purple (from Tailwind violet-500 range)
- Premium badge: gold/yellow accent

## Key File Locations
- Main project: ~/Documents/bahasa-cerdas
- VPS game server: /var/www/game-server/game-server on [lihat Hostinger VPS dashboard] (DEAD)
- Prisma schema: prisma/schema.prisma (main project)
- Game server schema: /var/www/game-server/prisma/schema.prisma
- Social/coins utility: lib/coins.ts
- Student karya pages: app/(dashboard)/murid/karya/
- Buku Panduan seed: scripts/seed-panduan.ts
- Pitch deck generator: bikin_deck.py
- Financial model: /Users/user/Documents/BC-Bahasa Cerdas Master/Financial BC/
- Homepage content seed: scripts/seed-homepage-content.ts

## Materi Content System
- **Per-unit files**: `scripts/seed/materi/26-laporan-percobaan.ts` etc — each unit in own file, independently editable
- **Shared types**: `scripts/seed/materi/types.ts` (Konten, Soal, makeSoal)
- **Master seed**: `scripts/seed/seed-materi.ts` — looks up each unit by title + grade + semester in DB, updates its content JSON
- **Flow**: edit unit file → `npx tsx scripts/seed/seed-materi.ts` → refresh browser
- **Lookup**: Now uses `{ title, grade, semester, isActive }` to avoid title conflicts (e.g., "Bab 3: Drama" in both VIII S2 and IX S2)
- Seed does NOT drop/recreate units — only updates `content` field of matching titles
- To add new units, create a new file in `scripts/seed/materi/`, import it, and add to the `units` array with grade/semester
- Belajar page uses `app/arena/jalur-cerdas/[unitId]/belajar/page.tsx` with Duolingo-style UI: sticky progress bar, content-type detection (✓/✗/numbered/bullet/⚠️/[Ilustrasi: ...]), card-by-card flow, animated transitions

### Grade IX Content (Enriched)
- **Semester 1**: 6 units — Laporan Percobaan, Pidato Persuasif, Cerpen, Teks Tanggapan, Teks Diskusi, Puisi
- **Semester 2**: 6 units — Teks Eksplanasi, Laporan, Drama, Resensi, Artikel, Karya Tulis Ilmiah
- Each unit: 4+ materi sections with [Ilustrasi: ...], 10 latihan, 10 kuis, praktik with tips
- Files: `scripts/seed/materi/26-*.ts` through `37-*.ts`
- Grade VII/VIII content remains enriched from previous session

## Phase Arena Recovery 1 — Complete (June 29, 2026)

### What
Audit /arena/jalur-cerdas for VPS dependency → **NO VPS dependency found**. All existing routes use Supabase/Prisma directly.

### Key Findings
1. **VPS dependency is multiplayer-only** (socket.io in `lib/game/socket.ts`, `hooks/useSocket.ts`) — NOT used by jalur-cerdas
2. **lib/redis.ts uses Upstash Cloud** (not VPS) — gracefully falls back to DB query if env vars missing
3. **0 JALUR-type levels existed** — all 12 levels were PANDUAN type (Buku Panduan screen, not Jalur Cerdas)
4. **Hardcoded promo stats** on arena beranda page ("4 Level", "13 Materi", "1.400 XP")

### What Was Done (Phase 1)
1. Created `docs/BAHASACERDAS_ARENA_RECOVERY_AUDIT.md` — full audit report
2. Created `scripts/validate-learning-content.ts` — idempotent validator (dry-run only)
3. Created `scripts/seed-jalur-levels.ts` — safe seed that copies PANDUAN data as JALUR type (upsert-only, dry-run default)
4. Seed created 12 JALUR levels + 71 units (WRONG — was duplicate of PANDUAN)
5. Fixed hardcoded stats on `app/arena/page.tsx` — now dynamically queries DB for level count, unit count, user XP
6. Added package scripts: `validate:learning-content`, `seed:jalur-levels`, `seed:jalur-levels:execute`
7. Build passed: 268 pages

### Phase 1B — Correction (June 29, 2026)
Phase 1 was **wrong direction** — JALUR should NOT be a copy of PANDUAN (grade-based curriculum). JALUR is a **general Bahasa Indonesia ability path** suitable for all ages (SD and above), like Duolingo.

#### Correction
- **Replaced** the PANDUAN-copied JALUR data with proper Duolingo-style curriculum
- **12 levels** from "Mulai dari Bahasa" (basic huruf/bunyi) to "Mahir Berbahasa" (menyunting, argumen)
- **72 units** covering: fonetik, ejaan, kata baku, sinonim/antonim, imbuhan, kalimat efektif, konjungsi, paragraf, membaca pemahaman, fakta/opini, ringkasan, tantangan akhir
- **0 user progress existed** — safe replacement
- **PANDUAN untouched** — remains as grade-based curriculum for teachers
- **UI copy updated**: "Latihan Bahasa Indonesia dari nol sampai mahir", "Cocok untuk semua usia"
- **New seed**: `scripts/seed-jalur-cerdas-core.ts` (dry-run default, `--execute` to apply)
- **Package scripts**: `seed:jalur-cerdas:dry-run`, `seed:jalur-cerdas`
- Build passed: 268 pages

### Key Distinction
| Track | Type | Audience | Content |
|-------|------|----------|---------|
| **Jalur Cerdas** | JALUR | All ages (SD+) | General Bahasa ability path: bunyi → mahir |
| **Buku Panduan** | PANDUAN | Teachers/students (VII–XII) | Grade-based curriculum per Kemdikbud |

### JALUR Content Note
The JALUR seed creates level+unit shells (titles, descriptions, emoji, XP). The `content` field (isi[] with actual learning materials like materi, latihan, kuis) is not yet populated — this is next priority.

### Relevant Files
- `docs/BAHASACERDAS_ARENA_RECOVERY_AUDIT.md` — audit findings
- `scripts/validate-learning-content.ts` — validator
- `scripts/seed-jalur-cerdas-core.ts` — correct JALUR curriculum seed
- `scripts/seed-jalur-levels.ts` — legacy, no longer used
- `app/arena/jalur-cerdas/page.tsx` — updated copy
- `app/arena/page.tsx` — dynamic promo stats + updated copy
- `npm run seed:jalur-cerdas:dry-run` — dry-run seed
- `npm run seed:jalur-cerdas` — apply seed
- `npm run validate:learning-content` — run validator

## Phase Arena Recovery 2 — Lesson Engine (June 29, 2026)

### What
Built Duolingo-style lesson engine for all 72 JALUR units: question-by-question flow, instant feedback, progress bar, XP rewards, lock/unlock progression.

### Key Decisions
1. **No new Prisma models** — Questions stored in existing `LearningUnit.content` JSON field (no migration needed)
2. **Sanitized API** — GET `/api/jalur-cerdas/[unitId]` strips `jawaban` field from questions before sending to client
3. **Server-side validation** — POST `/api/jalur-cerdas/[unitId]/submit` validates answer against stored `jawaban`
4. **Answer key never exposed** — `jawaban` only sent in submit response (for that specific question)
5. **Idempotent progress** — Existing `PATCH /api/jalur-cerdas/[unitId]/progress` already prevents duplicate XP via `completed` check
6. **Lock/unlock** — First unit unlocked by default; each unit unlocks when previous unit in same level is completed

### What Was Built
- **Lesson page**: `app/arena/jalur-cerdas/[unitId]/lesson/page.tsx` — client component with phases: intro → question → result → complete. Duolingo-style: large answer buttons, instant feedback (green/red flash), progress bar, XP on completion
- **Question API**: `app/api/jalur-cerdas/[unitId]/route.ts` — returns sanitized questions (no jawaban) + unit data + progress
- **Submit API**: `app/api/jalur-cerdas/[unitId]/submit/route.ts` — validates answer server-side, returns { correct, correctAnswer, explanation }
- **Seed script**: `scripts/seed-jalur-questions-core.ts` — 366 questions across 72 units (5+ per unit, dry-run default, --execute to apply)
- **Unit detail page**: `app/arena/jalur-cerdas/[unitId]/page.tsx` — lock/unlock state, "Mulai latihan"/"Coba lagi" button, "Lanjut ke unit berikutnya" CTA
- **Lock/unlock**: First unit unlocked; each unit checks if previous unit is completed. Locked units show disabled button with "Selesaikan unit sebelumnya"

### Verification
- Build: 268 pages ✅
- Validator: 24 levels, 143 units, 0 errors ✅
- Backup: 67 tables, 367 rows ✅
- PANDUAN untouched: 12 levels, 71 units ✅

### Relevant Files
- `scripts/seed-jalur-questions-core.ts` — questions seed
- `app/api/jalur-cerdas/[unitId]/route.ts` — sanitized GET
- `app/api/jalur-cerdas/[unitId]/submit/route.ts` — submit validation
- `app/arena/jalur-cerdas/[unitId]/lesson/page.tsx` — lesson engine
- `app/arena/jalur-cerdas/[unitId]/page.tsx` — lock/unlock + Mulai button

## Phase Arena QA 2B — Security, Progress, XP, Production Hardening (June 29, 2026)

### What
Security audit + hardening for all Jalur Cerdas APIs and UI. Fixed XP farming, isi_blank UX, and TS build errors.

### Vulnerabilities Found & Fixed
| Issue | Severity | Fix |
|-------|----------|-----|
| **XP farming** — progress route awarded 10 XP per incomplete attempt | High | Removed all XP for incomplete. Only first completion (≥70%) awards 50 XP + 10 coins. Replay = 0 XP. |
| **isi_blank no submit button** — user had to press Enter, confusing on mobile | Medium | Added "Kirim" button next to input |
| **`xpAwarded` wrong field** in `arena/page.tsx` | Low | Fixed to `xpEarned` |

### Tests Created
- `scripts/test-jalur-leakage.ts` — tests sanitization logic (366 questions, 0 leaked)
- `scripts/validate-jalur-questions.ts` — validates all question content

### Results
| Check | Result |
|-------|--------|
| `npm run test:jalur-leakage` | ✅ 0 leaked fields |
| `npm run validate:jalur-questions` | ✅ 366 questions, 0 issues |
| `npm run validate:learning-content` | ✅ 24 levels, 143 units |
| `npm run tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ 268 pages |

### Remaining Issues
1. **6 units with ≤3 questions** — low count, should expand to 5+
2. **No loading skeleton** for unit detail page
3. **No question transition animation**

## Phase Arena 2C — Micro Lessons (June 29, 2026)

### What
Duolingo-style micro lessons before practice for all 72 JALUR units. Each unit now has: summary, explanation, examples, tips, and beforePracticePrompt — stored in existing `LearningUnit.content.lesson` JSON (no migration).

### Level Bands
| Band | Levels | Units | UX |
|------|--------|-------|----|
| **Dasar** | L1-4 | 24 | Large fonts, 2-3 sentence explanations, simple examples, child-friendly copy |
| **Menengah** | L5-8 | 24 | Medium fonts, 3-5 sentence explanations, some reasoning |
| **Tinggi** | L9-12 | 24 | Normal fonts, detailed explanations, paragraph-based examples, context/strategy |

### Lesson Phase
- Added to existing lesson engine: Intro → **Lesson Material** → Questions → Result → Complete
- Material cards: summary, explanation, examples, tips, "Mulai Latihan" CTA
- Questions (366) preserved intact — no changes to question data

### Verification
| Check | Result |
|-------|--------|
| `npm run validate:jalur-lessons` | ✅ 72/72 lessons valid |
| `npm run validate:jalur-questions` | ✅ 366 questions preserved |
| `npm run test:jalur-leakage` | ✅ 0 leaked fields |
| `npm run validate:learning-content` | ✅ 24 levels, 143 units |
| `npx tsc --noEmit` | ✅ 0 errors |
| Backup | 67 tables, 386 rows |

### Relevant Files
- `scripts/seed-jalur-micro-lessons.ts` — seeds 72 micro lessons
- `scripts/validate-jalur-lessons.ts` — lesson validator
- `app/api/jalur-cerdas/[unitId]/route.ts` — added `lesson` field to response
- `app/arena/jalur-cerdas/[unitId]/lesson/page.tsx` — lesson phase + levelBand styling + isi_blank submit button
- `package.json` — added `seed:jalur-lessons`, `seed:jalur-lessons:dry-run`, `validate:jalur-lessons`

## Phase Build Hardening 1 — Google Fonts Dependency Removed (June 29, 2026)

### What
Removed Google Fonts build-time dependency. Build was intermittently failing when Google Fonts API was unreachable.

### Changes
| Before | After |
|--------|-------|
| `next/font/google` (Inter, Playfair_Display) — downloaded at build time | Removed completely |
| Google Fonts `<link>` tags in `<head>` | Removed (no runtime dependency) |
| CSS variables `--font-inter`, `--font-playfair` | Removed |
| Tailwind `sans: ["Inter", "system-ui", "sans-serif"]` | `sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "\"Segoe UI\"", "sans-serif"]` |
| Tailwind `display: ["Playfair Display", "Georgia", "serif"]` | `display: ["Georgia", "Cambria", "\"Times New Roman\"", "serif"]` |

### Font Strategy
- **Sans** (`font-sans`): Inter (if installed) → system-ui → -apple-system → Segoe UI → system sans-serif
- **Display** (`font-display`): Georgia → Cambria → Times New Roman → system serif
- Zero external font downloads at build or runtime
- Graceful degradation — best available system font used

### Verification
| Check | Result |
|-------|--------|
| `grep -R "next/font/google" app components lib` | ✅ 0 matches |
| `grep -R "fonts.googleapis.com" app components` | ✅ 0 matches |
| `npx prisma validate` | ✅ Valid |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ 268 pages |
| Visual impact | Minimal — Inter/Playfair fallback to system equivalents |

## Phase UKBI/TKA FOUNDATION 2D — Structural Validator & Quality Auditor (June 29, 2026)

### What
Read-only structural validator and quality auditor for UKBI/TKA question banks. Validates `correctAnswer ∈ options[].id`, no orphan PaketKompetensi references, no duplicate options, no answer leakage.

### Scripts Created
| Script | Purpose |
|--------|---------|
| `scripts/validate-ukbi-tka-question-structure.ts` | 342 structural checks (UKBI: 158, TKA: 159, Paket: 25) |
| `scripts/audit-ukbi-tka-question-quality.ts` | 14 quality metrics (distributions, verification rates, recommendations) |
| `scripts/fix-ukbi-tka-structure-safe.ts` | Dry-run by default, `--execute` to apply. Fixes: correctAnswer not in options, duplicate option IDs, weight=0. |

### Existing Script Updated
| Script | Changes |
|--------|---------|
| `scripts/audit-question-data.ts` | Added `correctAnswer ∈ options[].id` validation for UKBI/TKA. Added option ID uniqueness check. |

### Bug Found & Fixed
- **TKA question `cmqy221c`**: Duplicate option text "Nasehat" at indices 0 and 3 (A and D). Correct answer was B ("Nasihat"). Fixed D → "Nesihat" via manual fix.

### Key Design Decisions
1. **Fuzzy similarity NOT in structural validator**: Year-based options ("Tahun 2005" vs "Tahun 2009") and punctuation variants are legitimate MCQs. Only exact text duplicates are structural failures.
2. **Explanations are optional**: Required/optional is a content decision, not a structural one. Not checked.
3. **Fixer handles IDs, not texts**: Duplicate option IDs can be renamed programmatically. Duplicate texts need human review.

### Verification
| Check | Result |
|-------|--------|
| `npm run validate:ukbi-tka-structure` | ✅ 342/342 passed |
| `npm run audit:ukbi-tka-quality` | ✅ 18 good, 10 warnings, 1 info |
| `npm run audit:question-data` | ✅ 20 checks (correctAnswer in options: 50/50 UKBI, 50/50 TKA) |
| `npm run test:bank-soal-leakage` | ✅ 8/8 |
| `npm run test:murid-quiz-leakage` | ✅ 9/9 |
| `npm run test:jalur-leakage` | ✅ 366/366 |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ 268 pages |
| `npx prisma validate` | ✅ Valid |

## Phase QA STABILIZATION 1 — Timeout Fix & Audit Consolidation (June 29, 2026)

### What
Fixed timeout hangs in 6 QA scripts, fixed 1 false-positive audit check, and stabilized the full 17-script QA chain.

### Root Cause
All 4 scripts importing `lib/security.ts` (which imports `next/server`) had `process.exit(1)` on failure but **no `process.exit(0)` on success**. When all tests passed, Node kept the event loop open because `next/server` registers open handles. The process never exited, causing the bash tool to time out at 60s.

### Files Fixed
| File | Fix |
|------|-----|
| `scripts/test-ukbi-tka-session-snapshot.ts` | Added `process.exit(0)` after success summary |
| `scripts/test-ukbi-tka-per-attempt-snapshot.ts` | Added `process.exit(0)` after success summary |
| `scripts/audit-ukbi-tka-snapshot-integrity.ts` | Added `process.exit(0)` in PASSED branch; fixed false-positive pattern `questionSnapshot: {` → `questionSnapshot:` |
| `scripts/audit-ukbi-tka-attempt-history.ts` | Added `process.exit(0)` in PASSED branch |

### Verification
| Check | Result |
|-------|--------|
| test:jalur-leakage | ✅ PASS |
| validate:jalur-questions | ✅ 366 questions |
| validate:learning-content | ✅ All passed |
| test:bank-soal-leakage | ✅ 8/8 |
| test:murid-quiz-leakage | ✅ 9/9 |
| test:ukbi-tka-randomization | ✅ 27/27 |
| test:ukbi-tka-session-snapshot | ✅ 32/32 |
| test:ukbi-tka-per-attempt-snapshot | ✅ 42/42 |
| validate:ukbi-tka-structure | ✅ ALL 342 PASSED |
| audit:ukbi-tka-quality | ✅ Complete |
| audit:ukbi-tka-snapshot | ✅ 21/21 (was 20/21 with false positive) |
| audit:ukbi-tka-attempt-history | ✅ 19/19 |
| audit:ukbi-tka-randomization | ✅ Healthy |
| audit:question-data | ✅ Complete |
| test:bigt-menu | ✅ 20/20 |
| test:dokumen-latihan-sanitization | ✅ 10/10 |
| test:simulation-workflow | ✅ 45/45 |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ 268 pages |

### Key Design Decisions
1. **process.exit(0) not process.exit(0)** — scripts are test/audit runners, not servers. Force-exit is safe and avoids event-loop leaks.
2. **False positive fix**: Pattern `questionSnapshot: {` didn't match actual code `questionSnapshot: JSON.parse(JSON.stringify({` — relaxed to `questionSnapshot:`.
3. **No logic changes** — all 6 files only got process exit fixes; zero test assertions changed.

## Phase SIMULASI WORKFLOW 1A — Sidebar UKBI/TKA + BIGT Page + Dokumen Hasil Latihan UI (June 29, 2026)

### What
Built complete simulation workflow UI for murid and guru: simulation entry pages, dokumen hasil latihan, BIGT referral page, and cleaned sidebar terminology.

### Changes
| File | Action |
|------|--------|
| `components/dashboard/MuridSidebar.tsx` | Changed `/murid/sertifikat` → `/murid/dokumen-latihan` |
| `components/dashboard/GuruSidebar.tsx` | Changed `/guru/sertifikat` → `/guru/dokumen-latihan`; removed "Sertifikat" from Kompetensi section |
| `app/(dashboard)/murid/dokumen-latihan/page.tsx` | Created — Dokumen Hasil Latihan page (reuses CertificatePreview) |
| `app/(dashboard)/guru/dokumen-latihan/page.tsx` | Created — Dokumen Latihan Murid page (reuses GuruCertificatePreview) |
| `app/(dashboard)/murid/sertifikat/page.tsx` | Changed to redirect → `/murid/dokumen-latihan` |
| `app/(dashboard)/guru/sertifikat/page.tsx` | Changed to redirect → `/guru/dokumen-latihan` |
| `app/(dashboard)/guru/hasil-simulasi/client.tsx` | Changed link from `/guru/sertifikat` → `/guru/dokumen-latihan` |
| `scripts/test-phase-simulation-workflow.ts` | Updated route assertions to match new paths |
| `scripts/test-simulation-workflow.ts` | Created — 45 tests for sidebar/routes/BIGT/terminology |
| `scripts/test-dokumen-latihan-sanitization.ts` | Created — 10 tests for answer leakage prevention |
| `scripts/test-bigt-menu.ts` | Created — 20 tests for BIGT menu/page/link |
| `package.json` | Added `test:bigt-menu`, `test:dokumen-latihan-sanitization` |

### Sidebar Menus (After)

**MuridSidebar:**
| Label | Route |
|-------|-------|
| Beranda | `/murid/beranda` |
| Jalur Cerdas | `/arena/jalur-cerdas` |
| Tugasku | `/murid/tugasku` |
| Simulasi ▸ Simulasi UKBI | `/murid/simulasi/ukbi` |
| Simulasi ▸ Simulasi TKA | `/murid/simulasi/tka` |
| Dokumen Hasil Latihan | `/murid/dokumen-latihan` |
| BIGT | `/murid/bigt` |

**GuruSidebar:**
| Label | Route |
|-------|-------|
| Simulasi ▸ Simulasi UKBI | `/guru/simulasi/ukbi` |
| Simulasi ▸ Simulasi TKA | `/guru/simulasi/tka` |
| Hasil Murid | `/guru/hasil-simulasi` |
| Dokumen Latihan Murid | `/guru/dokumen-latihan` |
| BIGT | `/guru/bigt` |

### Terminology Compliance
- "Dokumen Hasil Latihan" replaces "Sertifikat" everywhere
- "Dokumen Hasil Latihan BahasaCerdas" as document title
- Disclaimer: "Dokumen ini adalah hasil latihan/simulasi di BahasaCerdas dan bukan sertifikat resmi UKBI/TKA dari lembaga pemerintah."
- No "sertifikat resmi" in any UI text

### BIGT Page (Shared Component)
- `components/bigt/BigtInfoPage.tsx` — explains BC vs BIGT difference, lists BIGT features
- External link to `https://www.bahasacerdas.site` with `target="_blank"` and `rel="noopener noreferrer"`
- No iFrame, no auth/session sharing between BC and BIGT

### Verification
| Check | Result |
|-------|--------|
| `npm run test:simulation-workflow` | ✅ 45/45 |
| `npm run test:dokumen-latihan-sanitization` | ✅ 10/10 |
| `npm run test:bigt-menu` | ✅ 20/20 |
| `npm run validate:ukbi-tka-structure` | ✅ 342/342 |
| `npm run audit:ukbi-tka-quality` | ✅ 18 good, 10 warnings |
| `npm run test:ukbi-tka-per-attempt-snapshot` | ✅ 42/42 |
| `npm run test:ukbi-tka-session-snapshot` | ✅ 32/32 |
| `npm run test:ukbi-tka-randomization` | ✅ 27/27 |
| `npm run test:murid-quiz-leakage` | ✅ 9/9 |
| `npm run test:bank-soal-leakage` | ✅ 8/8 |
| `npm run test:jalur-leakage` | ✅ 366/366 |
| `npm run validate:learning-content` | ✅ 24 levels, 143 units |
| `npx prisma validate` | ✅ Valid |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ 268 pages |**


