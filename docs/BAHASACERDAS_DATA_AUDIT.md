# BahasaCerdas Data Audit — Phase 1

> **Date:** June 28, 2026
> **Context:** VPS (Hostinger, 72.60.78.65) expired June 26, 2026 — all data on self-hosted PostgreSQL lost.
> **Action:** Database migrated to Supabase cloud (project `ibtlhoocaoopgtcsnvzr`).

## 1. Summary

| Item | Status |
|------|--------|
| VPS PostgreSQL | **LOST** — no backup taken before expiry |
| Supabase Auth | **50 users preserved** + 2 demo accounts |
| Prisma User records | **Created for all 50 Auth users** (script via service role API) |
| Schema (83 tables) | **Pushed successfully** via `psql` migration SQL |
| Seed content | **18 items seeded** (6 Artikel, 6 Video, 6 Karya) |

## 2. What Was Lost (No Backup)

All data that lived exclusively on the VPS PostgreSQL instance:

| Domain | Details |
|--------|---------|
| **Artikel** | Previously published articles by users |
| **Karya (Marketplace)** | Seller-uploaded RPP, Modul, PPT, Soal, etc. |
| **Video** | User-uploaded and embedded video entries |
| **StudentKarya** | Student-written puisi, cerpen, artikel, etc. |
| **Quiz & Soal** | Teacher-created quizzes and question pools |
| **Game data** | GameRoom, GameSession, GameResult history |
| **Community posts** | MGMP discussions and comments |
| **Scoring/Nilai** | Teacher-assigned scores and categories |
| **Penugasan** | Assignment submissions and grades |
| **Uploaded files** | Supabase Storage documents bucket content |
| **User profiles** | Avatar URLs, bio, preferences |
| **Purchase/Payment** | Marketplace order history |
| **AIUsage logs** | Agent usage history (Phase 8A) |
| **Generated content** | AI-generated RPP, Soal, etc. |

## 3. What Exists in Supabase (Current)

### Auth
- **50 existing users** (original supabase Auth IDs preserved)
- **2 demo accounts**: `guru@demo.com` / `guru123` (role: GURU), `murid@demo.com` / `murid123` (role: MURID)
- All 50 Auth users have matching Prisma `User` records with correct `supabaseId`

### Seeded Content (via `scripts/seed-homepage-content.ts`)

**Artikel** (6 items, author: guru@demo.com):
| Title | Slug | Read Count |
|-------|------|-----------|
| Cara Efektif Mengajar Puisi di Kelas VII | mengajar-puisi-kelas-vii-kreatif | 245 |
| Panduan Lengkap Menyusun RPP Kurikulum Merdeka | panduan-rpp-kurikulum-merdeka-bahasa-indonesia | 389 |
| 5 Strategi Meningkatkan Kemampuan Menulis Teks Argumentasi | strategi-menulis-teks-argumentasi-sma | 178 |
| Memanfaatkan Media Digital untuk Pembelajaran Bahasa Indonesia | media-digital-pembelajaran-bahasa-indonesia-ai | 312 |
| Cara Asyik Belajar Teks Negosiasi Lewat Bermain Peran | belajar-teks-negosiasi-bermain-peran | 134 |
| Tips Sukses UKBI: Persiapan dan Strategi Mengerjakan Soal | tips-sukses-ukbi-persiapan-strategi | 456 |

**Video** (6 items, creator: guru@demo.com):
| Title | Category | Views |
|-------|----------|-------|
| Belajar Menulis Puisi untuk Pemula | WRITING | 1,250 |
| Bedah Buku: Ronggeng Dukuh Paruk Karya Ahmad Tohari | SASTRA | 890 |
| Tips Menjawab Soal TKA Bahasa Indonesia dengan Cepat | PEMBELAJARAN | 2,100 |
| Cara Membaca Cepat untuk Memahami Teks Eksplanasi | READING | 567 |
| Praktik Baik: Mengajar Teks Prosedur dengan Media Infografis | PEMBELAJARAN | 340 |
| Webinar: Implementasi Kurikulum Merdeka | MEDIA | 780 |

**Karya (Marketplace)** (6 items, seller: guru@demo.com):
| Title | Type | Price | Downloads |
|-------|------|-------|-----------|
| RPP Teks Deskripsi Kelas VII Semester 1 | RPP | Rp 25,000 | 120 |
| Modul Ajar Teks Narasi Kurikulum Merdeka | MODUL | Rp 35,000 | 89 |
| PPT Materi Puisi Rakyat untuk Kelas VII | PPT | Rp 20,000 | 210 |
| Bank Soal Teks Argumentasi Kelas XI (50 Soal) | SOAL | Rp 15,000 | 67 |
| Ebook: Panduan Lengkap UKBI untuk Guru dan Siswa | EBOOK | Rp 45,000 | 340 |
| Video Tutorial Menulis Teks Eksposisi (Paket 5 Video) | VIDEO | Rp 50,000 | 45 |

### Learning Content (Jalur Cerdas / Buku Panduan)
- **72 LearningUnit records** seeded via `scripts/seed-panduan.ts` (grade VII–XII)
- **SD content** seeded via `scripts/seed-panduan-sd.ts`
- **Per-unit materi files** in `scripts/seed/materi/` (50+ files for SMP/SMA/SD)
- Content is structured (belajar + latihan + praktik + kuis) with Duolingo-style renderer

### UKBI/TKA
- **PaketKompetensi**: 6 test packages seeded
- **UKBI questions**: 25 questions (via `prisma/seed-kompetensi.ts`)
- **TKA questions**: 25 questions (same script)
- TKA grades mapping: A (≥85%), B (≥70%), C (≥55%), D (<55%)

### Game System
- Database models exist (GameRoom, GameQuestion, GameSession, GameResult)
- **Game server completely dead** — was on VPS, no backup of `dist/server.js`
- Local source available at `game-server/src/server.ts`
- Default fallback questions exist in TypeScript (10 per game type)
- No game data in the current database

### User Data
- 50 Prisma User records (email, role, xp=0, level=1, league=BRONZE)
- No Profile records for most users (except demo accounts)
- No StudentKarya, CoinTransaction, or social data
- No Quiz, Nilai, or Penugasan records

## 4. Empty Tables (No Data)

The following Prisma models exist as empty tables in Supabase (83 total tables created, mostly empty):

| Category | Empty Tables |
|----------|-------------|
| **Social** | StudentKarya, StudentKaryaLike, StudentKaryaComment |
| **Community** | Community, CommunityPost, CommunityMember, CommunityComment |
| **Quiz** | Quiz, QuizQuestion, QuizAssignment, QuizSubmission |
| **Nilai** | NilaiKategori, Nilai |
| **Game** | GameRoom, GameQuestion (pool), GameSession, GameResult |
| **AI** | AiSavedResult, AIUsage, AIJob, AiCreditLedger |
| **Finance** | Pembelian, Invoice, Withdraw |
| **Utils** | Artikel, Video, Karya (beyond the 18 seeded items) |
| **Bank Soal** | BankSoal, Soal |
| **Kamus** | KamusEntry |
| **Store** | StoreItem, UserItem |
| **Messages** | ChatMessage, Notifikasi |
| **Lomba/Loker** | Lomba, Loker |

## 5. Recovery Priority

| Priority | Item | Effort | Can Recover? |
|----------|------|--------|-------------|
| P0 | Game server hosting | Medium | Yes — deploy to alternative host |
| P1 | Authentic homepage content | Low | Generate with AI (Gemini API configured) |
| P2 | Student social data | Medium | User-generated over time |
| P3 | Quiz/Bank Soal data | Low | Regenerate from seed or AI |
| P4 | Purchase history | High | Cannot recover — manual re-entry |
| P5 | AI Usage logs | Low | Auto-rebuilds as users interact |

## 6. Key Files

- **Seed script**: `scripts/seed-homepage-content.ts`
- **Learning content**: `scripts/seed/materi/*.ts` (50+ files)
- **Panduan seed**: `scripts/seed-panduan.ts`
- **Panduan SD seed**: `scripts/seed-panduan-sd.ts`
- **Kompetensi seed**: `prisma/seed-kompetensi.ts`
- **Game server source**: `game-server/src/server.ts`
- **Schema**: `prisma/schema.prisma`
- **Env backup**: `.env.backup-vps`
- **Middleware auth**: `lib/supabase/proxy.ts`
- **Login page**: `app/(auth)/login/page.tsx`

## 7. Risks

1. **No backup strategy** — No automated pg_dump was configured. If Supabase goes down, data is lost again.
2. **Game server single point of failure** — All multiplayer features depend on the Socket.io server.
3. **Stale cookie loop** — Users with old browser sessions can trigger Supabase Auth rate limits (429).
4. **Seed data author** — All 18 homepage items use `guru@demo.com` as author/seller (not realistic).
