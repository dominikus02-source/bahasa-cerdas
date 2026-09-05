# Teks Berita Pilot V1 — Human Review Pack

**Phase**: P2.3 · **Subject**: `docs/question-bank-pilot/TEKS_BERITA_PILOT_V1.md` (12 items, 5 stimuli) — **FROZEN review candidate**
**Date**: 2026-09-05 · **Pack status**: READY_FOR_TWO_REVIEWER_HUMAN_SESSION
**Companion documents (review-only)**: `TEKS_BERITA_PILOT_V1_REVIEW_KEY.md` (answer key + explanations — keep SEPARATE from reviewers during blind mode) · `P2_3_HUMAN_REVIEW_LOG.md` (reviewer records)

**This pack is designed to be used WITHOUT reading the foundation documents first.** All governing rules a reviewer needs are in §4–§5. Deeper sources: Quality Standard (§4.3 dimensions, §4.4 publish rule, §4.8/§4.9 V7+D10), Item DNA (§2 authoring-vs-delivery separation, §5 R-mapping), Validation Spec (stage pipeline), Blueprint §7 (pilot contract), `P2_1_HUMAN_REVIEW_REPORT.md` (first structured review), `P2_2_REVISION_AND_FOUNDER_DECISION_REPORT.md` (revisions + F1 proposal).

---

## 1. Purpose

Twelve real Teks Berita items are being tested as a **pilot** for the BahasaCerdas question-bank rebuild. The foundation (Blueprint + Item DNA + Quality Standard + Validation Spec) claims it can produce genuinely high-quality, diagnostic, non-template assessment items. The pilot exists **only** as a review artifact:

- It has **never** entered `Soal`, `MASTER_BANK`, `QuestionMetadata`, any delivery bank, or any student-visible surface.
- Nothing in this pack authorizes delivery. Publish remains blocked until every gate in §10 is passed.
- Your review decides whether these 12 items are worthy of a BahasaCerdas student — not whether they "look fine."

The items passed deterministic structural gates (bank-gate: 12/12 safe, controls rejected) and an AI-assisted authoring review (12/12, 0 rejects, average 15-dimension mean 2.63). **Those results are inputs to your judgment, not substitutes for it.** A structurally valid bad question is still bad.

## 2. Review Status

| Gate | State |
|---|---|
| Structured (AI-assisted) review | **COMPLETE** — P2.1 (found defects) → P2.2 (repaired TB-003/TB-004/TB-008/TB-010, re-validated 12/12) |
| Human review | **NOT STARTED** — no qualified reviewer has read these items; no human approval claimed anywhere |
| Founder approval | **PENDING** — F1 proposal (§3) awaits founder sign-off |
| Deterministic gates | ✅ 12/12 safe (structural + bank-gate; controls rejected) |
| D10 state | HYPOTHESIS on all 12 (publish blocked per S2/§4.9) |
| Publish | **BLOCKED** — by design, until human approval + D10 ≥ REVIEWED (DIAGNOSTIC purpose) |

## 3. F1 Decision

**F1_STATUS = PROPOSED_PENDING_FOUNDER_SIGNOFF** — no explicit founder decision is stored anywhere in the repository (re-verified in P2.1 and P2.2). The following is a *proposal*; it becomes binding only when the founder signs the approval statement at the end of this section. Do not treat it as resolved.

**The conflict** (Blueprint internal):
- **§7.3** (cognitive percentages): "R2 ~25% (eksplisit/lead) · R3 ~25% (struktur, kosakata-dalam-konteks) · R4 ~35% (gagasan, inferensi, fakta/opini halus) · R5 ~15% (evaluasi dukungan klaim)" → 12 items: R2=3, R3=3, R4=4, R5=2.
- **§7.4** (archetype list): 2× eksplisit · 2× gagasan utama/lead **(R3)** · 2× inferensi dua-bukti · 2× fakta/opini · 2× struktur · 1× kosakata · 1× klaim **(R5)** → by its own labels: R2=2, R3=5, R4=4, R5=1.
- **Item DNA §5** (self-declared canonical R-mapping): informasi tersurat/gagasan literal **R2** · kosakata-dalam-konteks **R3** · struktur **R4** · inferensi **R4** · fakta/opini **R5** · evaluasi klaim **R5**.

**Proposed canonical rule (P2.2 §2):**
1. Blueprint §7.4 archetype list is the **binding** per-item architecture (concrete, satisfiable — the pilot hit it exactly).
2. Item DNA §5 is the **single canonical R-mapping** for every item (cells above).
3. Blueprint §7.3 percentages are **advisory** ("~"), not a binding quota.

**Impact if signed**: 5 items relabel (content untouched) — TB-002 R3→R2, TB-003 R4→R5, TB-007 R3→R4, TB-009 R4→R5, TB-010 R3→R2; pilot distribution becomes R2=4/R3=1/R4=4/R5=3; one-line Blueprint §7.3 clarification in a separate docs phase.

**Impact on your review**: content, stimulus, stem, options, and key are **unaffected by F1 either way**. Only the cognitive-cell scoring (D3, §5 rubric item 7) depends on which mapping is canonical. **If the founder has not signed F1 before you score cognitive cells, mark the cell F1-CONDITIONAL instead of PASS/FAIL.**

> **F1 APPROVAL STATEMENT** (candidate — to be signed by the founder, not by any reviewer):
> "Saya, ____________________ (founder), menyetujui resolusi F1: daftar arketipe Blueprint §7.4 adalah kontrak per-item yang mengikat, Item DNA §5 adalah satu-satunya pemetaan kognitif kanonik, dan persentase Blueprint §7.3 bersifat advisory."
> Tanda tangan: ____________________ · Tanggal: ____________________
> *F1 remains PROPOSED_PENDING_FOUNDER_SIGNOFF until this statement is signed and stored in the repository.*

## 4. Reviewer Instructions

1. **Judge independently.** Reviewers A and B work separately and do not share verdicts until both have submitted forms (§7).
2. **Do not treat the AI review as authority.** The §2 "structured review COMPLETE" line tells you the items survived deterministic + authoring checks. It does not make any verdict correct. Your own reading of the item is the only evidence that counts for your verdict.
3. **Do not assume the AI's 0–3 scores are right.** Score the item yourself, from the item.
4. **Do not modify any item.** If you find a defect, record it in your review form. Fixes are a separate phase.
5. **No benefit of the doubt.** If an answer is ambiguous, a distractor is defensible as correct, or the stem is unclear — mark it. "Probably fine" is a REVISE.
6. **Blind review mode (default).** The answer key and explanations are in `TEKS_BERITA_PILOT_V1_REVIEW_KEY.md` — do not open it until you have completed your per-item Content/Pedagogy/Diagnostic verdicts. Score first, then check the key. If you find you cannot judge "single defensible answer" without the key, that is itself a finding (record it).
7. **Use exact terminology.** PASS / REVISE / FAIL for Content/Pedagogy/Diagnostic; YES/NO for key-valid, single-answer, cognitive-match. No invented categories.
8. **Hypothesis semantics.** Any distractor you believe targets a student error is a *hypothesis* ("selection consistent with hypothesis X"), never a proven misconception. No response data exists (LEVEL 0).
9. **Cognitive cells.** If F1 is unsigned (see §3), score cognitive match as F1-CONDITIONAL where the mapping choice matters.
10. **Language.** You are reviewing as a professional Indonesian-language assessment reviewer: naturalness, grammar, register (Fase D / SMP kelas VIII), clarity, and freedom from template-driven phrasing.
11. **Time budget.** 12 items × ~15–20 minutes = 3–4 hours per reviewer for a thorough pass. Do not rush the last items.

## 5. Reviewer Rubric

Score each item on the 15 foundation dimensions (**0 = unacceptable, 1 = weak, 2 = acceptable, 3 = strong** — Quality Standard §4.3). HARD-FAIL dimensions may not score < 2 at publish; SCORED dimensions may score 1 only under the narrow CALIBRATION allowance (never for D10).

| # | Dimension | Type | What to check |
|---|---|---|---|
| D1 | Content correctness | HARD | Facts/claims correct; key genuinely correct against the text |
| D2 | Construct alignment | HARD | Item measures the declared construct, not something else |
| D3 | Cognitive demand | SCORED | Operation matches the claimed R-cell (see §3 F1) |
| D4 | Stimulus quality | SCORED | Stimulus necessary, sufficient, coherent, no filler |
| D5 | Question clarity | HARD | Stem unambiguous, single referent, no double-barrel |
| D6 | Answer-key validity | HARD | Exactly one defensible answer; key follows textual evidence |
| D7 | Distractor quality | HARD | Distractors plausible, on-construct, each with a sensible error hypothesis; none obviously wrong; none defensible as correct |
| D8 | Language quality | HARD | Natural Indonesian, PUEBI, grade register, no template phrasing |
| D9 | Difficulty integrity | SCORED | Author-claimed difficulty (LEVEL 0 judgment) consistent with stimulus complexity, inference depth, vocabulary |
| D10 | Diagnostic value | SCORED | A wrong response yields useful signal about a specific skill; **state** = HYPOTHESIS (no response data) |
| D11 | Originality / duplicate risk | HARD | Not a copy/near-copy of another item or the legacy template bank |
| D12 | Curriculum alignment | SCORED | Consistent with Fase D elemen Membaca CP; no contradiction |
| D13 | Cultural / contextual appropriateness | HARD | Neutral-positive, non-alarming, no sensitive content |
| D14 | Bias / fairness | HARD | No group bias; fair to all students regardless of background |
| D15 | Security / answer-leakage risk | HARD | No clue in stem/options; no answer-position pattern; key not inferable |

**Additional review axes** (record in the item's review form):
- **Stimulus-dependence**: could a student answer without the stimulus? If yes — FAIL on D2/D4.
- **Single-best-answer integrity**: is more than one option defensible? If yes — FAIL on D6.
- **Diagnostic value**: if a student picks distractor X, what does the system learn? If "nothing beyond right/wrong," D10 ≤ 1.

**D10 states** (foundation §4.9): `NOT_APPLICABLE` · `HYPOTHESIS` (author intent only) · `REVIEWED` (pedagogically reviewed, still no response data) · `EMPIRICALLY_SUPPORTED` (requires response-pattern/empirical analysis). **All 12 items are currently HYPOTHESIS.** Your review may justify upgrading a state to `REVIEWED` in the review log — never to `EMPIRICALLY_SUPPORTED`.

**Publish gate** (seven-clause conjunctive rule, §4.4/S2) — an item is publishable **only if all** hold: ① structurally valid · ② no HARD-FAIL dimension < 2 · ③ all SCORED dimensions ≥ 2 · ④ explicit D10 state (HYPOTHESIS never satisfies DIAGNOSTIC) · ⑤ human APPROVED · ⑥ purpose gates (§4.9) · ⑦ advisory mean tiers. **You are reviewing, not publishing** — your gate output is `HUMAN_APPROVED` / `HUMAN_APPROVED_WITH_REVISIONS` / `REVISE_PILOT` / `REVISE_FOUNDATION` / `REJECT_PILOT` (§10), never "PUBLISHABLE."

## 6. Individual Item Sheets

Each sheet shows the item **exactly as frozen** in the pilot (stimulus verbatim, options in authored order, no key marking). The correct answer is deliberately NOT shown here — see `TEKS_BERITA_PILOT_V1_REVIEW_KEY.md` after your own verdicts. Option letters A–D map to the pilot's index order 0–3.

**Common metadata (all 12 items)**: theme Teks Berita · grade Fase D (SMP kelas VIII) · item_type PILIHAN_GANDA (4 options, 1 key) · assessment_purpose DIAGNOSTIC (pilot) · source MANUAL (authored) · provenance AI_ASSISTED-draft, human ownership PENDING · curriculum Fase D · elemen Membaca · stimulus_type PASSAGE · difficulty evidence LEVEL 0 (author judgment only — no response data) · D10 state HYPOTHESIS · review_status PENDING_HUMAN_REVIEW · publication_status DRAFT (never ELIGIBLE/PUBLISHED).

---

### TB-001

- **ID**: BC-TEKS-BERITA-0001 · **Stimulus**: STIM-01 · **Skill/subskill**: READING / READING_INFORMASI_TERSURAT
- **Claimed construct**: 5W+1H explicit retrieval · **Claimed cognitive**: R2 (MEMAHAMI) · **Claimed difficulty**: EASY
- **Evidence target**: correct = tersurat retrieval; incorrect = scanning/attention error (MEDIUM confidence)

**Stimulus (STIM-01 — Perpustakaan Digital SMP Nusantara):**
> SMP Nusantara meresmikan perpustakaan digital pada Senin, 3 Maret 2025. Perpustakaan digital itu menyediakan 1.500 judul buku elektronik yang dapat dibaca siswa melalui gawai masing-masing. Kepala SMP Nusantara, Ibu Ratna Wulandari, mengatakan bahwa perpustakaan digital bertujuan menumbuhkan kebiasaan membaca siswa. "Kami ingin siswa membaca di mana pun, tidak harus datang ke ruang perpustakaan," ujarnya. Peresmian dihadiri perwakilan dinas pendidikan kabupaten. Ibu Ratna menambahkan bahwa penggunaan perpustakaan digital akan dievaluasi setiap tiga bulan. Dengan layanan ini, siswa tidak perlu lagi menunggu giliran meminjam buku di meja perpustakaan.

**Prompt:** "Kapan perpustakaan digital SMP Nusantara diresmikan?"

**Options:**
- A. Senin, 3 Maret 2025
- B. Senin, 3 Februari 2025
- C. Minggu, 16 Februari 2025
- D. Rabu, 3 Maret 2025

---

### TB-002

- **ID**: BC-TEKS-BERITA-0002 · **Stimulus**: STIM-01 · **Skill/subskill**: READING / READING_IDE_POKOK
- **Claimed construct**: main idea (lead) · **Claimed cognitive**: R3 per Blueprint §7.4 label (**F1-CONDITIONAL** — canonical proposal maps gagasan literal → R2) · **Claimed difficulty**: MEDIUM
- **Evidence target**: correct = distinguishes lead from detail; incorrect = detail-as-main-idea error (MEDIUM)

**Stimulus (STIM-01):**
> SMP Nusantara meresmikan perpustakaan digital pada Senin, 3 Maret 2025. Perpustakaan digital itu menyediakan 1.500 judul buku elektronik yang dapat dibaca siswa melalui gawai masing-masing. Kepala SMP Nusantara, Ibu Ratna Wulandari, mengatakan bahwa perpustakaan digital bertujuan menumbuhkan kebiasaan membaca siswa. "Kami ingin siswa membaca di mana pun, tidak harus datang ke ruang perpustakaan," ujarnya. Peresmian dihadiri perwakilan dinas pendidikan kabupaten. Ibu Ratna menambahkan bahwa penggunaan perpustakaan digital akan dievaluasi setiap tiga bulan. Dengan layanan ini, siswa tidak perlu lagi menunggu giliran meminjam buku di meja perpustakaan.

**Prompt:** "Pernyataan berikut yang paling tepat sebagai gagasan utama berita tersebut adalah …"

**Options:**
- A. Perpustakaan digital SMP Nusantara diresmikan untuk menumbuhkan kebiasaan membaca siswa.
- B. Perpustakaan digital menyediakan 1.500 judul buku elektronik bagi siswa.
- C. Perwakilan dinas pendidikan kabupaten menghadiri peresmian perpustakaan digital.
- D. Penggunaan perpustakaan digital akan dievaluasi setiap tiga bulan.

---

### TB-003

- **ID**: BC-TEKS-BERITA-0003 · **Stimulus**: STIM-02 · **Skill/subskill**: READING / READING_INFERENSI *(fakta/opini — no dedicated subskill; flagged taxonomy gap)*
- **Claimed construct**: fact/opinion discrimination (direct) · **Claimed cognitive**: R4 (**F1-CONDITIONAL** — canonical proposal maps fakta/opini → R5) · **Claimed difficulty**: MEDIUM
- **Evidence target**: correct = fact/opinion discrimination; incorrect = moral/predictive judgment substituting for text-verifiability (MEDIUM)

**Stimulus (STIM-02 — Gerakan "Sukamaju Membaca"):**
> Pemerintah Desa Sukamaju meluncurkan gerakan "Sukamaju Membaca" pada awal Februari 2025. Gerakan ini menyediakan 500 buku bacaan yang ditempatkan di pos ronda dan balai desa. Kepala Desa Sukamaju, Bapak Dedi Hartono, mengatakan bahwa minat baca warga meningkat sejak taman bacaan masyarakat dibuka dua tahun lalu. "Jumlah peminjam buku naik dari 40 menjadi 120 orang setiap bulan," jelasnya. Namun, pengelola taman bacaan mengeluhkan kondisi sebagian buku yang sudah usang. Mereka berharap pemerintah kabupaten memberikan bantuan buku baru.

**Prompt:** "Pernyataan berikut yang merupakan fakta berdasarkan teks tersebut adalah …"

**Options:**
- A. Gerakan "Sukamaju Membaca" menyediakan 500 buku bacaan di pos ronda dan balai desa.
- B. Minat baca warga Sukamaju akan terus meningkat pada tahun-tahun mendatang.
- C. Taman bacaan masyarakat Sukamaju adalah taman bacaan terbaik di kabupaten.
- D. Semua desa sebaiknya meniru gerakan "Sukamaju Membaca".

---

### TB-004

- **ID**: BC-TEKS-BERITA-0004 · **Stimulus**: STIM-02 · **Skill/subskill**: READING / READING_MAKNA_KATA (remapped in P2.2)
- **Claimed construct**: meaning-in-context · **Claimed cognitive**: R3 (MENERAPKAN) · **Claimed difficulty**: MEDIUM
- **Evidence target**: correct = context-driven meaning; incorrect = form-based guessing / context bleeding (MEDIUM)

**Stimulus (STIM-02):**
> Pemerintah Desa Sukamaju meluncurkan gerakan "Sukamaju Membaca" pada awal Februari 2025. Gerakan ini menyediakan 500 buku bacaan yang ditempatkan di pos ronda dan balai desa. Kepala Desa Sukamaju, Bapak Dedi Hartono, mengatakan bahwa minat baca warga meningkat sejak taman bacaan masyarakat dibuka dua tahun lalu. "Jumlah peminjam buku naik dari 40 menjadi 120 orang setiap bulan," jelasnya. Namun, pengelola taman bacaan mengeluhkan kondisi sebagian buku yang sudah usang. Mereka berharap pemerintah kabupaten memberikan bantuan buku baru.

**Prompt:** "Kata *mengeluhkan* dalam kalimat 'pengelola taman bacaan mengeluhkan kondisi sebagian buku yang sudah usang' bermakna …"

**Options:**
- A. menyampaikan keluhan tentang sesuatu
- B. memberikan saran perbaikan kepada pemerintah
- C. menceritakan pengalaman pribadi kepada orang lain
- D. meminta bantuan secara langsung kepada warga

---

### TB-005

- **ID**: BC-TEKS-BERITA-0005 · **Stimulus**: STIM-03 · **Skill/subskill**: READING / READING_INFERENSI
- **Claimed construct**: two-evidence inference · **Claimed cognitive**: R4 (MENGANALISIS) · **Claimed difficulty**: HARD
- **Evidence target**: correct = integrates two pieces of evidence; incorrect = overclaim, reversal, or outside-knowledge substitution (MEDIUM)

**Stimulus (STIM-03 — Penanaman Pohon di Bantaran Sungai):**
> Sebanyak 60 siswa SMP Karya Bangsa menanam 500 bibit pohon di bantaran sungai dekat sekolah pada Minggu, 16 Februari 2025. Kegiatan itu merupakan bagian dari program sekolah Adiwiyata. Guru pendamping, Ibu Sari Rahayu, menjelaskan bahwa akar pohon mampu menahan tanah sehingga dapat mengurangi risiko longsor saat hujan deras. Selain menanam, para siswa membersihkan sampah plastik yang menyumbat aliran sungai. Panitia kegiatan menyiapkan bibit dan alat tanam untuk setiap kelompok siswa. Kepala SMP Karya Bangsa berharap kegiatan serupa dapat dilakukan setiap bulan dengan melibatkan warga sekitar.

**Prompt:** "Berdasarkan teks, kegiatan siswa SMP Karya Bangsa pada Minggu, 16 Februari 2025 menunjukkan bahwa mereka …"

**Options:**
- A. peduli terhadap kelestarian lingkungan di sekitar sekolah
- B. ingin mengganti program Adiwiyata dengan kegiatan lain
- C. hanya mengikuti kegiatan karena diminta guru
- D. menolak membersihkan sampah di aliran sungai

---

### TB-006

- **ID**: BC-TEKS-BERITA-0006 · **Stimulus**: STIM-04 · **Skill/subskill**: READING / READING_INFORMASI_TERSURAT
- **Claimed construct**: 5W+1H explicit retrieval · **Claimed cognitive**: R2 (MEMAHAMI) · **Claimed difficulty**: EASY
- **Evidence target**: correct = tersurat retrieval ("siapa" sasaran); incorrect = outside-knowledge substitution (MEDIUM)

**Stimulus (STIM-04 — Perpustakaan Keliling):**
> Pemerintah kabupaten mengoperasikan perpustakaan keliling ke lima desa terpencil setiap hari Rabu dan Sabtu. Mobil perpustakaan itu membawa 800 buku cerita dan buku pengetahuan. Kepala Bidang Perpustakaan, Ibu Lestari Nugraha, menyampaikan bahwa jumlah pengunjung perpustakaan keliling mencapai 250 orang setiap minggu. "Sebagian besar pengunjung adalah pelajar sekolah dasar," katanya. Menurut Ibu Lestari, perpustakaan keliling sangat membantu siswa yang rumahnya jauh dari perpustakaan umum. Setiap desa menerima kunjungan mobil perpustakaan dua kali dalam sebulan. Buku yang dipinjam dapat dikembalikan pada kunjungan berikutnya.

**Prompt:** "Menurut teks, siapakah pengunjung terbanyak perpustakaan keliling?"

**Options:**
- A. Pelajar sekolah dasar
- B. Guru sekolah menengah
- C. Pegawai kantor kabupaten
- D. Orang tua siswa

---

### TB-007

- **ID**: BC-TEKS-BERITA-0007 · **Stimulus**: STIM-02 · **Skill/subskill**: READING / READING_STRUKTUR_TEKS
- **Claimed construct**: headline–lead mapping · **Claimed cognitive**: R3 (**F1-CONDITIONAL** — canonical proposal maps struktur → R4) · **Claimed difficulty**: MEDIUM
- **Evidence target**: correct = headline maps lead; incorrect = sensational/unsupported headline (MEDIUM)

**Stimulus (STIM-02):**
> Pemerintah Desa Sukamaju meluncurkan gerakan "Sukamaju Membaca" pada awal Februari 2025. Gerakan ini menyediakan 500 buku bacaan yang ditempatkan di pos ronda dan balai desa. Kepala Desa Sukamaju, Bapak Dedi Hartono, mengatakan bahwa minat baca warga meningkat sejak taman bacaan masyarakat dibuka dua tahun lalu. "Jumlah peminjam buku naik dari 40 menjadi 120 orang setiap bulan," jelasnya. Namun, pengelola taman bacaan mengeluhkan kondisi sebagian buku yang sudah usang. Mereka berharap pemerintah kabupaten memberikan bantuan buku baru.

**Prompt:** "Berdasarkan isi berita, judul yang paling tepat untuk teks tersebut adalah …"

**Options:**
- A. "Pemerintah Desa Sukamaju Luncurkan Gerakan Sukamaju Membaca"
- B. "Taman Bacaan Sukamaju Ditutup karena Sepi Pengunjung"
- C. "Minat Baca Warga Sukamaju Menurun Drastis"
- D. "Bantuan Buku Baru Telah Tiba di Sukamaju"

---

### TB-008

- **ID**: BC-TEKS-BERITA-0008 · **Stimulus**: STIM-04 · **Skill/subskill**: READING / READING_STRUKTUR_TEKS
- **Claimed construct**: inverted-pyramid sentence function (body vs lead) · **Claimed cognitive**: R4 (MENGANALISIS) — strengthened in P2.2 · **Claimed difficulty**: MEDIUM (moved from EASY in P2.2; F2 resolved)
- **Evidence target**: correct = structure-rule application; incorrect = lead-function misattribution / content-as-summary (MEDIUM)

**Stimulus (STIM-04):**
> Pemerintah kabupaten mengoperasikan perpustakaan keliling ke lima desa terpencil setiap hari Rabu dan Sabtu. Mobil perpustakaan itu membawa 800 buku cerita dan buku pengetahuan. Kepala Bidang Perpustakaan, Ibu Lestari Nugraha, menyampaikan bahwa jumlah pengunjung perpustakaan keliling mencapai 250 orang setiap minggu. "Sebagian besar pengunjung adalah pelajar sekolah dasar," katanya. Menurut Ibu Lestari, perpustakaan keliling sangat membantu siswa yang rumahnya jauh dari perpustakaan umum. Setiap desa menerima kunjungan mobil perpustakaan dua kali dalam sebulan. Buku yang dipinjam dapat dikembalikan pada kunjungan berikutnya.

**Prompt:** "Berdasarkan struktur teks berita, kalimat kedua pada teks di atas berfungsi sebagai …"

**Options:**
- A. lead yang memuat informasi pokok berita
- B. tubuh berita yang mengembangkan rincian informasi dari lead
- C. simpulan penulis yang merangkum isi berita
- D. teras berita yang menjawab pertanyaan kapan dan di mana

---

### TB-009

- **ID**: BC-TEKS-BERITA-0009 · **Stimulus**: STIM-04 · **Skill/subskill**: READING / READING_INFERENSI *(fakta/opini — no dedicated subskill; flagged taxonomy gap)*
- **Claimed construct**: fact/opinion discrimination (subtle — quoted opinion) · **Claimed cognitive**: R4 (**F1-CONDITIONAL** — canonical proposal maps fakta/opini → R5) · **Claimed difficulty**: HARD
- **Evidence target**: correct = identifies evaluative claim despite quoted framing; incorrect = "quoted = true" or "number = fact" bias (MEDIUM)

**Stimulus (STIM-04):**
> Pemerintah kabupaten mengoperasikan perpustakaan keliling ke lima desa terpencil setiap hari Rabu dan Sabtu. Mobil perpustakaan itu membawa 800 buku cerita dan buku pengetahuan. Kepala Bidang Perpustakaan, Ibu Lestari Nugraha, menyampaikan bahwa jumlah pengunjung perpustakaan keliling mencapai 250 orang setiap minggu. "Sebagian besar pengunjung adalah pelajar sekolah dasar," katanya. Menurut Ibu Lestari, perpustakaan keliling sangat membantu siswa yang rumahnya jauh dari perpustakaan umum. Setiap desa menerima kunjungan mobil perpustakaan dua kali dalam sebulan. Buku yang dipinjam dapat dikembalikan pada kunjungan berikutnya.

**Prompt:** "Pernyataan berikut yang merupakan opini Ibu Lestari dalam teks tersebut adalah …"

**Options:**
- A. Perpustakaan keliling sangat membantu siswa yang rumahnya jauh dari perpustakaan umum.
- B. Perpustakaan keliling beroperasi setiap hari Rabu dan Sabtu.
- C. Mobil perpustakaan membawa 800 buku cerita dan buku pengetahuan.
- D. Jumlah pengunjung perpustakaan keliling mencapai 250 orang setiap minggu.

---

### TB-010

- **ID**: BC-TEKS-BERITA-0010 · **Stimulus**: STIM-05 · **Skill/subskill**: READING / READING_IDE_POKOK
- **Claimed construct**: paragraph main idea · **Claimed cognitive**: R3 per §7.4 label (**F1-CONDITIONAL** — canonical proposal maps gagasan literal → R2) · **Claimed difficulty**: MEDIUM
- **Evidence target**: correct = distinguishes paragraph topic from detail and from other paragraphs; incorrect = first-sentence-is-main-idea heuristic / wrong-paragraph pull (MEDIUM)

**Stimulus (STIM-05 — Bank Sampah SMP Harapan Jaya):**
> Siswa SMP Harapan Jaya membentuk bank sampah sekolah pada Januari 2025.
>
> Setiap Jumat, siswa menyerahkan botol plastik, kertas bekas, dan kaleng kepada petugas bank sampah. Hasil penjualan sampah pada bulan pertama mencapai Rp350.000,00 dan digunakan untuk membeli buku tulis bagi siswa yang membutuhkan.
>
> Koordinator bank sampah, Kak Rina Maharani, mengatakan bahwa kesadaran siswa memilah sampah meningkat setelah program berjalan. "Awalnya hanya 30 siswa yang ikut, sekarang 90 siswa," ungkapnya.
>
> Setiap akhir bulan, petugas menimbang dan mencatat jumlah sampah yang terkumpul dari setiap kelas.

**Prompt:** "Gagasan utama paragraf kedua pada teks di atas adalah …"

**Options:**
- A. Siswa rutin menyetor sampah setiap Jumat dan hasil penjualannya digunakan untuk membeli buku tulis bagi siswa yang membutuhkan.
- B. Setiap Jumat siswa menyerahkan sampah kepada petugas bank sampah.
- C. Bank sampah sekolah dibentuk oleh siswa SMP Harapan Jaya.
- D. Kesadaran siswa memilah sampah meningkat setelah program berjalan.

---

### TB-011

- **ID**: BC-TEKS-BERITA-0011 · **Stimulus**: STIM-05 · **Skill/subskill**: READING / READING_INFERENSI
- **Claimed construct**: two-evidence data inference · **Claimed cognitive**: R4 (MENGANALISIS) · **Claimed difficulty**: HARD
- **Evidence target**: correct = integrates two data points; incorrect = negative framing bias / outside-knowledge substitution / spurious causality (MEDIUM)

**Stimulus (STIM-05):**
> Siswa SMP Harapan Jaya membentuk bank sampah sekolah pada Januari 2025.
>
> Setiap Jumat, siswa menyerahkan botol plastik, kertas bekas, dan kaleng kepada petugas bank sampah. Hasil penjualan sampah pada bulan pertama mencapai Rp350.000,00 dan digunakan untuk membeli buku tulis bagi siswa yang membutuhkan.
>
> Koordinator bank sampah, Kak Rina Maharani, mengatakan bahwa kesadaran siswa memilah sampah meningkat setelah program berjalan. "Awalnya hanya 30 siswa yang ikut, sekarang 90 siswa," ungkapnya.
>
> Setiap akhir bulan, petugas menimbang dan mencatat jumlah sampah yang terkumpul dari setiap kelas.

**Prompt:** "Berdasarkan data pada teks, dapat disimpulkan bahwa program bank sampah di SMP Harapan Jaya …"

**Options:**
- A. semakin diminati oleh siswa
- B. gagal karena hasil penjualan terlalu sedikit
- C. hanya diikuti oleh siswa kelas tujuh
- D. mengurangi anggaran belanja sekolah

---

### TB-012

- **ID**: BC-TEKS-BERITA-0012 · **Stimulus**: STIM-03 · **Skill/subskill**: READING / READING_INFERENSI *(claim-support evaluation — no dedicated subskill; same gap flag)*
- **Claimed construct**: supported-claim vs overclaim evaluation · **Claimed cognitive**: R5 (MENGEVALUASI) · **Claimed difficulty**: HARD
- **Evidence target**: correct = distinguishes supported claim from overclaim; incorrect = correlation-to-causation / overclaim acceptance (MEDIUM)

**Stimulus (STIM-03):**
> Sebanyak 60 siswa SMP Karya Bangsa menanam 500 bibit pohon di bantaran sungai dekat sekolah pada Minggu, 16 Februari 2025. Kegiatan itu merupakan bagian dari program sekolah Adiwiyata. Guru pendamping, Ibu Sari Rahayu, menjelaskan bahwa akar pohon mampu menahan tanah sehingga dapat mengurangi risiko longsor saat hujan deras. Selain menanam, para siswa membersihkan sampah plastik yang menyumbat aliran sungai. Panitia kegiatan menyiapkan bibit dan alat tanam untuk setiap kelompok siswa. Kepala SMP Karya Bangsa berharap kegiatan serupa dapat dilakukan setiap bulan dengan melibatkan warga sekitar.

**Prompt:** "Pernyataan berikut yang TIDAK didukung oleh isi teks adalah …"

**Options:**
- A. Setelah penanaman pohon, banjir di sekitar sekolah dijamin tidak akan terjadi.
- B. Sebanyak 60 siswa SMP Karya Bangsa ikut menanam bibit pohon.
- C. Siswa membersihkan sampah plastik dari aliran sungai.
- D. Kegiatan penanaman pohon merupakan bagian dari program Adiwiyata.

---

## 7. Reviewer Form

Copy this form per item (one per reviewer). Submit all 12 before opening the review key.

```
ITEM: TB-0XX (BC-TEKS-BERITA-00XX)        REVIEWER: A / B        DATE: ________

CONTENT (construct, stem, stimulus, key, language, provenance):
  PASS / REVISE / FAIL
PEDAGOGY (cognitive match, difficulty, distractors, diagnostic value):
  PASS / REVISE / FAIL
DIAGNOSTIC_VALUE:
  PASS / REVISE / FAIL

Key valid (exactly one defensible answer):            YES / NO
Single defensible answer:                              YES / NO
Cognitive match (claimed vs observed operation):       YES / NO / F1-CONDITIONAL
Stimulus-dependent (unanswerable without stimulus):    YES / NO
D10 state (HYPOTHESIS / REVIEWED / NOT_APPLICABLE):    _______________

15-dimension scores (0–3):
  D1 __ D2 __ D3 __ D4 __ D5 __ D6 __ D7 __ D8 __ D9 __ D10 __ D11 __ D12 __ D13 __ D14 __ D15 __
  (one-line evidence per score; mark HARD-FAIL dimensions below 2)

Critical comments (defects, ambiguity, defensible alternatives, language issues):
  ______________________________________________________________________________
  ______________________________________________________________________________

ITEM_VERDICT: PASS / REVISE / REJECT
REQUIRED REVISION (if REVISE/REJECT — precise, minimal, construct-preserving):
  ______________________________________________________________________________
```

**Verdict rules**: PASS = no substantive defect blocking use · REVISE = sound foundation, needs a specific repair · REJECT = fundamental construct/problem defect not fixable by a small edit.

## 8. Inter-Rater Comparison

After both reviewers have submitted all 12 forms, compare:

| Item | Reviewer A | Reviewer B | Agreement (Y/N) | Needs Adjudication (Y/N) |
|---|---|---|---|---|
| TB-001 | | | | |
| TB-002 | | | | |
| TB-003 | | | | |
| TB-004 | | | | |
| TB-005 | | | | |
| TB-006 | | | | |
| TB-007 | | | | |
| TB-008 | | | | |
| TB-009 | | | | |
| TB-010 | | | | |
| TB-011 | | | | |
| TB-012 | | | | |

- **Agreement** = same ITEM_VERDICT AND same YES/NO on key-valid and single-answer.
- **Needs Adjudication** = any disagreement on a publish-blocking issue (key validity, single defensible answer, hard-fail dimension < 2, construct defect, stimulus-dependence).
- No statistical reliability index is computed for N = 12 (foundation does not require it at this stage); the comparison above is the record.

## 9. Adjudication Rule

1. If A and B differ on any **publish-blocking** issue → the two reviewers **must review together**. No automatic majority vote.
2. The adjudicator (founder or a third qualified reviewer) records, per disputed item:
   - the disagreement (A's position, B's position);
   - the evidence each cites (specific stimulus sentence / option / dimension);
   - the resolution;
   - any changed interpretation that results.
3. A publish-blocking issue that survives adjudication as a defect → the item is REVISE or REJECT (per §7 verdict rules). Do not downgrade a defect to "acceptable" to reach agreement.
4. Non-blocking disagreements (e.g., advisory D9 score 2 vs 3) may be resolved by the adjudicator's judgment without a joint session.

## 10. Final Human Gate

The two reviewers + adjudicator record one of exactly five outcomes in `P2_3_HUMAN_REVIEW_LOG.md`:

| Outcome | Meaning |
|---|---|
| **HUMAN_APPROVED** | All 12 items pass both reviews (or adjudicated) with no remaining publish-blocking defect; D10 states upgraded to REVIEWED where justified |
| **HUMAN_APPROVED_WITH_REVISIONS** | Items approved in substance; specific non-blocking revisions are recorded and must be applied before the next gate |
| **REVISE_PILOT** | One or more items carry a publish-blocking defect; the pilot returns to a revision phase |
| **REVISE_FOUNDATION** | The defects implicate the foundation (blueprint/taxonomy/rules), not just item text; a foundation-correction phase precedes further pilot work |
| **REJECT_PILOT** | The pilot does not demonstrate the foundation's ability to produce trustworthy items; restart at design |

**Important**: none of these outcomes means "PUBLISHABLE." Publish additionally requires the full seven-clause conjunctive gate (§5) — including founder sign-off on F1, D10 ≥ REVIEWED for DIAGNOSTIC purpose, CP-mapping attestation by a content expert, and (eventually) LEVEL-1 calibration evidence. This pack only closes the human-review clause.