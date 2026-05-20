<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# BahasaCerdas Project Status
## Last Updated: May 20, 2026

## Goal
Build BahasaCerdas educational platform with video learning, teacher upload workflows, marketplace, Kuis Battle multiplayer game, UKBI/TKA simulation, class management, and community system.

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

## Prisma Schema
- 50+ models including User, Profile, UKBIQuestion, TKAQuestion, PaketKompetensi, ProgresKompetensi, KompetensiCertificate, TestSession, TestAnswer, Video, CoursePlaylist, Materi, BankSoal, RPP, Karya, Pembelian, Group, GroupMember, Community, GameRoom, GameSession, GameResult, etc.
- 20+ enums

## Next Steps (Priority Order)

1. **Reconnect to VPS** — SSH via Hostinger console if SSH still down, then:
   - systemctl start postgresql
   - pm2 start game-server
   - ss -tlnp | grep -E '5432|3001'

2. **Fix DNS for game.bahasacerdas.com** — wait for propagation or re-verify A record

3. **Run certbot on VPS** — sudo certbot --nginx -d game.bahasacerdas.com

4. **Seed game questions on VPS** — cd /var/www/game-server && npx prisma db seed

5. **Fix game server startup** — ensure PM2 starts game-server on boot: pm2 startup && pm2 save

6. **Test full game flow** — create room → join via code → play → results

7. **Fix uncommitted changes** — game-server/src/server.ts, next.config.ts, package.json modified; apps/api deleted; package-lock.json added

8. **Redeploy to Vercel** — git push after fixes

9. **Verify 413 fix in production** — deploy changes, then test uploading a large PPTX/PDF (>5MB) to admin materi page

## Recent Progress (May 20, 2026)

### Bugs Fixed
- **Timer auto-submit side effect** — Removed `handleSubmitRef.current(true)` from inside `setTimeLeft` updater function in `app/(dashboard)/kompetisi/[paketId]/page.tsx`. Now uses a separate `useEffect` watching `timeLeft` to trigger auto-submit, with `timerStartedRef` guard to prevent initial-mount false trigger.
- **Guru package fallback** — Added `!paket.type.includes("GURU")` guard to the third fallback in `app/api/kompetensi/[paketId]/route.ts` (line 155). Prevents serving completely wrong questions (e.g., LITERASI_MEMBACA questions in "Pedagogik" section) when no Guru-level questions match.
- **SD question ambiguity** — Clarified question text in `prisma/seed-kompetensi-sd.ts` from "Penulisan kata ulang yang benar adalah?" to "Penulisan kata ulang yang benar di awal kalimat adalah?" to disambiguate between capitalized and lowercase options.

### New Content
- **20 UKBI Guru questions** added to `prisma/seed-kompetensi-guru.ts`: 5 MENDENGARKAN (pedagogical context), 8 MERESPONS_KAIDAH (academic writing), 7 MEMBACA (professional reading)
- **16 TKA Guru questions** added to `prisma/seed-kompetensi-guru.ts`: 8 PEDAGOGIK (learning theories, teaching models, assessment, classroom management, curriculum) and 8 PROFESIONAL (SNP, PKB, TPACK, education law, Merdeka Belajar)
- **Package updates**: `totalQuestions` corrected for all 4 Guru packages (UKBI_GURU_SIMULASI: 17, TKA_GURU_SIMULASI: 16, UKBI_GURU_LATIHAN: 8, TKA_GURU_LATIHAN: 8). Section counts aligned with actual available questions.

## Blockers
- VPS SSH unreachable (server restarting)
- game.bahasacerdas.com DNS not propagating/resolving
- No SSL cert on game subdomain

## Uncommitted Changes (git status)
- modified: lib/upload.ts
- new: app/api/admin/configure-storage/route.ts
- modified: app/(dashboard)/admin/materi/generate-ppt/page.tsx
- modified: app/(dashboard)/kompetisi/[paketId]/page.tsx (timer fix)
- modified: app/api/kompetensi/[paketId]/route.ts (Guru fallback fix)
- modified: prisma/seed-kompetensi-sd.ts (SD question fix)
- modified: prisma/seed-kompetensi-guru.ts (36 new Guru questions + package updates)
- modified: game-server/src/server.ts
- modified: next.config.ts
- modified: package.json
- deleted: apps/api/* (old API server, removed)
- deleted: pnpm-lock.yaml, pnpm-workspace.yaml
- new: package-lock.json
- modified: AGENTS.md

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
- Socket server: game-server/src/server.ts
- Socket client: lib/game/socket.ts
- Game components: components/game/GameLobby.tsx, GamePlay.tsx