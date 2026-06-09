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
## Last Updated: June 9, 2026 (Security hardening: Redis cache, cursor pagination, AI queue, ACID tx, Supabase Realtime, Sentry, BFG history scrub)

## Goal
Transform BahasaCerdas into a social-creative platform for Bahasa Indonesia where students write daily (puisi, cerpen, artikel, anekdot, pantun), showcase works in social-style portfolios, earn Coin Cerdas, and compete in weekly leagues — UKBI/TKA as supporting features, not core.

## Tech Stack
- Next.js 16.2.6 with TypeScript, App Router, Tailwind CSS
- Supabase for auth + PostgreSQL (VPS self-hosted for game system)
- Game server: Socket.io on VPS port 3001, NGINX reverse proxy
- Midtrans for payment
- Prisma ORM with PostgreSQL
- Vercel for frontend, Hostinger VPS for game backend + database
- Guru color: emerald/green, Murid color: violet/purple

## Critical Context

### VPS (Hostinger)
- IP: [lihat password manager]
- SSH password: [lihat password manager]
- Database: bahasacerdas, user: bahasa, password: [lihat .env]

### Supabase
- URL: [lihat .env / Supabase dashboard]
- ANON_KEY: [lihat .env]
- SERVICE_ROLE_KEY: [lihat .env - JANGAN pernah di-commit]

### Environment Variables
- DATABASE_URL: [set via .env, lihat vault]
- NEXT_PUBLIC_SUPABASE_URL: [lihat Supabase dashboard]
- NEXT_PUBLIC_SUPABASE_ANON_KEY: [lihat Supabase dashboard]
- NEXT_PUBLIC_SITE_URL: https://bahasacerdas.com
- NEXT_PUBLIC_GAME_SERVER_URL: https://game.bahasacerdas.com
- MIDTRANS_SERVER_KEY: [lihat Midtrans dashboard → Settings → Access Keys]
- NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: [lihat Midtrans dashboard → Settings → Access Keys]
- NEXT_PUBLIC_MIDTRANS_MERCHANT_ID: [lihat Midtrans dashboard]
- ANTHROPIC_API_KEY: [set jika diperlukan]
- DEEPSEEK_API_KEY: [set jika diperlukan]
- GROQ_API_KEY: [set jika diperlukan]
- SUPABASE_SERVICE_ROLE_KEY: [lihat Supabase dashboard — simpan aman]

### DNS
- Main site: bahasacerdas.com → Vercel (live, nameservers ns1/ns2.vercel-dns.com)
- Game subdomain: game.bahasacerdas.com → [lihat Hostinger VPS dashboard] (A record)
- game.bahasacerdas.com currently not resolving (DNS or server issue)

### Game Server (VPS)
- Location: /var/www/game-server/game-server on VPS
- Entry: src/server.ts (Socket.io, port 3001)
- Prisma schema in game-server/prisma/schema.prisma (separate from main project)
- PM2 process name: needs check (run `pm2 list` on VPS)
- VPS Prisma version: 5.22.0
- Main project Prisma version: 5.22.0
- Bug fixed: PORT parseInt, let code, data.answerIndex, q:any, newHost check

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

## Pitch Deck & Financials (May 27, 2026)
- `pitch-deck.html` — 14-slide English HTML pitch deck
- `Bahasacerdas_Pitch_Deck.pptx` — 12-slide PPTX (dark theme, premium)
- `bikin_deck.py` — Python PPTX generator
- `BahasaCerdas Final Pitch Deck-fixed.py` — user's alternate PPTX generator
- `2-bahasacerdas_financial_plan_fixed.html` — detailed revenue model & financial plan
- `Bahasacerdas_Financial_Plan.pdf` — PDF export of financial plan
- **Key numbers**: Seed Rp 4B, Pre-money Rp 18B, Equity 18.2%, M18 run-rate Rp 3.14B/mo, ARR Y1 Rp 5.76B → Y2 Rp 24B → Y3 Rp 80B, Gross margin 90.1%
- **File locations**: `/Users/user/Documents/bahasa-cerdas/` for main files, `/Users/user/Documents/BC-Bahasa Cerdas Master/Financial BC/` for financial model

## Next Steps (Priority Order)
1. **Enrich content** — isi lebih banyak latihan/kuis soal ke setiap bab (saat ini minimal 2-3 per bab)
2. **Guru video content** — upload video pembelajaran, embed YouTube
3. **Game server fixes** — VPS reconnection, DNS, SSL (blocked by VPS SSH)
4. **Push notifications** — browser push API for notif when tab not open
5. **Admin dashboard** — featured picks curation, user management

## Blockers
- VPS SSH unreachable (server restarting)
- game.bahasacerdas.com DNS not propagating/resolving
- No SSL cert on game subdomain

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
- VPS game server: /var/www/game-server/game-server on [lihat Hostinger VPS dashboard]
- Prisma schema: prisma/schema.prisma (main project)
- Game server schema: /var/www/game-server/prisma/schema.prisma
- Social/coins utility: lib/coins.ts
- Student karya pages: app/(dashboard)/murid/karya/
- Buku Panduan seed: scripts/seed-panduan.ts
- Pitch deck generator: bikin_deck.py
- Financial model: /Users/user/Documents/BC-Bahasa Cerdas Master/Financial BC/

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
