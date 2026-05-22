<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# BahasaCerdas Project Status
## Last Updated: May 22, 2026

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

## Prisma Schema
- 55+ models including User, Profile, UKBIQuestion, TKAQuestion, PaketKompetensi, StudentKarya, StudentKaryaLike, StudentKaryaComment, CoinTransaction, DailyQuest, StoreItem, UserItem, etc.
- 20+ enums

## Langkah 1 Complete (Schema + API) — May 22, 2026
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

### Utility
- `lib/coins.ts` — awardCoins(), spendCoins(), getBalance(), getTransactions(), getOrCreateDailyQuests(), trackQuestProgress(), claimQuestReward(), trackDailyStreak()

## Next Steps (Priority Order)

1. **Deploy to Vercel** — git push uncommitted changes, redeploy to verify all new pages
2. **Test full flow** — register murid → tulis karya → feed → like → comment → quest progress → koin → beli item → league
3. **Guru-side social features** — guru dashboard juga perlu lihat feed karya murid, bisa like/comment
4. **Featured system** — implement `isFeatured` flag + admin picks for "Karya Pilihan Hari Ini"
5. **Notification system** — notif when someone likes/comments on your karya
6. **Coin earning for guru** — what actions earn coins for teachers?
7. **Game server fixes** — VPS reconnection, DNS, SSL

## Blockers
- VPS SSH unreachable (server restarting)
- game.bahasacerdas.com DNS not propagating/resolving
- No SSL cert on game subdomain

## Uncommitted Changes (git status)
- modified: prisma/schema.prisma (new models: StudentKarya, StudentKaryaLike, StudentKaryaComment, CoinTransaction, DailyQuest, StoreItem, UserItem + User fields)
- new: app/api/siswa/karya/route.ts
- new: app/api/siswa/karya/[id]/route.ts
- new: app/api/siswa/karya/[id]/like/route.ts
- new: app/api/siswa/karya/[id]/comment/route.ts
- new: app/api/siswa/user/[id]/karya/route.ts
- new: app/api/siswa/quest/route.ts
- new: app/api/siswa/quest/claim/route.ts
- new: app/api/siswa/store/route.ts
- new: app/api/siswa/store/buy/route.ts
- new: app/api/siswa/transactions/route.ts
- new: app/api/siswa/league/route.ts
- new: lib/coins.ts
- new: scripts/seed-store.ts
- new: app/(dashboard)/murid/karya/[id]/page.tsx
- new: app/(dashboard)/murid/karya/tulis/page.tsx
- new: app/(dashboard)/murid/kuest-harian/page.tsx
- new: app/(dashboard)/murid/toko-koin/page.tsx
- modified: app/(dashboard)/murid/beranda/page.tsx (social feed + league widget)
- modified: app/(dashboard)/murid/profile/page.tsx (karya grid + coins)
- modified: app/(dashboard)/murid/layout.tsx (sidebar nav additions)

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