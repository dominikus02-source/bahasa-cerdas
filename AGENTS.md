<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# BahasaCerdas Project Status
## Last Updated: May 2026

## Goal
Build BahasaCerdas educational platform with video learning, teacher upload workflows, marketplace, financial system, and UKBI/TKA simulation based on Kemdikbud standards.

## Tech Stack
- Next.js 15.1.0 with TypeScript
- Tailwind CSS for styling
- Supabase for auth/database + file storage
- Midtrans for payment (Xendit removed)
- Prisma ORM with PostgreSQL

## Color Theme
- Guru = emerald/green theme
- Murid = violet/purple theme

## Key Constraints
- Video storage: YouTube/Vimeo embed URL (no local video storage)
- Marketplace: 3 free uploads, premium = unlimited
- Finance: 80% seller, 20% platform commission
- UKBI: 5 sections (Mendengarkan, Merespons Kaidah, Membaca, Menulis, Berbicara)
- TKA Guru: 4 competencies (Pedagogik, Profesional, Sosial, Kepribadian)
- Resend API key needed in .env for email delivery after marketplace purchase

## Database Models (Prisma)
- User, Profile, Video, CoursePlaylist, Materi, BankSoal, RPP, Karya, Pembelian, PurchaseHistory, SellerEarning, Withdrawal, QuizSession, Certificate, KoleksiKata, Lomba, LombaPeserta, AIUsage, Transaksi, Notifikasi
- UKBIQuestion, TKAQuestion, PaketKompetensi, ProgresKompetensi, KompetensiCertificate, TestSession, TestAnswer
- Enums: Role, PremiumPlan, Difficulty, KaryaType, LeagueType, KompetensiType, LombaStatus, OrderStatus, KoleksiRarity, VideoSource, VideoCategory, WithdrawStatus, FileType, UKBISeksi, CognitiveDimension, KommunikasDomain, TKAKompetensi, TestMode, TestStatus

## Game System (Phase 1-3)
- Kuis Battle multiplayer real-time via Socket.io
- Game server: game-server/src/server.ts (Node.js + Socket.io on port 3001)
- Game lobby: components/game/GameLobby.tsx, components/game/GamePlay.tsx
- Game pages: app/(dashboard)/guru/game/lobby, app/(dashboard)/murid/game/lobby, app/(dashboard)/murid/game/play
- API routes: app/api/game/room, app/api/game/result, app/api/game/history
- Prisma models: GameRoom, GameQuestion, GameSession, GameResult
- Socket client: lib/game/socket.ts
- Seed: prisma/seed-game.ts (35 questions: EASY/MEDIUM/HARD)
- 3 game types: KUIS_BATTLE, TEBAC_KATA, KATA_SERU
- Scoring: 100 base + 10 per streak, time bonus
- 6-char alphanumeric room code, auto-generated

## UKBI/TKA Test System
### Predikat Mapping (Kemdikbud)
- Istimewa: 725-800
- Sangat Unggul: 641-724
- Unggul: 578-640
- Madya: 482-577
- Semenjana: 405-481
- Marginal: 326-404
- Terbatas: 251-325

### TKA Grades
- A: ≥85%
- B: ≥70%
- C: ≥55%
- D: <55%

## API Routes
### Kompetensi System
- `GET/POST /api/kompetensi` - List/create test packages
- `GET /api/kompetensi/[paketId]` - Start test session, load questions by section
- `POST /api/kompetensi/[paketId]/submit` - Calculate score, predikat, issue certificate if passed

### Bank Soal
- `GET/POST /api/bank-soal/ukbi` - UKBI questions (Guru/Admin)
- `GET/POST /api/bank-soal/tka` - TKA questions (Guru/Admin)
- `GET/POST /api/soal` - BankSoal CRUD
- `PUT/DELETE /api/soal/[id]` - BankSoal update/delete

### Marketplace & Finance
- `GET/POST /api/karya` - Karya CRUD
- `POST /api/marketplace/purchase` - Buy karya (free=instant, paid=Midtrans)
- `POST /api/payment/webhook` - Handle KARYA-* and PREMIUM-* order types
- `GET/POST /api/finance` - Seller balance, withdrawal
- `POST /api/guru/rpp` - RPP upload
- `POST /api/guru/soal` - BankSoal upload (via guru)
- `POST /api/guru/materi` - Materi/Administrasi upload

### Video
- `GET/POST /api/video` - Video CRUD (admin only, YouTube/Vimeo embed)

## Seeding
- `pnpm db:seed-kompetensi` - Seed UKBI (25), TKA (25) questions + 6 test packages
- prisma/seed-kompetensi.ts: UKBI_QUESTIONS, TKA_QUESTIONS, PaketKompetensi seed data

## Critical Notes
- Prisma model names: `uKBIQuestion`, `tKAQuestion`, `paketKompetensi`, `progresKompetensi`, `kompetensiCertificate`, `testSession`, `testAnswer`
- BankSoal uses YouTube/Vimeo embed URL, NOT local file storage
- Karya model does NOT have previewUrl field
- PaketKompetensi has `sections: Json` field (required)
- TestSession unique constraint: userId + paketId

## Build
- `pnpm build` - Must pass before pushing
- `pnpm db:generate` - After schema changes