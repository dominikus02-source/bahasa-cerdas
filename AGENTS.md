<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# BahasaCerdas Project Status
## Last Updated: May 26, 2026 (Social features + notification system complete)

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
- IP: ***REMOVED-VPS-IP***, Ubuntu 22.04
- SSH password: ***REMOVED-SSH-PASSWORD***
- PostgreSQL running on port 5432
- Node.js 20, PM2 installed
- Game server deployed to /var/www/game-server/game-server
- NGINX configured for game.bahasacerdas.site → port 3001
- Database: bahasacerdas, user: bahasa, password: ***REMOVED-DB-PASSWORD***
- SSH currently unreachable (server restarting after manual reboot from Hostinger console)
- VPS needs: certbot for SSL, game question seeding, PM2 startup on boot

### Supabase (Auth only)
- URL: https://***REMOVED-SUPABASE-REF***.supabase.co
- ANON_KEY: ***REMOVED-ANON-KEY***
- SERVICE_ROLE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidGxob29jYW9vcGd0Y3NudnpyIiwicm9sZSI6InNlcnZpY2Utcm9sZSIsImlhdCI6MTc3NzQ5NDI1NiwiZXhwIjoyMDkzMDcwMjU2fQ.PjBT8h7bN-W5L5E8Cq5mF1aW2dR4vK9xXyZ3nB6mC8g

### Environment Variables
- DATABASE_URL: postgresql://bahasa:***REMOVED-DB-PASSWORD***@***REMOVED-VPS-IP***:5432/bahasacerdas
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (see above)
- NEXT_PUBLIC_SITE_URL: https://bahasacerdas.com
- NEXT_PUBLIC_GAME_SERVER_URL: https://game.bahasacerdas.com
- MIDTRANS_SERVER_KEY: [REDACTED]
- NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: ***REMOVED-MIDTRANS-CLIENT-KEY***
- NEXT_PUBLIC_MIDTRANS_MERCHANT_ID: ***REMOVED-MIDTRANS-MERCHANT-ID***
- ANTHROPIC_API_KEY: sk-ant-api03-xxxxxxx (placeholder)
- DEEPSEEK_API_KEY, GROQ_API_KEY (AI generation)
- SUPABASE_SERVICE_ROLE_KEY for storage management API

### DNS
- Main site: bahasacerdas.com → Vercel (live, nameservers ns1/ns2.vercel-dns.com)
- Game subdomain: game.bahasacerdas.com → ***REMOVED-VPS-IP*** (A record)
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

### Buku Panduan Guru (Grade-Based Content) — New
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

## Langkah 3 — Arena Matchmaking & Ruang Tugas — May 23, 2026

### Auto-Matchmaking (Adu Cepat)
- Full flow: Cari Lawan → Searching → Match Found → Countdown 3-2-1 → Battle → Result + XP → Main Lagi
- Page: `/arena/game/adu-cepat` (client component)
- Game server: added `join-queue`, `leave-queue`, `rematch` events + matchmaking queue + auto room creation
- Socket client: added `onMatchFound`, `onMatchCountdown`, `onQueueStatus`, `onQueueTimeout`, `joinQueue`, `leaveQueue`, `rematch`
- Game hub: added "Adu Cepat" card as first option with hot badge
- Reuses existing GamePlay component during battle
- Server deployment: `bash scripts/deploy-game-server.sh` (requires SSH access to VPS)

#### Content Writing Convention (Belajar Page)
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

## Perbaikan Game Pages
- Added `.game-fullscreen` CSS class: expands main container, hides bottom nav for game pages
- All 4 game wrappers (kuis-tempur, tebak-kata, susun-kata, katastra) use consistent back button style
- Katastra: now renders in Arena (no redirect), fixed mobile layout (grid rewards, compact sizing)

### Ruang Tugas
- Page: `/arena/tugas` with 3 tabs (Tersedia/Dikerjakan/Selesai)
- Card on Beranda: `TugasCard` component showing pending assignment count
- Links to existing `/murid/tugasku/[id]/take` and `/murid/tugasku/[id]/result`
- API: reuses existing `/api/murid/tugas`

### Duplicate Misi
- Removed Misi from quick actions (kept in quest progress card which shows progress bars)
### Database
- New: `StudentKarya` model (PUISI, CERPEN, ARTIKEL, ANEKDOT, PANTUN, OPINI) — separate from marketplace Karya
- New: `StudentKaryaLike` + `StudentKaryaComment` models
- New: `CoinTransaction` model (track all coin earnings/spending)
- New: `DailyQuest` model (MENULIS, MENGOMENTARI, MEMBERI_LIKE quests)
- New: `StoreItem` model (7 items: Streak Freeze, XP Boost, Avatar Frames, Theme, Stickers)
- New: `UserItem` model (purchased items inventory)
- User model: added `coins`, `totalLikes`, `totalViews` fields

### API Routes (Student Karya)
- `POST /api/siswa/karya` — create + award +10 coins + track MENULIS quest
- `GET /api/siswa/karya` — paginated feed, filter by type, infinite scroll
- `GET /api/siswa/karya/[id]` — detail with comments, auto-increment views
- `POST /api/siswa/karya/[id]/like` — toggle like + award +2 coins to author + track MEMBERI_LIKE quest
- `POST /api/siswa/karya/[id]/comment` — add comment + award +1 coin + track MENGOMENTARI quest
- `GET /api/siswa/user/[id]/karya` — user's karya list (paginated)

### API Routes (Coin Cerdas)
- `GET /api/siswa/quest` — daily quests + auto streak tracking
- `POST /api/siswa/quest/claim` — claim quest reward
- `GET /api/siswa/store` — list store items
- `POST /api/siswa/store/buy` — purchase item (spends coins)
- `GET /api/siswa/transactions` — coin transaction history
- `GET /api/siswa/league` — weekly league ranking (30 peers, promote/demote)

### Pages (Langkah 2)
- `/murid/beranda` — **Home Feed**: compact stats header (XP, streak, coins, level), league widget, quest/store quick links, category tabs (Semua/Puisi/Cerpen/Artikel/Anekdot/Pantun), infinite scroll feed with author + excerpt + stats
- `/murid/profile` — **Portofolio**: cover + avatar, stats (karya count, likes, views, XP, coins), karya grid (Behance-style cards), prestasi tab
- `/murid/karya/[id]` — **Detail**: author info, full content, like/comment bar, comments section
- `/murid/karya/tulis` — **Editor**: type selector (6 types with emoji), title input, content textarea, cover image URL, submit button
- `/murid/kuest-harian` — **Daily Quests**: streak card, progress bar, quest list with progress bars, coin earning guide
- `/murid/toko-koin` — **Coin Store**: coin balance, item cards with buy buttons, canAfford check

### Scoring System (May 25, 2026)
- **NilaiKategori model** (groupId, nama, bobot) + **Nilai model** (userId, kategoriId, skor, sumberType, sumberId)
- **Feed karya grading**: ⭐ Nilai button on each karya card → modal grading → saves to Nilai
- **Bulk input**: `/guru/penilaian/input-massal` — table of students → fill scores → Simpan Semua
- **Kuis manual grading**: `/guru/penilaian/kuis` — review submitted answers → mark correct → update QuizAnswer
- **Rapor siswa**: `/guru/penilaian/rapor` — per-kategori scores + predikat A-E + printable layout
- **Dashboard widget**: Beranda Guru — rata-rata per kategori + "blm dinilai" count
- **Sidebar**: sub-links Input Massal, Nilai Kuis, Rapor under Penilaian

### Bank Soal Improvements (May 26, 2026)
- AI generate form: added Kesulitan (Mudah/Sedang/Sulit) + KD dropdown
- Manual create soal form (PG): collapsible inline form with options + correct answer radio
- Topik field merged into Deskripsi on SoalSet (removed redundancy)
- "Lihat Soal" link after AI generation

### Featured System (May 26, 2026)
- `PATCH /api/siswa/karya/[id]` — toggle `isFeatured` flag (GURU only)
- Guru feed-karya card + modal: tombol bintang "Pilih" / "Pilihan"
- Murid beranda: "Karya Pilihan" section (already existed)

### Notification System (May 26, 2026)
- Like route → creates Notifikasi `"LIKE"` to karya author
- Comment route → creates Notifikasi `"COMMENT"` to karya author
- NotificationBell component added to Murid sidebar
- Existing: Notifikasi model, CRUD API, guru notification page, arena notification page

### Utility
- `lib/coins.ts` — awardCoins(), spendCoins(), getBalance(), getTransactions(), getOrCreateDailyQuests(), trackQuestProgress(), claimQuestReward(), trackDailyStreak()

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

## Uncommitted Changes (git status)
- modified: AGENTS.md (updated progress)

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
- VPS game server: /var/www/game-server/game-server on ***REMOVED-VPS-IP***
- Prisma schema: prisma/schema.prisma (main project)
- Game server schema: /var/www/game-server/prisma/schema.prisma
- Social/coins utility: lib/coins.ts
- Student karya pages: app/(dashboard)/murid/karya/
- Buku Panduan seed: scripts/seed-panduan.ts
- Buku Panduan browse: app/(dashboard)/guru/panduan-guru/page.tsx
- Gradebook: app/(dashboard)/guru/gradebook/page.tsx
- Assign API: app/api/guru/penugasan/route.ts
- Student penugasan API: app/api/murid/penugasan/route.ts

## Materi Content System
- **Per-unit files**: `scripts/seed/materi/26-laporan-percobaan.ts` etc — each unit in own file, independently editable
- **Shared types**: `scripts/seed/materi/types.ts` (Konten, Soal, makeSoal)
- **Master seed**: `scripts/seed/seed-materi.ts` — looks up each unit by title + grade + semester in DB, updates its content JSON
- **Flow**: edit unit file → `npx tsx scripts/seed/seed-materi.ts` → refresh browser
- **Lookup**: Now uses `{ title, grade, semester, isActive }` to avoid title conflicts (e.g., "Bab 3: Drama" in both VIII S2 and IX S2)
- Seed does NOT drop/recreate units — only updates `content` field of matching titles
- To add new units, create a new file in `scripts/seed/materi/`, import it, and add to the `units` array with grade/semester
- Belajar page uses `app/arena/jalur-cerdas/[unitId]/belajar/page.tsx` with Duolingo-style UI: sticky progress bar, content-type detection (✓/✗/numbered/bullet/⚠️/[Ilustrasi: ...]), card-by-card flow, animated transitions

### Grade IX Content (Enriched — May 25, 2026)
- **Semester 1**: 6 units — Laporan Percobaan, Pidato Persuasif, Cerpen, Teks Tanggapan, Teks Diskusi, Puisi
- **Semester 2**: 6 units — Teks Eksplanasi, Laporan, Drama, Resensi, Artikel, Karya Tulis Ilmiah
- Each unit: 4+ materi sections with [Ilustrasi: ...], 10 latihan, 10 kuis, praktik with tips
- Files: `scripts/seed/materi/26-*.ts` through `37-*.ts`
- Grade VII/VIII content remains enriched from previous session