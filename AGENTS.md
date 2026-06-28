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
## Last Updated: June 28, 2026 (Phase 8C: DB Migration & Content Recovery)

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

## Next Steps (Priority Order)
1. **Game server revival** — find new hosting for game.bahasacerdas.com (VPS or alternative)
2. **Push notifications** — browser push API for notif when tab not open
3. **Old standalone routes** — migrate `/api/ai/eyd`, `/api/ai/feedback`, `/api/ai/grading`, `/api/ai/text-analysis` to central runner
4. **Phase 9 monetization** — NOT yet started. See docs/AI_AGENT_LAYER_PLAN.md for readiness details.
5. **Content enrichment** — add more latihan/kuis to each bab (ongoing)

## Blockers
- Game server dead (VPS Hostinger expired) — all multiplayer games broken
- Pre-existing `docx/route.ts(111,1)` syntax error on main branch (unrelated to Phase 8C)

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
