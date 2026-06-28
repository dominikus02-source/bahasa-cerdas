# BahasaCerdas UKBI & TKA Design

> **Phase:** Exam 1 — Architecture Design
> **Status:** Draft
> **Last Updated:** June 28, 2026

---

## 1. UKBI Practice / Simulasi Persiapan UKBI

### Naming
- Use **"Latihan UKBI"** or **"Simulasi Persiapan UKBI"** consistently
- Never claim as "UKBI Resmi" or "UKBI Certification"
- Predikat hasil menggunakan label: **"Prediksi Predikat Latihan"**

### Profile Selection
On first access, the user selects their profile:

| Profile | Starting Level | Notes |
|---------|---------------|-------|
| SD | Pemula | Soal dasar, kosakata terbatas |
| SMP | Menengah | Teks informasi dan sastra dasar |
| SMA | Mahir | Teks akademik dan argumentasi |
| Mahasiswa | Mahir+ | Teks ilmiah, analisis kompleks |
| Guru/Profesional | Unggul | Soal tersulit, konteks profesional |

Profile only determines the **starting difficulty level**. The system adjusts based on performance (adaptive-lite).

### Adaptive-Lite Algorithm
1. Start at difficulty determined by profile
2. After every 5 questions, evaluate accuracy:
   - ≥80% → increase difficulty one step
   - ≤40% → decrease difficulty one step
3. Track per-section difficulty separately
4. Final predikat based on weighted performance across all sections

### UKBI Sections (Kemdikbud Alignment)

```
Mendengarkan    → 30% of total score
Merespons Kaidah → 20% of total score
Membaca        → 30% of total score
Menulis        → 10% of total score (Phase 2)
Berbicara      → 10% of total score (Phase 2)
```

### UKBI MVP (Paket 1) — Three Sections Only

| Section | Questions | Duration | Format |
|---------|-----------|----------|--------|
| Mendengarkan | 15 | 20 min | Audio + PG |
| Merespons Kaidah | 15 | 15 min | PG (EYD, tata bahasa) |
| Membaca | 20 | 25 min | Teks + PG |
| **Total** | **50** | **60 min** | |

### UKBI Wording Guidelines
| Do Say | Don't Say |
|--------|-----------|
| "Latihan UKBI" | "Ujian UKBI" |
| "Simulasi Persiapan UKBI" | "UKBI Resmi" |
| "Prediksi Predikat Latihan" | "Skor UKBI" |
| "Setara dengan level..." | "Anda mendapat UKBI level..." |
| "Soal model UKBI" | "Soal UKBI asli" |

### UKBI Predikat Mapping (Kemdikbud)

| Rentang Skor | Predikat | Warna |
|-------------|----------|-------|
| 725–800 | Istimewa | Emas |
| 641–724 | Sangat Unggul | Hijau |
| 577–640 | Unggul | Biru |
| 481–576 | Madya | Kuning |
| 401–480 | Semenjana | Oranye |
| 321–400 | Marginal | Merah |
| ≤320 | Terbatas | Merah Tua |

**Result screen shows:** "Prediksi Predikat Latihan: [Predikat]" with a disclaimer that this is not an official UKBI result.

---

## 2. TKA Design

### TKA Products

| Product | Target | Questions | Duration | Focus |
|---------|--------|-----------|----------|-------|
| TKA Kelas 6 | SD Kelas 6 | 25 | 45 min | Pemahaman dasar, ide pokok, informasi tersurat/tersirat |
| TKA Kelas 9 | SMP Kelas 9 | 30 | 60 min | Teks informasi, sastra, inferensi, struktur teks, kaidah bahasa |
| TKA Kelas 12 | SMA/SMK Kelas 12 | 35 | 75 min | Argumentasi, editorial, akademik, evaluasi gagasan, penalaran bahasa |
| TKA Guru / PPG | Guru | 40 | 90 min | Pedagogik, asesmen, strategi pembelajaran, profesional kebahasaan |

### TKA Kelas 6 — Blueprint

| Kompetensi | Questions | Percentage |
|------------|-----------|------------|
| Menemukan ide pokok paragraf | 5 | 20% |
| Menentukan informasi tersurat | 5 | 20% |
| Menentukan informasi tersirat | 4 | 16% |
| Memahami kosakata dalam konteks | 4 | 16% |
| Menentukan makna kata/istilah | 3 | 12% |
| Menyimpulkan isi teks pendek | 4 | 16% |
| **Total** | **25** | **100%** |

### TKA Kelas 9 — Blueprint

| Kompetensi | Questions | Percentage |
|------------|-----------|------------|
| Teks informasi: ide pokok, simpulan | 5 | 17% |
| Teks informasi: informasi tersurat/tersirat | 5 | 17% |
| Teks sastra: unsur intrinsik | 4 | 13% |
| Teks sastra: amanat, pesan | 3 | 10% |
| Inferensi dan prediksi | 4 | 13% |
| Struktur teks (deskripsi, narasi, eksposisi, persuasi, argumentasi) | 5 | 17% |
| Kaidah kebahasaan (konjungsi, kata rujukan, kalimat efektif) | 4 | 13% |
| **Total** | **30** | **100%** |

### TKA Kelas 12 — Blueprint

| Kompetensi | Questions | Percentage |
|------------|-----------|------------|
| Teks argumentasi: gagasan, pendapat, sanggahan | 5 | 14% |
| Teks editorial: analisis isu, opini | 5 | 14% |
| Teks akademik: struktur artikel ilmiah | 4 | 11% |
| Evaluasi gagasan (kelemahan, kelebihan argumen) | 4 | 11% |
| Penalaran bahasa (analogi, hubungan makna) | 5 | 14% |
| Teks sastra kompleks (cerpen, novel, drama) | 4 | 11% |
| Karya tulis ilmiah: sistematika, etika penulisan | 4 | 11% |
| Pengembangan paragraf (deduksi, induksi) | 4 | 14% |
| **Total** | **35** | **100%** |

### TKA Guru / PPG — Blueprint

| Kompetensi | Questions | Percentage |
|------------|-----------|------------|
| Pedagogik: teori belajar bahasa | 6 | 15% |
| Pedagogik: perencanaan pembelajaran | 5 | 12.5% |
| Pedagogik: asesmen pembelajaran | 5 | 12.5% |
| Profesional: linguistik umum | 4 | 10% |
| Profesional: linguistik bahasa Indonesia | 4 | 10% |
| Profesional: sastra Indonesia | 4 | 10% |
| Strategi pembelajaran (model, metode, teknik) | 6 | 15% |
| Profesional: EYD, PUEBI, tata bahasa mutakhir | 6 | 15% |
| **Total** | **40** | **100%** |

### Result Format (All TKA Products)

| Grade | Score Range |
|-------|-------------|
| A | ≥85% |
| B | ≥70% |
| C | ≥55% |
| D | <55% |

**Result screen shows:**
- Grade (A/B/C/D)
- Percentage score
- Per-kompetensi breakdown (strengths & weaknesses)
- Rekomendasi belajar (which competencies to focus on)

---

## 3. Score Calculation

### UKBI Scoring
```
Mendengarkan:     (correct / total) * 300
Merespons Kaidah: (correct / total) * 200
Membaca:          (correct / total) * 300
─────────────────────────────────────
Raw Score:         0–800
```

Scale conversion is internal. Participant sees:
- Prediksi predikat latihan (text label)
- Per-section score (0–100%)
- Raw score displayed as "Skor Latihan: XXX"

### TKA Scoring
```
Total = (correct / total) * 100
Grade = A(≥85) | B(≥70) | C(≥55) | D(<55)
```

Per-kompetensi breakdown shown as percentage bars.

---

## 4. Question Pool Requirements

### UKBI Minimum Pool (MVP)

| Section | Questions Per Blueprint | Pool Needed (3x) |
|---------|------------------------|------------------|
| Mendengarkan | 15 | 45 |
| Merespons Kaidah | 15 | 45 |
| Membaca | 20 | 60 |
| **Total** | **50** | **150** |

### TKA Minimum Pool (Per Product)

| Product | Questions Per Attempt | Pool Needed (3x) |
|---------|----------------------|------------------|
| TKA Kelas 6 | 25 | 75 |
| TKA Kelas 9 | 30 | 90 |
| TKA Kelas 12 | 35 | 105 |
| TKA Guru/PPG | 40 | 120 |

---

## 5. Existing Pool Status

Based on `prisma/schema.prisma` models:

| Model | Count (Estimated) | Status |
|-------|-------------------|--------|
| `UKBIQuestion` | 25 (seeded) | Missing listening audio, limited difficulty spread |
| `TKAQuestion` | 25 (seeded) | Limited breadth, unverified |
| `PaketKompetensi` | 6 (seeded) | Structure only, needs mapping to new model |

Full audit needed in Phase Exam 2.

---

## 6. Screen Test Player Design (MVP)

### Screen Flow

```
┌─────────────────┐
│  Test Landing    │  Product info, start/resume button
├─────────────────┤
│  Profile Select  │  SD/SMP/SMA/Mahasiswa/Guru (UKBI only)
├─────────────────┤
│  Instruction     │  Section rules, time limit, question count
├─────────────────┤
│  Audio/Device    │  "Can you hear this?" playback check (UKBI only)
├─────────────────┤
│  Section Lobby   │  Transition screen between sections
├─────────────────┤
│  Test Player     │  Question display + timer + navigator
├─────────────────┤
│  Review Screen   │  All flagged/unanswered review
├─────────────────┤
│  Submit Confirm  │  "Yakin ingin mengumpulkan?"
├─────────────────┤
│  Result Summary  │  Score, grade, predikat, breakdown
├─────────────────┤
│  Pembahasan      │  After-submit review with explanations
└─────────────────┘
```

### Test Player Components

| Component | Description |
|-----------|-------------|
| **Timer** | Countdown per section. Warning at 5 min. Auto-submit at 0. |
| **Question Navigator** | Grid of question numbers. Color-coded: green=answered, red=flagged, gray=unanswered |
| **Flag Button** | Mark question for review |
| **Previous/Next** | Navigate questions |
| **Autosave** | Save answer on every question change (debounced 500ms) |
| **Resume** | Auto-detect existing IN_PROGRESS session on landing page |

### Technical Requirements

- Timer must be server-verified on submit (client timer is display only)
- Autosave via `POST /api/exam/answer` on every change
- Session integrity check: verify `TestSessionQuestion` snapshot matches current attempt
- On resume: restore `currentSection`, `currentQuestion`, `answers`, `flagged`
- Prevent parallel sessions: start new session closes previous IN_PROGRESS

---

*This document covers UKBI/TKA product design only. Implementation details in the Exam Engine Architecture doc.*
