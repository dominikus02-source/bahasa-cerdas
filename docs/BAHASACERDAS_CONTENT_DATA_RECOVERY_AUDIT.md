# BahasaCerdas Content Data Recovery — Audit Report

> **Phase:** Data Recovery 1 — Inventory Audit  
> **Date:** 2026-06-29  
> **Source:** Supabase PostgreSQL (production)  
> **Script:** `scripts/audit-content-data.ts`

---

## 1. User Summary

| Metric | Count |
|--------|-------|
| Total users | 43 |
| Guru | 2 |
| Murid | 38 |
| Admin | 3 |
| Founder | 3 |
| Onboarded | 4 |
| With avatar | 4 |
| Empty email | 0 |
| Without supabaseId | 0 |
| Without fullName | 0 |

**Founder emails:** dominikus.02@gmail.com, hdsastra47@gmail.com, alexsurya1968@gmail.com  
**Demo accounts:** guru@demo.com (GURU), murid@demo.com (MURID)

---

## 2. Content Inventory

### Artikel
| Metric | Count |
|--------|-------|
| **Total** | **15** |
| Published | 15 |
| No content | 0 |
| No title | 0 |
| No cover image | 6 |

**Date range:** 2026-04-18 → 2026-06-28  
**Source:** Seed data from `scripts/seed-homepage-v2.ts` (9 items) + old `scripts/seed-homepage-content.ts` (6 items)  
**Assessment:** Semua artikel adalah seed data dari tim editorial. Tidak ada artikel dari user/crowd.

### Video
| Metric | Count |
|--------|-------|
| **Total** | **15** |
| Published | 15 |
| No title | 0 |
| No URL | 0 |
| No thumbnail | 6 |

**Date range:** 2026-04-28 → 2026-06-28  
**Source:** Seed data (9 v2 + 6 v1)  
**Assessment:** Sama seperti artikel — semua seed.

### Karya (Marketplace)
| Metric | Count |
|--------|-------|
| **Total** | **15** |
| Published | 15 |
| Premium | 0 |
| Free (Rp 0) | 0 |
| No title | 0 |
| No description | 0 |
| No file | 0 |

**Price range:** Rp15,000 – Rp50,000  
**Seller:** guru@demo.com (all items)  
**Types:** RPP, MODUL, PPT, SOAL, VIDEO, EBOOK, ADMINISTRASI  
**Assessment:** Semua seed. Tidak ada karya asli dari guru lain.

### Karya Siswa (StudentKarya)
| Metric | Count |
|--------|-------|
| **Total** | **0** |
| Featured | 0 |
| No title | 0 |
| No content | 0 |

**Assessment:** ✅ Tidak ada data — fitur sosial mungkin belum dipakai atau data VPS hilang.

### Comments & Likes
| Metric | Count |
|--------|-------|
| Total komentar | 0 |
| Total like | 0 |

**Assessment:** ✅ Tidak ada data sosial.

---

## 3. Transaction Data

| Model | Count |
|-------|-------|
| Pembelian | 0 |
| Transaksi | 2 |
| PurchaseHistory | 0 |
| SellerEarning | 0 |
| Withdrawal | 0 |
| Subscription | 0 |
| AdminPaymentAuditLog | 0 |

**Assessment:** 2 transaksi ditemukan (mungkin test/seed). Tidak ada histori pembelian atau subscription. Data payment dari VPS kemungkinan hilang.

---

## 4. AI Data

| Model | Count |
|-------|-------|
| AiSavedResult | 0 |
| AIUsage | 0 |
| AiCreditLedger | 1 |
| AIJob | 0 |

**Assessment:** 1 credit ledger entry (mungkin seed). Tidak ada AI usage atau saved results — kemungkinan hilang dari VPS.

---

## 5. Groups, Quizzes & Classes

| Model | Count |
|-------|-------|
| Groups | 0 |
| Group Members | 0 |
| Quizzes | 0 |
| Quiz Questions | 0 |
| Quiz Assignments | 0 |
| Quiz Submissions | 0 |
| Penugasan | 0 |
| Penugasan Submission | 0 |

**Assessment:** ✅ Tidak ada data grup/kelas.

---

## 6. Notifications & Game Data

| Model | Count |
|-------|-------|
| Notifikasi | 0 |
| Game Rooms | 0 |
| Game Questions | 0 |
| Game Sessions | 0 |
| Game Results | 0 |

**Assessment:** ✅ Semua kosong — game server mati, data game kemungkinan hilang.

---

## 7. Learning Content (Materi, Buku Panduan)

| Model | Count |
|-------|-------|
| LearningLevel | 0 |
| LearningUnit | 0 |
| UserUnitProgress | 0 |
| Materi | 0 |
| KoleksiKata | 0 |
| KamusEntry | 0 |

**Assessment:** ✅ Semua kosong — konten belajar dan Buku Panduan belum di-seed di Supabase.

---

## 8. Data Likely Missing from Old VPS

Data yang kemungkinan besar hilang karena VPS mati (Hostinger expired):

| Data | Estimated Volume | Recoverable? |
|------|-----------------|--------------|
| StudentKarya (karya siswa asli) | Unknown | ❌ Hilang permanen |
| StudentKaryaLike/Love | Unknown | ❌ Hilang permanen |
| StudentKaryaComment | Unknown | ❌ Hilang permanen |
| CoinTransaction history | Unknown | ❌ Hilang permanen |
| DailyQuest progress | Unknown | ❌ Hilang permanen |
| StoreItem purchases | Unknown | ❌ Hilang permanen |
| UserItem ownership | Unknown | ❌ Hilang permanen |
| Notifikasi records | Unknown | ❌ Hilang permanen |
| Group/Quiz/Assignment data | Unknown | ❌ Hilang permanen |
| Game data (rooms, sessions) | Unknown | ❌ Hilang permanen (game server juga mati) |
| TestSession / TestAnswer | Unknown | ❌ Hilang permanen |
| ProgresKompetensi | Unknown | ❌ Hilang permanen |
| UKBIQuestion/TKAQuestion | 25+25 seeded | ✅ Bisa direstore dari seed script |
| PaketKompetensi | 6 seeded | ✅ Bisa direstore dari seed script |
| AI Usage data | Unknown | ❌ Hilang permanen |
| AI Saved Results | Unknown | ❌ Hilang permanen |
| Subscription / Pembelian | Unknown | ❌ Hilang permanen |

---

## 9. Data That Can Be Rebuilt from GitHub Seed

| Dataset | Seed Script | Items |
|---------|-------------|-------|
| UKBI Questions | `prisma/seed-kompetensi.ts` | 25 |
| TKA Questions | `prisma/seed-kompetensi.ts` | 25 |
| PaketKompetensi | `prisma/seed-kompetensi.ts` | 6 |
| Buku Panduan (LearningLevel/Unit) | `scripts/seed-panduan.ts` | 12 grade-levels, 72 bab |
| Coin/DailyQuest initial data | `lib/coins.ts` | N/A (code-based) |
| Store Items | Seed script needed | 0 |

---

## 10. Risk Summary

| Risk | Status |
|------|--------|
| User data preserved | ✅ 43 users, 3 founders, demo accounts |
| Payment/subscription data | ⚠️ 2 transaksi saja, tidak ada subscription |
| Content (Artikel/Video/Karya) | ✅ 15 each — semua seed |
| Social features (karya siswa) | ❌ 0 — kemungkinan hilang |
| Game data | ❌ 0 — server mati |
| Exam/UKBI/TKA data | ❌ 0 — perlu seed ulang |
| AI data | ❌ 0 — AIUsage kosong |

---

*Generated by `scripts/audit-content-data.ts` on 2026-06-29. Read-only — no data was modified.*
