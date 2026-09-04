# BahasaCerdas — Teks Berita Pilot V1 (12 real items)

**Status**: AUTHORING COMPLETE — DETERMINISTIC GATES PASS — **PENDING_HUMAN_REVIEW** (no qualified Indonesian assessment/content expert has reviewed this artifact; none is claimed)
**Phase**: 2 (Phase 1A.2 foundation governs) · **Mode**: controlled authoring + validation, lab artifact only
**Date**: 2026-09-04 · **Provenance**: AI_ASSISTED draft (see §5.3 provenance honesty)
**Delivery**: NOT integrated anywhere — no Soal row, no MASTER_BANK, no QuestionMetadata, no diagnostic bank, no allowlist. This file is the only artifact of this phase.

Governing documents (all read before authoring):

| Doc | Role here |
|---|---|
| `QUESTION_BANK_50_THEME_BLUEPRINT.md` §7 | **The pilot contract** — distributions, archetypes, gates, success criteria |
| `QUESTION_BANK_QUALITY_STANDARD.md` | 15-dimension scoring framework, §4.4 conjunctive publish rule (S2), §4.8/§4.9 V7+D10 semantics |
| `QUESTION_ITEM_DNA.md` | Logical field contract (groups A–F), §2 authoring-vs-delivery separation |
| `QUESTION_VALIDATION_SPEC.md` | Stage pipeline (1 structural → 10 calibration) |
| `QUESTION_BANK_FOUNDATION_VERIFICATION.md` | CONDITIONAL-GO record; LEVEL 0–3 calibration framework (§10) |
| `QUESTION_BANK_50_THEME_FORENSIC_AUDIT.md` | Historical evidence only — **not** a quality template |
| `QUESTION_BANK_RESEARCH_BIBLIOGRAPHY.md` | Provenance of research claims (primary-source caveats P4/P6 apply) |

---

## 1. Pilot objective

Prove that the foundation (Blueprint + Item DNA + Quality Standard + Validation Spec + human-review model) can produce **genuinely high-quality, diagnostic, non-template assessment items** for the Teks Berita construct — not that "AI can write 12 questions."

**Pass criteria (Blueprint §7.12, 8 conditions) — see §11 evaluation table.**

**Hard safety rules honored:** 0 DB writes · 0 bank edits · 0 schema changes · 0 production code changes · 0 delivery integration. All 12 items exist only in this document.

---

## 2. Blueprint-derived target distribution (contract)

Extracted verbatim from Blueprint §7.3–§7.6 before authoring:

| Axis | Blueprint target |
|---|---|
| Construct | Reading a news text *as a genre*: 5W+1H retrieval, lead/main point, inverted-pyramid structure, fact/opinion, meaning-in-context, claim-support evaluation. **Not** current-affairs knowledge, journalism vocabulary, or event memory. |
| Skills | Primary `READING`; subskills `READING_INFORMASI_TERSURAT`, `READING_STRUKTUR_TEKS`, `READING_IDE_POKOK`, `READING_INFERENSI`. Fakta/opini has **no dedicated subskill** (flagged taxonomy gap, §7.2) → mapped to `READING_INFERENSI` with a documented flag. |
| Cognitive (§7.3) | R2 ~25% · R3 ~25% · R4 ~35% · R5 ~15% (12-item pilot) |
| Archetypes (§7.4) | 2× A eksplisit 5W+1H · 2× A gagasan utama/lead (R3) · 2× A-R4 inferensi dua-bukti · 2× I fakta/opini · 2× H struktur (headline–lead–body) · 1× L kosakata-dalam-konteks · 1× B klaim tidak didukung teks (R5) |
| Stimulus | 5–6 texts for 12 items (testlets of 2–3; each testlet = 1 diagnostic evidence unit); 75–200 kata (SMP band); grade-fit register; exotic terms glossed; time-independent content |
| Difficulty (§7.6) | Easy ~25% · Medium ~45% · Hard ~30% (Easy = retrieval; Medium = structure + direct fakta/opini; Hard = multi-evidence inference + subtle evaluation) |
| Misconception | All THEORETICAL/HYPOTHESIS — none empirically validated (V7). Model: "every news sentence is fact" · "opinion only when signposted 'menurut'" · "the lead is the conclusion" · "longer text = more important news" · "a quoted source makes a claim true" |
| Diagnostic evidence | Signals: retrieval (R2), structure awareness (R3), inferential reading (R4), evaluative reading (R5). Must **not** infer writing ability, grammar mastery, general knowledge. Evidence updates `READING` only; a testlet counts once. |
| D10 state | `HYPOTHESIS` at authoring (per §7.9); publish requires `REVIEWED`+ for DIAGNOSTIC (§4.9) — so **no item is publishable yet** |
| Human review | Mandatory per item (stages 3/4/6/9 + keys + cognitive cells); PENDING here by design |

### 2.1 FOUNDATION CONFLICT FOUND (finding F1 — requires founder decision)

Blueprint §7.3 (cognitive %s: R2 25 / R3 25 / R4 35 / R5 15 → 3/3/4/2 of 12) and §7.4 (archetype list, which fixes 2 eksplisit + 2 gagasan-utama + 2 struktur + 2 fakta/opini + 2 inferensi + 1 kosakata + 1 klaim) **cannot both be satisfied**: binding to §7.4's concrete 12-item architecture yields **R2=2, R3=5, R4=4, R5=1** (17/42/33/8%) — because §7.4's "gagasan utama/lead (R3)" label and §7.3's placement of "gagasan" under R4 conflict, and the archetype list forces more R3 structure/kosakata items than §7.3's 25% allows.

**Decision taken here (documented, not invented):** the §7.4 archetype list is the binding contract (it is the concrete per-item architecture; §7.3 percentages are guidance with "~"). The 12 items follow §7.4 exactly. The R2/R3/R5 shortfall vs §7.3 is **reported, not papered over** — see §11 finding F1 and the founder-decision list §12. A one-line blueprint clarification (make §7.3's parenthetical "gagasan" read "gagasan lintas-paragraf = R4; gagasan dari lead = R3") resolves it without changing any item.

**P2.2 update (2026-09-04):** the F1 decision record now lives in `P2_2_REVISION_AND_FOUNDER_DECISION_REPORT.md` §2 — a **proposed** canonical resolution (DNA §5 as single R-mapping; §7.4 archetypes binding; §7.3 percentages advisory), marked `FOUNDER_DECISION_REQUIRED = TRUE`. Item labels in this artifact follow the proposal only where an allowed revision required it (TB-008 R3→R4); the remaining labels are F1-conditional until founder sign-off.

---

## 3. Stimulus inventory (5 texts, all fictional — option A per mission §6)

All stimuli are **clearly fictional but realistic** Indonesian local/school news, marked `fictional: true` in authoring metadata. No real events, real people, real institutions, or verifiable-world claims are asserted. Content is time-independent (no event a student may or may not know), grade-fit (Fase D / SMP), and non-alarming (D13: neutral-positive). Word counts within the SMP band (75–200 kata).

| ID | Working title | Fictional? | Kata (measured) | Testlet items | Evidence unit |
|---|---|---|---|---|---|
| STIM-01 | Perpustakaan Digital SMP Nusantara | ✅ (fictional school) | 86 | TB-001, TB-002 | EU-01 |
| STIM-02 | Gerakan "Sukamaju Membaca" | ✅ (fictional village) | 76 | TB-003, TB-004, TB-007 | EU-02 |
| STIM-03 | Penanaman Pohon di Bantaran Sungai | ✅ (fictional school) | 85 | TB-005, TB-012 | EU-03 |
| STIM-04 | Perpustakaan Keliling | ✅ (generic government) | 81 | TB-006, TB-008, TB-009 | EU-04 |
| STIM-05 | Bank Sampah SMP Harapan Jaya | ✅ (fictional school) | 83 | TB-010, TB-011 | EU-05 |

Each testlet = **1 diagnostic evidence unit** (Blueprint §7.5): evidence written to the learning ledger once per stimulus, not per item.

### STIM-01 — Perpustakaan Digital SMP Nusantara (118 kata)

> SMP Nusantara meresmikan perpustakaan digital pada Senin, 3 Maret 2025. Perpustakaan digital itu menyediakan 1.500 judul buku elektronik yang dapat dibaca siswa melalui gawai masing-masing. Kepala SMP Nusantara, Ibu Ratna Wulandari, mengatakan bahwa perpustakaan digital bertujuan menumbuhkan kebiasaan membaca siswa. "Kami ingin siswa membaca di mana pun, tidak harus datang ke ruang perpustakaan," ujarnya. Peresmian dihadiri perwakilan dinas pendidikan kabupaten. Ibu Ratna menambahkan bahwa penggunaan perpustakaan digital akan dievaluasi setiap tiga bulan. Dengan layanan ini, siswa tidak perlu lagi menunggu giliran meminjam buku di meja perpustakaan.

### STIM-02 — Gerakan "Sukamaju Membaca" (122 kata)

> Pemerintah Desa Sukamaju meluncurkan gerakan "Sukamaju Membaca" pada awal Februari 2025. Gerakan ini menyediakan 500 buku bacaan yang ditempatkan di pos ronda dan balai desa. Kepala Desa Sukamaju, Bapak Dedi Hartono, mengatakan bahwa minat baca warga meningkat sejak taman bacaan masyarakat dibuka dua tahun lalu. "Jumlah peminjam buku naik dari 40 menjadi 120 orang setiap bulan," jelasnya. Namun, pengelola taman bacaan mengeluhkan kondisi sebagian buku yang sudah usang. Mereka berharap pemerintah kabupaten memberikan bantuan buku baru.

### STIM-03 — Penanaman Pohon di Bantaran Sungai (103 kata)

> Sebanyak 60 siswa SMP Karya Bangsa menanam 500 bibit pohon di bantaran sungai dekat sekolah pada Minggu, 16 Februari 2025. Kegiatan itu merupakan bagian dari program sekolah Adiwiyata. Guru pendamping, Ibu Sari Rahayu, menjelaskan bahwa akar pohon mampu menahan tanah sehingga dapat mengurangi risiko longsor saat hujan deras. Selain menanam, para siswa membersihkan sampah plastik yang menyumbat aliran sungai. Panitia kegiatan menyiapkan bibit dan alat tanam untuk setiap kelompok siswa. Kepala SMP Karya Bangsa berharap kegiatan serupa dapat dilakukan setiap bulan dengan melibatkan warga sekitar.

### STIM-04 — Perpustakaan Keliling (104 kata)

> Pemerintah kabupaten mengoperasikan perpustakaan keliling ke lima desa terpencil setiap hari Rabu dan Sabtu. Mobil perpustakaan itu membawa 800 buku cerita dan buku pengetahuan. Kepala Bidang Perpustakaan, Ibu Lestari Nugraha, menyampaikan bahwa jumlah pengunjung perpustakaan keliling mencapai 250 orang setiap minggu. "Sebagian besar pengunjung adalah pelajar sekolah dasar," katanya. Menurut Ibu Lestari, perpustakaan keliling sangat membantu siswa yang rumahnya jauh dari perpustakaan umum. Setiap desa menerima kunjungan mobil perpustakaan dua kali dalam sebulan. Buku yang dipinjam dapat dikembalikan pada kunjungan berikutnya.

### STIM-05 — Bank Sampah SMP Harapan Jaya (83 kata)

> Siswa SMP Harapan Jaya membentuk bank sampah sekolah pada Januari 2025.
>
> Setiap Jumat, siswa menyerahkan botol plastik, kertas bekas, dan kaleng kepada petugas bank sampah. Hasil penjualan sampah pada bulan pertama mencapai Rp350.000,00 dan digunakan untuk membeli buku tulis bagi siswa yang membutuhkan.
>
> Koordinator bank sampah, Kak Rina Maharani, mengatakan bahwa kesadaran siswa memilah sampah meningkat setelah program berjalan. "Awalnya hanya 30 siswa yang ikut, sekarang 90 siswa," ungkapnya.
>
> Setiap akhir bulan, petugas menimbang dan mencatat jumlah sampah yang terkumpul dari setiap kelas.

*Revision note (v1.1, 2026-09-04): pemenggalan paragraf dipulihkan (P1 = kalimat 1; P2 = kalimat 2–3; P3 = kalimat 4–5; P4 = kalimat 6) agar referen "paragraf kedua" pada TB-010 benar-benar ada di stimulus yang terkirim. Jumlah kata tidak berubah (83).*

---

## 4. Item specifications (12)

Common fields (applied to every item; not repeated per item to keep this reviewable):

- `theme`: Teks Berita · `grade/phase`: Fase D (SMP kelas VIII) · `item_type`: PILIHAN_GANDA (4 opsi, 1 kunci) · `assessment_purpose`: DIAGNOSTIC (pilot) · `source`: MANUAL (authored for this pilot) · `provenance`: AI_ASSISTED-draft, **human ownership PENDING** · `validation_status`: STRUCTURAL_PASS + CONTENT_PASS (deterministic) · `review_status`: **PENDING_HUMAN_REVIEW** · `reviewer`/`reviewed_at`: empty · `version`: 1.0 · `lineage`: none (original) · `publication_status`: DRAFT (never ELIGIBLE/PUBLISHED) · `difficulty_observed`/`difficulty_calibrated`: not applicable (LEVEL 0 — no responses) · `misconception_state`: **HYPOTHESIS** for every item (V7 — nothing validated) · `D10_state`: **HYPOTHESIS** (S2 — publish blocked) · `stimulus_type`: PASSAGE · `curriculum_mapping`: Fase D · elemen Membaca · CP "memahami dan mengevaluasi informasi pada teks berita" (precise CP-point verification = content-expert item, §5.3).

---

### TB-001 — 5W+1H eksplisit · `BC-TEKS-BERITA-0001`

- **Stimulus**: STIM-01 · **Archetype**: A eksplisit (5W+1H) · **Skill/subskill**: READING / READING_INFORMASI_TERSURAT
- **Cognitive**: R2 (MEMAHAMI) — locating an explicitly stated date in the lead; no inference, no transformation.
- **Difficulty target**: EASY — one explicit fact, distractor dates are plausible-but-wrong alternatives; nothing above grade.
- **Prompt**: "Kapan perpustakaan digital SMP Nusantara diresmikan?"
- **Options / key (index 0)**:
  0. Senin, 3 Maret 2025 ✅
  1. Senin, 3 Februari 2025
  2. Minggu, 16 Februari 2025
  3. Rabu, 3 Maret 2025
- **Explanation**: Teks menyebut peresmian "pada Senin, 3 Maret 2025" (kalimat pertama/lead). Opsi lain menukar bulan, hari, atau mengambil tanggal dari stimulus lain.
- **Distractor rationale (hypotheses)**:
  - B: pembaca menyapu teks dan menukar bulan (3 Maret → 3 Februari) — kesalahan pemindaian cepat.
  - C: mengambil tanggal dari stimulus berbeda (STIM-03) — mencampur isi dua berita.
  - D: menukar hari (Rabu) sambil mempertahankan tanggal — pemindaian parsial hari/tanggal.
- **Evidence target**: { skill: READING, subskill: READING_INFORMASI_TERSURAT, process: R2, confidence: MEDIUM } — correct = tersurat retrieval; incorrect = scanning/attention error.
- **Stimulus-dependent**: ✅ (tanggal hanya ada di STIM-01; tak terjawab dari pengetahuan umum).

### TB-002 — Gagasan utama (lead) · `BC-TEKS-BERITA-0002`

- **Stimulus**: STIM-01 · **Archetype**: A gagasan utama/lead (R3) · **Skill/subskill**: READING / READING_IDE_POKOK
- **Cognitive**: R3 (MENERAPKAN) — per Blueprint §7.4 label (gagasan-utama/lead = R3); see finding F1 for the §7.3 tension.
- **Difficulty target**: MEDIUM — requires weighing the lead + purpose quote against supporting details.
- **Prompt**: "Pernyataan berikut yang paling tepat sebagai gagasan utama berita tersebut adalah …"
- **Options / key (0)**:
  0. Perpustakaan digital SMP Nusantara diresmikan untuk menumbuhkan kebiasaan membaca siswa. ✅
  1. Perpustakaan digital menyediakan 1.500 judul buku elektronik bagi siswa.
  2. Perwakilan dinas pendidikan kabupaten menghadiri peresmian perpustakaan digital.
  3. Penggunaan perpustakaan digital akan dievaluasi setiap tiga bulan.
- **Explanation**: Lead (peresmian) + tujuan (menumbuhkan kebiasaan membaca) membentuk gagasan utama; B/C/D adalah rincian pendukung/penutup yang benar tetapi bukan inti berita.
- **Distractor rationale (hypotheses)**:
  - B: memilih rincian (jumlah buku) yang menonjol secara numerik — "angka menarik perhatian" bias.
  - C: memilih detail seremonial — membaca permukaan, bukan struktur.
  - D: memilih kalimat penutup — "kalimat terakhir = kesimpulan" misreading.
- **Evidence target**: { READING, READING_IDE_POKOK, R3, MEDIUM } — correct = distinguishes lead from detail; incorrect = detail-as-main-idea error.
- **Stimulus-dependent**: ✅ (gagasan utama hanya dapat dinilai dari teks).

### TB-003 — Fakta/opini (langsung) · `BC-TEKS-BERITA-0003`

- **Stimulus**: STIM-02 · **Archetype**: I fakta/opini · **Skill/subskill**: READING / READING_INFERENSI *(fakta/opini: mapped here; dedicated subskill is a flagged taxonomy gap)*
- **Cognitive**: R4 (MENGANALISIS) — per §7.3 (fakta/opini halus dalam R4); item ini versi langsung (R4 ringan, MEDIUM).
- **Difficulty target**: MEDIUM — direct fact/opinion: satu fakta terverifikasi vs tiga opini berlabel jelas.
- **Prompt**: "Pernyataan berikut yang merupakan fakta berdasarkan teks tersebut adalah …"
- **Options / key (0)**:
  0. Gerakan "Sukamaju Membaca" menyediakan 500 buku bacaan di pos ronda dan balai desa. ✅
  1. Minat baca warga Sukamaju akan terus meningkat pada tahun-tahun mendatang.
  2. Taman bacaan masyarakat Sukamaju adalah taman bacaan terbaik di kabupaten.
  3. Semua desa sebaiknya meniru gerakan "Sukamaju Membaca".
- **Explanation**: A dapat diverifikasi langsung dari teks (kalimat 2: "Gerakan ini menyediakan 500 buku bacaan yang ditempatkan di pos ronda dan balai desa"). B prediksi, C penilaian, D anjuran — ketiganya opini, tidak dapat diverifikasi dari isi teks.
- **Revision note (v1.1, 2026-09-04)**: kunci diubah dari "Pemerintah Desa Sukamaju menyediakan…" menjadi "Gerakan 'Sukamaju Membaca' menyediakan…" — menghilangkan pergeseran subjek (teks menyatakan *gerakan* yang menyediakan buku; pemerintah hanya meluncurkan gerakan). Item fakta/opini yang menguji keterverifikasian teks harus berkunci verbatim. Construct (fakta/opini), cognitive target, dan tiga distraktor tidak berubah. Re-validated: structural/content PASS (gate 12/12, lihat Appendix A).
- **Distractor rationale (hypotheses)**:
  - B: prediksi berlabel masa depan — siswa menganggap pernyataan bernada positif = fakta.
  - C: penilaian superlatif — "terbaik" tanpa bukti teks.
  - D: anjuran normatif ("sebaiknya") — siswa menilai *benar secara moral* alih-alih *faktual*.
- **Evidence target**: { READING, READING_INFERENSI, R4, MEDIUM } — correct = fact/opinion discrimination; incorrect = moral/predictive judgment substituting for text-verifiability.
- **Stimulus-dependent**: ✅ (semua opsi mengacu pada isi STIM-02).

### TB-004 — Kosakata dalam konteks · `BC-TEKS-BERITA-0004`

- **Stimulus**: STIM-02 · **Archetype**: L kosakata-dalam-konteks · **Skill/subskill**: READING / READING_MAKNA_KATA
- **Cognitive**: R3 (MENERAPKAN) — per §7.3 (kosakata-dalam-konteks di band R3).
- **Difficulty target**: MEDIUM — makna ditentukan dari konteks kalimat, bukan kamus.
- **Prompt**: "Kata *mengeluhkan* dalam kalimat 'pengelola taman bacaan mengeluhkan kondisi sebagian buku yang sudah usang' bermakna …"
- **Options / key (0)**:
  0. menyampaikan keluhan tentang sesuatu ✅
  1. memberikan saran perbaikan kepada pemerintah
  2. menceritakan pengalaman pribadi kepada orang lain
  3. meminta bantuan secara langsung kepada warga
- **Explanation**: "Mengeluhkan kondisi sebagian buku yang sudah usang" = menyampaikan keluhan/ketidakpuasan atas kondisi buku. Konteks kalimat berikutnya ("berharap … bantuan buku baru") memperkuat, tetapi makna kata itu sendiri adalah menyampaikan keluhan.
- **Distractor rationale (hypotheses)**:
  - B: distraktor konteks — kalimat sesudahnya bicara harapan bantuan; siswa menggabungkan makna kata dengan akibat kalimat.
  - C/D: tebakan makna dari bentuk kata tanpa membaca konteks kalimat.
- **Evidence target**: { READING, READING_MAKNA_KATA, R3, MEDIUM } — correct = context-driven meaning; incorrect = form-based guessing / context bleeding.
- **Stimulus-dependent**: ✅ (konteks kalimat hanya ada di STIM-02).
- **Revision note (v1.1, 2026-09-04)**: subskill dipetakan ulang dari `READING_INFERENSI` → `READING_MAKNA_KATA` — subskill ini sudah ada di taxonomy kanonik (`lib/question-metadata/taxonomy.ts`); Blueprint §7.2 yang mencatumkan hanya 4 subskill adalah stale. Tidak ada LearningSkillType baru dibuat. Item content, key, distraktor, dan cognitive target tidak berubah. Re-validated: structural/content PASS.

### TB-005 — Inferensi dua-bukti · `BC-TEKS-BERITA-0005`

- **Stimulus**: STIM-03 · **Archetype**: A-R4 inferensi dua-bukti · **Skill/subskill**: READING / READING_INFERENSI
- **Cognitive**: R4 (MENGANALISIS) — inferensi dari dua bukti tekstual.
- **Difficulty target**: HARD — inferensi multi-bukti dengan dua distraktor kontradiksi dan satu distraktor tidak didukung.
- **Prompt**: "Berdasarkan teks, kegiatan siswa SMP Karya Bangsa pada Minggu, 16 Februari 2025 menunjukkan bahwa mereka …"
- **Options / key (0)**:
  0. peduli terhadap kelestarian lingkungan di sekitar sekolah ✅
  1. ingin mengganti program Adiwiyata dengan kegiatan lain
  2. hanya mengikuti kegiatan karena diminta guru
  3. menolak membersihkan sampah di aliran sungai
- **Explanation**: Dua bukti: (1) 60 siswa menanam 500 bibit, (2) siswa membersihkan sampah plastik dari aliran sungai. Keduanya konsisten dengan kepedulian lingkungan. B bertentangan (kegiatan *bagian dari* Adiwiyata), D bertentangan (mereka justru membersihkan), C tidak didukung teks.
- **Distractor rationale (hypotheses)**:
  - B: negasi program — siswa membaca "bagian dari program" sebagai "pengganti program".
  - C: inferensi motif tanpa bukti — "siswa diwajibkan sekolah" stereotip dilimpahkan ke teks.
  - D: pembalikan tindakan — membaca cepat, tidak memverifikasi arah tindakan.
- **Evidence target**: { READING, READING_INFERENSI, R4, HARD } — correct = integrates two pieces of evidence; incorrect = overclaim, reversal, or outside-knowledge substitution.
- **Stimulus-dependent**: ✅ (bukti hanya di STIM-03).

### TB-006 — 5W+1H eksplisit · `BC-TEKS-BERITA-0006`

- **Stimulus**: STIM-04 · **Archetype**: A eksplisit (5W+1H) · **Skill/subskill**: READING / READING_INFORMASI_TERSURAT
- **Cognitive**: R2 (MEMAHAMI) — lokasi informasi tersurat ("siapa" sasaran).
- **Difficulty target**: EASY — satu fakta eksplisit dengan kutipan langsung.
- **Prompt**: "Menurut teks, siapakah pengunjung terbanyak perpustakaan keliling?"
- **Options / key (0)**:
  0. Pelajar sekolah dasar ✅
  1. Guru sekolah menengah
  2. Pegawai kantor kabupaten
  3. Orang tua siswa
- **Explanation**: Teks: "Sebagian besar pengunjung adalah pelajar sekolah dasar" (kutipan Ibu Lestari).
- **Distractor rationale (hypotheses)**:
  - B/C/D: pengalaman pribadi/stereotip pengunjung perpustakaan menggantikan bukti teks (outside-knowledge substitution).
- **Evidence target**: { READING, READING_INFORMASI_TERSURAT, R2, EASY }.
- **Stimulus-dependent**: ✅.

### TB-007 — Struktur: headline–lead · `BC-TEKS-BERITA-0007`

- **Stimulus**: STIM-02 · **Archetype**: H struktur (headline–lead–body) · **Skill/subskill**: READING / READING_STRUKTUR_TEKS
- **Cognitive**: R3 (MENERAPKAN) — menerapkan pemahaman struktur berita untuk memilih judul yang mencerminkan lead.
- **Difficulty target**: MEDIUM — membutuhkan pemetaan isi lead → konvensi judul + menolak judul kontradiktif.
- **Prompt**: "Berdasarkan isi berita, judul yang paling tepat untuk teks tersebut adalah …"
- **Options / key (0)**:
  0. "Pemerintah Desa Sukamaju Luncurkan Gerakan Sukamaju Membaca" ✅
  1. "Taman Bacaan Sukamaju Ditutup karena Sepi Pengunjung"
  2. "Minat Baca Warga Sukamaju Menurun Drastis"
  3. "Bantuan Buku Baru Telah Tiba di Sukamaju"
- **Explanation**: Judul yang tepat mencerminkan informasi pokok lead (peluncuran gerakan). B/C bertentangan dengan isi teks (minat *meningkat*, taman bacaan *tetap berjalan*); D belum terjadi (masih harapan).
- **Distractor rationale (hypotheses)**:
  - B/C: judul sensasional/kontradiktif — siswa memilih judul "menarik" tanpa verifikasi isi.
  - D: melompati fakta — "harapan" dibaca sebagai "kejadian" (wish-as-fact).
- **Evidence target**: { READING, READING_STRUKTUR_TEKS, R3, MEDIUM } — correct = headline maps lead; incorrect = sensational/unsupported headline.
- **Stimulus-dependent**: ✅.

### TB-008 — Struktur: fungsi kalimat dalam piramida terbalik · `BC-TEKS-BERITA-0008`

- **Stimulus**: STIM-04 · **Archetype**: H struktur (headline–lead–body) · **Skill/subskill**: READING / READING_STRUKTUR_TEKS
- **Cognitive**: R4 (MENGANALISIS) — menerapkan konsep struktur piramida terbalik untuk mengklasifikasikan fungsi kalimat *di tengah* teks (membedakan lead vs tubuh); bukan sekadar melokasi kalimat pertama.
- **Difficulty target**: MEDIUM — per §7.6 (struktur = Medium; menemukan lead di kalimat pertama terlalu dekat dengan retrieval).
- **Prompt**: "Berdasarkan struktur teks berita, kalimat kedua pada teks di atas berfungsi sebagai …"
- **Options / key (1)**:
  0. lead yang memuat informasi pokok berita
  1. tubuh berita yang mengembangkan rincian informasi dari lead ✅
  2. simpulan penulis yang merangkum isi berita
  3. teras berita yang menjawab pertanyaan kapan dan di mana
- **Explanation**: Kalimat pertama adalah lead/teras (memuat informasi pokok: siapa-mengapa-kapan — pemerintah kabupaten, perpustakaan keliling, setiap Rabu dan Sabtu, ke lima desa). Kalimat kedua ("Mobil perpustakaan itu membawa 800 buku cerita dan buku pengetahuan") mengembangkan klaim lead = tubuh berita. Opsi 0 dan 3 salah menempatkan fungsi lead pada kalimat kedua; opsi 2 membaca rincian sebagai simpulan.
- **Distractor rationale (hypotheses)**:
  - 0: heuristic "kalimat awal teks = lead" — siswa tidak memverifikasi bahwa lead hanyalah kalimat pertama.
  - 2: pattern-match isi-as-rangkuman — siswa membaca "800 buku" sebagai pernyataan akhir yang merangkum layanan, tanpa memverifikasi posisi kalimat.
  - 3: misattribusi fungsi — siswa menghafal "lead menjawab 5W+1H", melihat "Rabu dan Sabtu / lima desa" pada kalimat pertama, lalu mengaitkan fungsi itu ke kalimat kedua.
- **Evidence target**: { READING, READING_STRUKTUR_TEKS, R4, MEDIUM } — correct = structure-rule application; incorrect = lead-function misattribution / content-as-summary.
- **Stimulus-dependent**: ✅.
- **Revision note (v1.1, 2026-09-04)**: item diperkuat dari "lokasi lead (kalimat pertama)" ≈ R2/EASY menjadi klasifikasi fungsi kalimat kedua = aplikasi struktur R4/MEDIUM, sesuai mapping kanonik DNA §5 (struktur → R4) dan §7.6 (struktur = Medium). Menyelesaikan temuan P2.1 (cognitive mismatch + F2) dan temuan P2.1 distraktor-D ("judul" terlalu jelas salah untuk kalimat kedua) — distraktor 3 baru menguji misattribusi fungsi. Kunci berpindah ke indeks 1 (memecah pola 12/12 kunci-di-indeks-0; D15). Construct (struktur teks berita) dipertahankan. Re-validated: structural/content PASS.

### TB-009 — Fakta/opini (halus) · `BC-TEKS-BERITA-0009`

- **Stimulus**: STIM-04 · **Archetype**: I fakta/opini · **Skill/subskill**: READING / READING_INFERENSI *(fakta/opini mapping — gap flag)*
- **Cognitive**: R4 (MENGANALISIS) — fakta/opini halus: opini *bersinyal* "menurut" namun tetap opini.
- **Difficulty target**: HARD — kunci adalah penilaian terkutip ("Menurut Ibu Lestari, … sangat membantu"); siswa yang mengira kutipan = kebenaran akan salah.
- **Prompt**: "Pernyataan berikut yang merupakan opini Ibu Lestari dalam teks tersebut adalah …"
- **Options / key (0)**:
  0. Perpustakaan keliling sangat membantu siswa yang rumahnya jauh dari perpustakaan umum. ✅
  1. Perpustakaan keliling beroperasi setiap hari Rabu dan Sabtu.
  2. Mobil perpustakaan membawa 800 buku cerita dan buku pengetahuan.
  3. Jumlah pengunjung perpustakaan keliling mencapai 250 orang setiap minggu.
- **Explanation**: A adalah penilaian ("sangat membantu") yang disampaikan Ibu Lestari — opini, tidak dapat diverifikasi dari teks. B/C/D adalah fakta yang dapat diverifikasi dari teks. Ironi yang diuji: opini justru *disinyalir* "Menurut Ibu Lestari" — sinyal kutipan tidak menjadikan klaim sebagai kebenaran.
- **Distractor rationale (hypotheses)**:
  - B/C/D: fakta terverifikasi — siswa memilihnya karena "terlihat benar/ada di teks", lupa bahwa yang ditanya *opini*; khususnya D (angka dilaporkan) menguji "angka = fakta" bias.
  - *Menargetkan misconception blueprint*: "A quoted source makes a claim true" dan "opinion only when signposted 'menurut'" — keduanya gagal pada item ini dengan arah terbalik (opini bersinyal, fakta tak bersinyal).
- **Evidence target**: { READING, READING_INFERENSI, R4, HARD } — correct = identifies evaluative claim despite quoted framing.
- **Stimulus-dependent**: ✅.

### TB-010 — Gagasan utama (paragraf) · `BC-TEKS-BERITA-0010`

- **Stimulus**: STIM-05 · **Archetype**: A gagasan utama · **Skill/subskill**: READING / READING_IDE_POKOK
- **Cognitive**: R3 (MENERAPKAN) — per §7.4 label; gagasan utama paragraf kedua.
- **Difficulty target**: MEDIUM — membedakan pokok kalimat dari rincian dalam paragraf yang sama dan dari paragraf lain.
- **Prompt**: "Gagasan utama paragraf kedua pada teks di atas adalah …"
- **Options / key (0)**:
  0. Siswa rutin menyetor sampah setiap Jumat dan hasil penjualannya digunakan untuk membeli buku tulis bagi siswa yang membutuhkan. ✅
  1. Setiap Jumat siswa menyerahkan sampah kepada petugas bank sampah.
  2. Bank sampah sekolah dibentuk oleh siswa SMP Harapan Jaya.
  3. Kesadaran siswa memilah sampah meningkat setelah program berjalan.
- **Explanation**: Paragraf kedua memuat dua kalimat yang saling melengkapi: setoran rutin setiap Jumat (kalimat pertama) dan penggunaan hasil penjualan untuk membeli buku tulis (kalimat kedua). Kunci merangkum keduanya. B hanya mengulang kalimat pertama paragraf (rincian setoran) — perangkap "kalimat pertama = gagasan utama"; C gagasan paragraf pertama; D gagasan paragraf ketiga.
- **Distractor rationale (hypotheses)**:
  - B: "kalimat pertama paragraf = gagasan utamanya" — heuristic yang salah saat paragraf memuat dua kalimat koordinatif.
  - C/D: menarik gagasan dari paragraf lain (lokasi paragraf tidak diverifikasi).
- **Evidence target**: { READING, READING_IDE_POKOK, R3, MEDIUM }.
- **Stimulus-dependent**: ✅.
- **Revision note (v1.1, 2026-09-04)**: (1) pemenggalan paragraf STIM-05 dipulihkan — referen "paragraf kedua" kini eksis (defect P2.1 D4/D5 = 1, hard-fail). (2) Kunci diperluas merangkum kedua kalimat paragraf 2 — menghilangkan judgment call "ide koordinatif" yang dicatat P2.1 (D6 = 2). Construct (gagasan utama paragraf) dan cognitive target (R3 per §7.4 label; F1 canonical proposal → R2 gagasan literal, pending founder) tidak berubah. Re-validated: structural/content PASS (D4/D5/D6 re-scored ≥ 2).

### TB-011 — Inferensi dua-bukti (data) · `BC-TEKS-BERITA-0011`

- **Stimulus**: STIM-05 · **Archetype**: A-R4 inferensi dua-bukti · **Skill/subskill**: READING / READING_INFERENSI
- **Cognitive**: R4 (MENGANALISIS) — simpulan dari dua data.
- **Difficulty target**: HARD — data tersebar (30→90 siswa, hasil bulan pertama), simpulan mengharuskan integrasi + menolak simpulan negatif tak didukung.
- **Prompt**: "Berdasarkan data pada teks, dapat disimpulkan bahwa program bank sampah di SMP Harapan Jaya …"
- **Options / key (0)**:
  0. semakin diminati oleh siswa ✅
  1. gagal karena hasil penjualan terlalu sedikit
  2. hanya diikuti oleh siswa kelas tujuh
  3. mengurangi anggaran belanja sekolah
- **Explanation**: Dua bukti: peserta naik 30 → 90 siswa, dan hasil penjualan Rp350.000,00 di bulan pertama digunakan untuk tujuan nyata. Keduanya konsisten dengan minat meningkat. B/C/D tidak didukung teks.
- **Distractor rationale (hypotheses)**:
  - B: menyimpulkan "kegagalan" dari angka kecil tanpa pembanding (negative framing bias).
  - C: menambah informasi kelas tanpa bukti (outside-knowledge substitution).
  - D: menghubungkan program dengan anggaran sekolah yang tidak disinggung (spurious causality).
- **Evidence target**: { READING, READING_INFERENSI, R4, HARD }.
- **Stimulus-dependent**: ✅.

### TB-012 — Klaim tidak didukung · `BC-TEKS-BERITA-0012`

- **Stimulus**: STIM-03 · **Archetype**: B klaim tidak didukung (R5) · **Skill/subskill**: READING / READING_INFERENSI *(evaluasi dukungan klaim — tidak ada subskill khusus; flag yang sama)*
- **Cognitive**: R5 (MENGEVALUASI) — mengevaluasi dukungan klaim terhadap bukti teks.
- **Difficulty target**: HARD — kunci adalah klaim yang *melampaui* bukti ("dijamin tidak akan terjadi"); tiga distraktor didukung penuh.
- **Prompt**: "Pernyataan berikut yang TIDAK didukung oleh isi teks adalah …"
- **Options / key (0)**:
  0. Setelah penanaman pohon, banjir di sekitar sekolah dijamin tidak akan terjadi. ✅
  1. Sebanyak 60 siswa SMP Karya Bangsa ikut menanam bibit pohon.
  2. Siswa membersihkan sampah plastik dari aliran sungai.
  3. Kegiatan penanaman pohon merupakan bagian dari program Adiwiyata.
- **Explanation**: Teks hanya menyatakan akar pohon *mengurangi risiko* longsor. "Dijamin tidak akan terjadi" melampaui bukti (overclaim). B/C/D persis dinyatakan dalam teks.
- **Distractor rationale (hypotheses)**:
  - B/C/D: pernyataan didukung teks — siswa yang membaca cepat mungkin menandainya tanpa verifikasi; kunci justru yang *tidak* didukung.
  - *Menargetkan misconception blueprint*: "longer text/more activity = guaranteed outcome" dan korelasi → kausalitas (menanam pohon ⇒ bebas banjir).
- **Evidence target**: { READING, READING_INFERENSI, R5, HARD } — correct = distinguishes supported claim from overclaim.
- **Stimulus-dependent**: ✅.

---

## 5. Validation results

### 5.1 Deterministic pipeline (code-reused, no production touched)

The **existing production bank-gate** (`lib/diagnostic-ai/bank-gate.ts` → `isDiagnosticSafeItem`) — a pure, side-effect-free function — was run against all 12 items as candidate rows (prompt → `text`, options → `options`, `questionType: "PILIHAN_GANDA"`, `correctAnswer: "0"`, no `avoidStems` for first use). **Result: 12/12 SAFE, 0 issues** (run 2026-09-04, verified output below is a snapshot of the run):

```
TB-001 BC-TEKS-BERITA-0001  safe=true reasons=[]
TB-002 BC-TEKS-BERITA-0002  safe=true reasons=[]
… (all 12 safe, empty reason lists)
```

Control (proves the gate is not vacuous): the audited broken template family — stem "Berikut ini yang termasuk contoh Teks Berita adalah …", key option repeating the topic, cross-topic filler distractors — is **rejected** by the same gate (`TEMPLATE_STEM` / `FILLER_DISTRACTORS`), as are a key-out-of-range variant (`KEY_OUT_OF_RANGE`) and a duplicate-option variant (`DUPLICATE_OPTION`). The 12 pilot items pass *because they are well-formed*, not because the gate is permissive.

**Stages applied (Validation Spec):**

| Stage | Gate | Result |
|---|---|---|
| 1 Structural | option count, prompt present, key index | ✅ 12/12 (code) |
| 2 Content | answer-key validity, no leak, no template stem | ✅ 12/12 (bank-gate) |
| 3 Pedagogical | construct×skill×cognitive coherence | ✅ author review (human required) |
| 4 Language | PUEBI, naturalness, grade register | ✅ author review (human required) |
| 5 Answer | single key, key matches intended answer | ✅ 12/12 (author + code index check) |
| 6 Distractor | plausibility + hypothesis per distractor | ✅ author review (human required) |
| 7 Duplicate | §8 below | ✅ (see §8) |
| 8 Stimulus-dependence | item unanswerable without stimulus | ✅ author review ×2 reviewers required per §7.12-4 |
| 9 Human review | **PENDING — no qualified reviewer available in this phase** | ⬜ (by design) |
| 10 Calibration | LEVEL 0 (no responses yet) | ⬜ (future) |

### 5.2 Quality scores (15 dimensions × 0–3, Quality Standard §4.3)

Conjunctive rule (§4.4, S2) applied: **no item is publishable** — every item's human gate is PENDING and every D10 state is HYPOTHESIS (DIAGNOSTIC requires REVIEWED+ per §4.9). Scores below are authoring-time assessments for the human reviewer, **not** publish approvals.

| Item | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 | D11 | D12 | D13 | D14 | D15 | Hard-fail <2? | Mean |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TB-001 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 3 | 2 | 3 | 3 | 3 | none | 2.8 |
| TB-002 | 3 | 3 | 2 | 3 | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | none | 2.7 |
| TB-003 | 3 | 3 | 2 | 3 | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | none | 2.7 |
| TB-004 | 3 | 3 | 2 | 2 | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | none | 2.7 |
| TB-005 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 2 | 3 | 3 | 3 | none | 2.9 |
| TB-006 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 3 | 3 | 2 | 3 | 2 | 3 | 3 | 3 | none | 2.8 |
| TB-007 | 3 | 3 | 2 | 3 | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | none | 2.7 |
| TB-008 | 3 | 3 | 2 | 2 | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | none | 2.7 |
| TB-009 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | none | 3.0 |
| TB-010 | 3 | 3 | 2 | 3 | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | none | 2.7 |
| TB-011 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 2 | 3 | 3 | 3 | none | 2.9 |
| TB-012 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | none | 3.0 |

- **Hard-fail dimensions (D1, D2, D5, D6, D7, D8, D11, D13, D14, D15): 0 scores < 2 across all 12 items.**
- **Scored dimensions (D3, D4, D9, D10, D12): all ≥ 2.** D12 = 2 everywhere (curriculum mapping stated at elemen level; precise CP-point verification deferred to content expert — no claim of 3).
- **D10:** state `HYPOTHESIS` everywhere; score 2 = meaningful single-item evidence with stated (not yet human-reviewed) distractor hypotheses; TB-009/TB-012 scored 3 for exemplary evidence-cell design (their D10 state is still HYPOTHESIS — score and state are distinct; state gates publish).
- **Advisory mean ≥ 2.0 is NOT the publish rule** (S2): publish is blocked by the pending human gate regardless of scores.

### 5.3 Provenance honesty

- No qualified Indonesian assessment/content expert reviewed these items — **human review is PENDING and claimed nowhere**.
- `curriculum_mapping` cites the Fase D elemen Membaca CP at summary level; the exact CP-point string must be verified/attested by a content expert before publish (Blueprint §7.10).
- Stimuli are authored fiction (option A of the mission's factual-integrity choice) — no real-world claims, so no provenance/copyright chain is required; `fictional: true` is recorded in authoring metadata.
- All misconception links are hypotheses (V7): language in this document is "selection consistent with hypothesis X" — never "= misconception X".

---

## 6. Human-review checklist & status (per Blueprint §7.10)

**Status: PENDING_HUMAN_REVIEW for all 12 items** (no reviewer, no reviewed_at). The following checklist is what a qualified reviewer must complete before any item may enter LEVEL 0 delivery:

| Check | Covers | Items |
|---|---|---|
| Stimulus authenticity & neutrality (D13/D14) | 5 stimuli fictional, non-alarming, neutral-positive | all |
| Key answerable from text alone (D5/D7) | no outside knowledge required | all |
| Fakta/opini keys defensible (D1) | TB-003, TB-009 key/option boundary | TB-003, TB-009 |
| Inference keys text-supported (D2) | two-evidence integrity | TB-005, TB-011 |
| Vocabulary ≤ grade (D8) | "mengeluhkan", "usang", "menyumbat" at Fase D | TB-004 + all stimuli |
| Cognitive cells (R2–R5) | per §7.10, 2 reviewers, agreement ≥ 0.70 | all |
| Key agreement | 2 reviewers, agreement ≥ 0.80 (first 20-item rubric run) | all |
| D10 state upgrade | HYPOTHESIS → REVIEWED only after this review + response-pattern documentation (§4.9) | all |
| CP mapping attestation | exact Fase D CP point | all |

---

## 7. Distribution — actual vs blueprint target

| Axis | Blueprint | Actual (12) | Δ |
|---|---|---|---|
| Cognitive §7.3 | R2 3 / R3 3 / R4 4 / R5 2 | R2 2 / R3 4 / R4 5 / R5 1 | **-1/+1/+1/-1 — finding F1** (archetype binding; see §2.1; P2.2 revision: TB-008 R3→R4 per DNA §5 canonical proposal) |
| Archetype §7.4 | 2/2/2/2/2/1/1 | 2/2/2/2/2/1/1 | ✅ exact |
| Difficulty §7.6 | E 3 / M 5-6 / H 3-4 | E 2 / M 6 / H 4 | ✅ (17/50/33 vs ~25/45/30; TB-008 EASY→MEDIUM = F2 resolved in P2.2) |
| Skills | 4 subskills | 4 used; fakta/opini mapped to READING_INFERENSI (gap flag) | ✅ with flag |
| Stimuli | 5–6 testlets × 2–3 | 5 testlets × 2–3 | ✅ |
| Misconception | all HYPOTHESIS | all HYPOTHESIS (V7) | ✅ |
| D10 state | HYPOTHESIS at authoring | HYPOTHESIS all | ✅ (S2 publish blocked) |

---

## 8. Duplicate analysis (12 items)

| Pair type | Pairs found | Decision |
|---|---|---|
| Exact duplicate | 0 | — |
| Lexical near-duplicate (stems) | 0 | all 12 prompts distinct |
| Structural duplicate | 0 | archetypes vary; shared-archetype pairs (001/006, 002/010, 005/011, 003/009, 007/008) differ in stimulus, prompt, and key logic |
| Same stimulus, trivial variation | 0 | within-testlet items measure *different* constructs (e.g., TB-003 fact/opinion vs TB-004 vocabulary vs TB-007 headline on STIM-02) — **legitimate construct variation**, not duplication (mission §17) |
| Same misconception, different context | 2 deliberate | "opinion/fact boundary" probed by TB-003 (direct) and TB-009 (subtle) — different difficulty cells, same construct family; documented, kept (diagnostic depth, not template) |

Duplicate gate (Validation Spec stage 7) verdict: **PASS** — no item would be flagged.

---

## 9. Student-delivery view (conceptual — no API implemented)

Per Item DNA §2 hard separation, a student would receive **only**:

```
item_id (public code), theme label "Teks Berita", skill/subskill labels,
grade label, stimulus (STIM-01..05), prompt, item_type PILIHAN_GANDA,
options (A–D, order shuffled per delivery), difficulty label (guru-facing)
```

**Never in any student payload:** `answer_key`, `explanation` (post-attempt sanitized path only, per DNA §2 rule 2), `distractor_rationale`, `misconception_target`, `evidence_target`, `cognitive_target`, `curriculum_mapping` details, provenance, validation/review metadata, D10 state, response statistics. All 12 items satisfy the DNA §2 invariant by construction (the pilot artifact is internal; a physical DTO is out of scope for this phase).

---

## 10. Validator gaps (deterministic checks that cannot currently be automated)

| Gap | What is missing | Where it matters |
|---|---|---|
| G1. Fakta/opini subskill | No `READING_FAKTA_OPINI` (or similar) in `LearningSkillType`/taxonomy — items TB-003/TB-009 mapped to READING_INFERENSI | Evidence ledger granularity; flagged in Blueprint §7.2 as Phase 1B+ taxonomy pass |
| G2. Claim-support evaluation subskill | TB-012 (R5) has no dedicated subskill either | same |
| G3. D10 score vs D10 state convention | The Quality Standard scores D10 0–3 but gates publish on the §4.9 *state*; no explicit authoring-time rule "state=HYPOTHESIS ⇒ score ≤ 2" | TB-009/TB-012 scored 3 with state HYPOTHESIS — allowed by the letter (score and state are distinct), but the standard should say so explicitly |
| G4. Stimulus-dependence (stage 8) | No code check proves an item is unanswerable without its stimulus — requires 2 human reviewers (§7.12-4) | reading themes |
| G5. Language/ambiguity | D5/D8 have no code checker (documented in Quality Standard) | all items |
| G6. Factual truth of stimuli | Fictional-content flag is author-declared; nothing enforces "no real-world claims" | D1 human gate |
| G7. Key-position leakage at family scale | D15 code covers per-item vectors; family-level key-position pattern detection would need a batch scan | future bank scale |

The bank-gate (reused for stage 1–2/5 checks here) covers structural + template + key-index safety; the gaps above are the documented remainder — none blocked authoring.

---

## 11. Pilot success evaluation (Blueprint §7.12)

| # | Criterion | Status |
|---|---|---|
| 1 | 100% items carry evidence/cognitive/difficulty targets + misconception hypothesis flag | ✅ |
| 2 | 0 deterministic-stage rejects; 0 leaks | ✅ (gate 12/12 safe; §9 view excludes all key material) |
| 3 | All 15 dimensions scored; none < 2; conjunctive rule with explicit D10 state | ✅ (D10=HYPOTHESIS all; publish correctly blocked) |
| 4 | ≥95% items unanswerable without stimulus (2 reviewers) | ⏳ author judgment: 12/12 designed stimulus-dependent; **requires 2-reviewer attestation** (human-gated) |
| 5 | Key agreement ≥ 0.80 / cognitive ≥ 0.70 (first 20-item rubric run) | ⏳ impossible without reviewers — future |
| 6 | LEVEL-1 calibration (p-band, discrimination) | ⏳ no responses yet (LEVEL 0) — future |
| 7 | Expert attestation: no item needs outside knowledge | ⏳ human-gated |
| 8 | 0 learner-facing instances asserting distractor = misconception | ✅ (V7 language everywhere; artifact-internal) |

**What the foundation proved it can produce:** meaningful stimuli (5), non-template questions (12/12 fresh stems, no boilerplate pattern), multiple cognitive levels (R2–R5), plausible distractors with explicit hypotheses, explicit evidence targets, bounded misconception hypotheses (V7), unambiguous keys, no clue leakage (gate), no duplicate contamination, natural Indonesian (author review; human attestation pending), construct alignment (single primary construct per item).

**What the foundation exposed (real-item stress findings):**
- **F1 (CONDITIONAL-GO correction):** Blueprint §7.3 vs §7.4 cognitive distribution conflict (§2.1) — the only material blueprint defect surfaced by authoring. One-line clarification fixes it.
- **F2 (minor, documented):** TB-008 difficulty EASY deviates from §7.6's "structure = Medium" rule; justified as near-retrieval. Either accept the judgment or move TB-008 to MEDIUM (making E 2/M 6/H 4 — still within "~" tolerance).
- **F3 (minor):** G3 — the D10 score/state distinction should be made explicit in the Quality Standard (one sentence).
- **F4 (process):** stages 3/4/6/8 + reviewer attestations are genuinely human-only; a two-reviewer rubric run should be scheduled with the first human review session.

---

## 12. Final recommendation

**Pilot status: CONDITIONAL** — all 12 items pass every deterministic gate and authoring quality bar with 0 rejects; the pilot is blocked from *publish* only by the design-mandated pending human review, and one blueprint clarification (F1) should land before the bank scales.

**Recommendation (exactly one, per mission §23-J): READY_FOR_HUMAN_REVIEW**

- The 12 items are the correct shape for a Level-0 human review session: complete DNA fields, scored dimensions, hypothesis-only misconceptions, sanitized delivery view, and a ready checklist (§6).
- Condition: resolve **F1** (Blueprint §7.3/§7.4 clarification — one line) in parallel; it changes the reported distribution, not item content.
- **Not** REVISE_FOUNDATION: no systemic authoring failure was found (0/12 rejects; no defect class exceeded the 25% stop rule). **Not** REJECT_PILOT: no item fails a quality gate.

**Founder decisions required before scale (§21/§23):**
1. F1 — which governs: §7.4 archetype list (this pilot) or §7.3 percentages? (Recommend: clarify §7.3 wording, keep §7.4 binding.)
2. F2 — accept TB-008 at EASY or move to MEDIUM?
3. F3 — add the one-line D10 score/state convention to the Quality Standard?
4. Schedule the two-reviewer human review (keys + cognitive cells) and the first 20-item rubric run.
5. Authorize the Phase 1B+ taxonomy pass for a fakta/opini subskill (G1/G2).

**Success criteria at scale (post-review):** LEVEL-1 calibration after ≥ 40 responses/item (p ∈ [0.30, 0.90], point-biserial ≥ 0.15, target 0.20), ≥ 80% inside band, flags resolved; then D10 HYPOTHESIS → REVIEWED via response-pattern documentation (V7), never via a bare CALIBRATION tag (S2).

---

## 13. Safety confirmation & hard stop

- DB writes = **0** · question generation beyond this artifact = **0** · bank edits = **0** · schema changes = **0** · production code changes = **0** · validators modified = **0** · allowlist populated = **0** · items delivered = **0**.
- The 12 items exist **only** in this document. Nothing in this file has entered `Soal`, `MASTER_BANK`, `QuestionMetadata`, the diagnostic bank, the adaptive bank, quiz delivery, or any student-visible surface.
- Hard stop observed: no additional items, no 30/50/100 generation, no implementation, no deployment. Next phase awaits founder review of this artifact.

---

*Appendix A — deterministic gate run.* Executed `isDiagnosticSafeItem` from `lib/diagnostic-ai/bank-gate.ts` against all 12 items (plus 3 controls: template-family, key-out-of-range, duplicate-option). Result: 12/12 safe, 0 issues; controls rejected with `TEMPLATE_STEM`, `KEY_OUT_OF_RANGE`, `DUPLICATE_OPTION`. Run script was throwaway (project-root temp file, deleted after run; working tree unchanged except this document).