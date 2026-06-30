# Laporan Audit Inventaris Konten — BahasaCerdas.com

**Tanggal**: 29 Juni 2026  
**Script**: `scripts/audit-content-inventory.ts` (read-only)  
**Keamanan**: `scripts/test-content-inventory-safety.ts` (14/14 lulus)  

## Ringkasan

Audit menyeluruh terhadap seluruh bank soal, game, latihan, dan penyimpanan Supabase. Tujuan: mengetahui jumlah total soal, distribusi per produk, source of truth, BIGT-style readiness, dan prioritas perbaikan.

**Total soal fixed bank**: 959  
**Original baru**: 866 (Jalur Cerdas 366 + UKBI 500)  
**Legacy**: 93 (UKBI SMA 25 + TKA 68)  

---

## A. Jalur Cerdas (366 soal)

| Metrik | Nilai |
|--------|-------|
| Level (JALUR type) | 12 |
| Unit per level | 6 |
| Total unit | 72 |
| Micro lessons | 72 |
| Total soal | 366 |
| Target ideal (8/unit) | 576 → 210 kurang |
| Target ideal (10/unit) | 720 → 354 kurang |
| Unit <5 soal | 6 |
| Source of truth | Supabase (LearningUnit.content) |
| BIGT-style readiness | 3/5 |

**Keamanan ✅**
- Jawaban tersimpan di content JSON (server-side only)
- API strip jawaban sebelum kirim ke client
- Validasi submit server-side
- Leakage test lulus

---

## B. UKBI Practice (525 soal)

| Track | Soal | Status | JSON Source | BIGT-style |
|-------|------|--------|-------------|------------|
| SD | 250 | Original ✅ | `data/question-bank/ukbi/sd/` | 5/5 |
| SMP | 250 | Original ✅ | `data/question-bank/ukbi/smp/` | 5/5 |
| SMA | 25 | Legacy ⚠️ | Tidak ada | 3/5 |
| Guru/Umum | 0 | ❌ | Tidak ada | N/A |

**Total UKBI**: 525 (500 original, 25 legacy)  
**Target 1000**: 475 kurang  

---

## C. TKA Practice (68 soal)

| Track | Soal | Status | JSON Source | BIGT-style |
|-------|------|--------|-------------|------------|
| SD/Kelas 6 | 0 | ❌ | Tidak ada | N/A |
| SMP/Kelas 9 | 35 | Legacy ⚠️ | Tidak ada | 3/5 |
| SMA/Kelas 12 | 33 | Legacy ⚠️ | Tidak ada | 3/5 |
| UTBK/Lanjutan | 0 | ❌ | Tidak ada | N/A |
| Guru/PPG | 0 | ❌ | Tidak ada | N/A |

**Total TKA**: 68 (semua legacy)  
**Target 750**: 682 kurang  
**Target 1000**: 932 kurang  

---

## D. Game / Latihan / Arena / Kuis

| Area | Status | Notes |
|------|--------|-------|
| Game server (Socket.io) | ❌ MATI | VPS Hostinger expired |
| Game types (6 types) | ✅ Halaman ada | Multiplayer tidak berfungsi |
| Quiz (guru) | ✅ Dinamis | QuizQuestion + sanitasi |
| Penugasan (Buku Panduan) | ✅ Dinamis | LearningUnit.content |
| Bank Soal Guru | ✅ Dinamis | Soal model + sanitasi |
| Katastra | ✅ Aktif | Kosakata harian |
| Kompetisi (legacy) | ✅ Redirect | Ke simulated-test |

---

## E. Source of Truth

| Produk | Source of Truth |
|--------|-----------------|
| Jalur Cerdas | Supabase + Seed Script |
| UKBI SD/SMP | JSON `data/question-bank/ukbi/` → seed → Supabase |
| UKBI SMA | Seed legacy (tidak ada JSON) |
| TKA | Seed legacy (tidak ada JSON) |
| Quiz (guru) | Supabase (dinamis) |
| Penugasan | Supabase (LearningUnit.content) |
| Bank Soal Guru | Supabase (Soal) |
| Game | Supabase (GameQuestion) |

---

## F. BIGT-Style Readiness Score

| Produk | Score | Detail |
|--------|-------|--------|
| UKBI SD | 5/5 | ✅ Lengkap (JSON, seed, validator, audit, sanitasi) |
| UKBI SMP | 5/5 | ✅ Lengkap (sama dengan SD) |
| Jalur Cerdas | 3/5 | ✅ Aman, ⏳ belum validasi BIGT-style penuh |
| UKBI SMA (legacy) | 3/5 | ⚠️ 25 soal, tanpa JSON, tanpa validator spesifik |
| TKA SMP/SMA (legacy) | 3/5 | ⚠️ 35/33 soal, tanpa JSON, tanpa validator spesifik |
| Bank Soal Guru | 2/5 | ⏳ Dinamis tanpa validasi terpusat |

---

## G. Prioritas Perbaikan

| # | Item | Soal | Urgensi |
|---|------|------|---------|
| 1 | TKA SD Bank | 250 soal baru | 🔴 Tinggi (0 existing) |
| 2 | UKBI SMA Bank | 250 soal baru | 🔴 Tinggi (25 legacy) |
| 3 | TKA SMP Upgrade | 250 soal baru | 🟡 Sedang (35 legacy) |
| 4 | TKA SMA Upgrade | 250 soal baru | 🟡 Sedang (33 legacy) |
| 5 | Jalur Cerdas enrichment | +354 soal | 🟢 Rendah (6 unit <5) |
| 6 | UKBI Guru Bank | 250 soal baru | 🟢 Rendah |
| 7 | TKA UTBK Bank | 250 soal baru | 🟢 Rendah |
| 8 | Game server revival | — | 🔴 Tinggi (blocker) |

---

## H. Risiko

1. **Game server VPS mati** — semua multiplayer games tidak berfungsi (blocker)
2. **UKBI SMA legacy** — 25 soal saja, tidak representatif untuk simulasi SMA
3. **TKA SMP/SMA legacy** — 35/33 soal, tidak representatif
4. **TKA SD/UTBK/Guru belum ada** — 0 soal untuk ketiga track
5. **Jalur Cerdas 6 unit <5 soal** — enrichment diperlukan
6. **No JSON source untuk UKBI SMA/TKA** — seed legacy sulit diperbaiki tanpa source

---

*Audit read-only — tidak ada data diubah.*  
*Script: `npm run audit:content-inventory`*  
*Safety test: `npx tsx scripts/test-content-inventory-safety.ts`*
