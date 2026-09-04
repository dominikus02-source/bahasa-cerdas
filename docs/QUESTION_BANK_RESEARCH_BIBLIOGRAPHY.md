# BahasaCerdas — Question Bank Research Bibliography & Source Hierarchy

**Status**: RESEARCH ARTIFACT (Phase 1A). Compiled 2026-09-04 from official/government documents and peer-reviewed or institutional assessment literature. No DB writes; no question content.
**Purpose**: every external claim used in `QUESTION_BANK_QUALITY_STANDARD.md`, `QUESTION_ITEM_DNA.md`, and `QUESTION_VALIDATION_SPEC.md` is keyed `[S#]` to this file, so readers can verify provenance and weight.

## Source classification legend

| Class | Meaning | How we treat it |
|---|---|---|
| **SOURCE-DERIVED** | Taken directly from an official document (Kemendikdasmen/BSKAP/SNPMB/Badan Bahasa/OECD/AERA-APA-NCME). | Adopt as a binding requirement or stated fact; changes require an official revision. |
| **RESEARCH-INFORMED DESIGN DECISION** | A BahasaCerdas decision made *in light of* research findings, because no official Indonesian source dictates it. | Adopt as internal spec; owner is the BahasaCerdas content/assessment team. |
| **INTERNAL REQUIREMENT** | Arises from BahasaCerdas architecture (Prisma models, gates, Learning Evidence, delivery rules) — not from external research. | Binding for this repo; owned by engineering. |
| **INFERENCE** | Our reasoned extrapolation beyond any single source. | Lowest weight; must be labeled as such in the specs. |

---

## A. Indonesian curriculum (Kurikulum Merdeka — Kemendikdasmen/BSKAP)

**[S1] Keputusan Kepala BSKAP Kemdikbudristek Nomor 032/H/KR/2024** — *Capaian Pembelajaran pada PAUD, Dikdas, dan Dikmen* (curriculum: Fase A–F). Bahasa Indonesia CP section defines the discipline, its **four elemen** (Menyimak; Membaca dan Memirsa; Berbicara dan Mempresentasikan; Menulis), and receptive (menyimak, membaca-memirsa) vs productive (berbicara-mempresentasikan, menulis) framing.
- Org: BSKAP, Kemdikbudristek (now Kemendikdasmen). Decree number/date: 032/H/KR/2024.
- URL (mirror PDF incl. Bahasa Indonesia CP): https://www.belajarpai.com/wp-content/uploads/2025/07/2024_NOMOR-032-H-KR-2024_CAPAIAN-PEMBELAJARAN.pdf
- Finding used: Bahasa Indonesia CP is organized by 4 language elemen per fase; our internal skill taxonomy (READING/WRITING/LISTENING/SPEAKING + GRAMMAR/VOCABULARY/LITERATURE) is a *superset* whose READING/WRITING/LISTENING/SPEAKING map onto CP elemen; GRAMMAR/VOCABULARY/LITERATURE are cross-cutting **internal** constructs.
- Caveat: text retrieved via a mirror PDF; decree citation verified via multiple official-adjacent pages (paralegal.id registry; lmsspada.kemdiktisaintek). A revised CP decree exists (BSKAP **046/H/KR/2025**, superseding 032 for 2025/26); Bahasa Indonesia element structure unchanged in scope-relevant parts.

**[S2] Panduan Pembelajaran dan Asesmen (revisi)** — BSKAP guidance document (2022 ed., revised editions to 2025).
- Org: BSKAP, Kemendikbudristek.
- URL (official distribution channel `belajar.id`): https://uploads.belajar.id/document/files/Pembelajaran_dan_Asesmen_2025_01k17ee2v8pqwqybn0y9n8pcd1.pdf
- Finding used: distinguishes **asesmen diagnostik (kognitif & nonkognitif)** at the start of learning, **formatif** (during learning, for improvement), and **sumatif** (end, for reporting). BahasaCerdas's Tes Awal is best classified as *diagnostik-kognitif formatif* product feature — never to be confused with official sumatif reporting.
- Caveat: content corroborated by multiple secondary PDFs of the guide; primary PDF not re-fetched (host constraints).

**[S3] CP Bahasa Indonesia fase wording (four elemen; reseptif/produktif)** — corroborated across the official decree PDF and many school/dinas republications (e.g., fase D summary at smpn4kra.sch.id; fase E/F summaries).
- Use: definitions of elemen in ITEM DNA `curriculum_mapping` guidance.

## B. TKA Bahasa Indonesia context (national selection tests)

**[S4] SNPMB — Framework UTBK** (current national entrance testing body; official successor of LTMPT).
- Org: Seleksi Nasional Penerimaan Mahasiswa Baru (SNPMB).
- URL: https://snpmb.id/fr/
- Finding used: **"Literasi dalam Bahasa Indonesia"** is the UTBK subtest that measures reading/information literacy over Indonesian-language texts; texts span general, literary, saintek, and humanities themes; reading is passage-stimulus-based with multi-question testlets.
- Caveat: page content retrieved via search snippet; host not fetchable from this workspace. The *schematic* finding (stimulus-based literacy measurement over varied text types) is what informs our blueprint; BahasaCerdas does **not** claim to replicate SNPMB operational items.

**[S5] Historical UTBK Tes Kemampuan Akademik (TKA)** (pre-2023, LTMPT era).
- Status: operational TKA was replaced in SNBT by Tes Potensi Skolastik + Literasi. BahasaCerdas's product "TKA" is an **internal** school-oriented "Tes Kemampuan Akademik Bahasa Indonesia" (grade bands A–D) aligned to Kurikulum Merdeka competencies, **not** an official SNPMB test.
- Use: no official item blueprint is claimed; where TKA guides the bank standard, the operative authority is the *curriculum* ([S1]–[S3]) plus assessment science ([S7]–[S12]).

## C. UKBI (official proficiency instrument)

**[S6] UKBI — Uji Kemahiran Berbahasa Indonesia** (Badan Bahasa, Kemendikbud/Kemendikdasmen).
- Org: Badan Pengembangan dan Pembinaan Bahasa.
- URLs: https://ukbi.kemendikdasmen.go.id/ · sections page: https://ukbi.kemendikdasmen.go.id/front-new/page/informasi-ukbi · predikat page: https://ukbi.kemendikdasmen.go.id/front-new/page/predikat
- Findings used:
  1. **Five seksi**: I Mendengarkan, II Merespons Kaidah, III Membaca, IV Menulis, V Berbicara (pilihan ganda for I–III; constructed/writing & speaking tasks for IV–V; an adaptif-disabilitas-rungu variant swaps Seksi I for Memirsa). *Constructed-response seksi (Menulis/Berbicara) exist in the official instrument — relevant to our CONSTRUCTED type policy.*
  2. **Seven predikat bands** (current scale): Istimewa 725–800 · Sangat Unggul 641–724 · Unggul 578–640 · Madya 482–577 · Semenjana 405–481 · Marginal 326–404 · Terbatas 251–325.
- Caveat: site hosts not fetchable from this workspace; band scores verified against the official snippet and multiple independent republications (narabahasa.id table, detik.com Edu). Older UKBI editions used a 900-scale; we cite the current 800-scale.
- Use: proficiency-band vocabulary for learner profiles; the 5-seksi structure informs coverage balance; **no claim that BahasaCerdas items are UKBI-equivalent**.

## D. Educational assessment science

**[S7] AERA, APA, & NCME.** *Standards for Educational and Psychological Testing* (2014 ed.). American Educational Research Association.
- URLs: https://www.aera.net/Publications/Books/Standards-for-Educational-Psychological-Testing-2014-Edition · APA program page: https://www.apa.org/science/programs/testing/standards · full PDF (open access since 2024/25): https://www.testingstandards.net/uploads/7/6/6/4/76643089/standards_2014edition.pdf
- Findings used: validity is the *primary* consideration in test development and is an argument about intended score interpretation/use; reliability/precision; **fairness elevated to a foundational (third) pillar** (see also Buros Center commentary). Every recommendation in the standard is traceable to "evidence for intended use" — the spine of our "evidence before score" principle.

**[S8] Haladyna, T. M., Downing, S. M., & Rodriguez, M. C. (2002).** *A review of multiple-choice item-writing guidelines for classroom assessment*. Applied Measurement in Education, 15(3), 309–334. And **Haladyna & Rodriguez (2013), *Developing and Validating Test Items*** (Routledge) which distilled ~43 MC item-writing rules.
- URLs: summary repository (Univ. of New Mexico) https://cpl.health.unm.edu/AssetListing/.../Rules-for-Multiple-Choice-Items-Haladyna-et-al-2002-5943 · UMN experts record https://experts.umn.edu/en/publications/a-review-of-multiple-choice-item-writing-guidelines-for-classroom/ · original: Applied Measurement in Education.
- Findings used (converted to hard-fail rules in the Quality Standard):
  - every distractor should be plausible and homogeneous in content/grammar with the key;
  - avoid "all of the above / none of the above"; avoid negative stems (or make them emphatic);
  - no verbal/grammatical clues linking stem to key; randomize key position;
  - keep options mutually exclusive and comparable in length/vocabulary;
  - vocabulary/reading level should be below the level being tested.
- Caveat: rules are classroom-assessment-oriented; we adopt the subset that also serves diagnostic measurement (see standard's rationale column per rule).

**[S9] OECD — PISA reading literacy definition & framework** (2018 framework continuing through PISA 2025 cycle; reading sub-processes: locate information, understand, evaluate & reflect).
- URLs: https://www.oecd.org/en/about/programmes/pisa.html · https://www.oecd.org/en/publications/how-does-pisa-define-and-measure-reading-literacy_efc4d0fe-en.html · PISA 2025 framework listing https://www.oecd.org/en/publications/2026/05/pisa-2025-assessment-and-analytical-framework_3abce6d6.html
- Finding used: reading literacy = "understanding, using, evaluating, reflecting on and engaging with texts"; PISA operationalizes reading into locating/accessing text information, understanding/representing, evaluating/reflecting. This provides the international process taxonomy that maps to our cognitive targets (R2–R5) for stimulus-based reading items.
- Caveat: exact per-cycle verb sets differ slightly (2018 vs 2025); we cite the definitional core common to both.

**[S10] Mislevy, R. J. (et al.) — Evidence-Centered Design (ECD).**
- URLs: CRESST brief https://cresst.org/publication/a-brief-introduction-to-evidence-centered-design/ · SRI report (Mislevy, Almond & Lukas 2003/2005) https://padi.sri.com/downloads/TR9_ECD.pdf · Frontiers summary (Newton 2021) https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2021.695376/full
- Findings used: assessment is an evidentiary argument; design from **student model (what we claim to know) → evidence model (what observations update the claim) → task model (what task elicits those observations)**; task features can be deliberately manipulated to change psychometric behavior. This is the theoretical backbone of our `evidence_target`, `misconception_target`, and item-quality dimension 10.
- Use: RESEARCH-INFORMED DESIGN DECISION substrate; BahasaCerdas does not implement full ECD formalism but adopts its vocabulary and ordering.

**[S11] Distractor & option-count literature** — evidence that 3-option MC items can perform as well as 4–5 when distractors are quality-controlled; e.g., *Practical Assessment, Research & Evaluation* work on distractor reduction; and item-writing synthesis [S8].
- URL example: PME journal review https://pmejournal.org/articles/10.5334/pme.2583 (Sunsundegui et al. 2026, "Reducing the number of distractors…").
- Finding used: **write 3–4 good distractors, never pad to 4–5 with weak ones**; a "bad distractor" (obviously wrong, off-topic, or duplicate) is worse than a shorter option list. Justifies quality-over-quantity option policy for PG items.

## E. AI-assisted item generation quality control

**[S12] Kıyak, Y. S., et al. (2026).** *Validity of AI-generated multiple-choice questions in medical education: a systematic review*. Postgraduate Medical Journal (Oxford Academic).
- URL: https://academic.oup.com/pmj/advance-article/doi/10.1093/postmj/qgag057/8688271
- Finding used: LLM-generated MCQs show content-validity **only when an expert review pipeline is applied**; validity threats concentrate in factual accuracy, ambiguity, and distractor quality. Generalizes to the assessment domain: AI draft + deterministic gates + human content review is the safety pattern.

**[S13] Artsi, Y., et al. (2024).** *Large language models for generating medical examinations: systematic review*. BMC Medical Education.
- URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC10981304/
- Finding used: studies that used LLMs purely as an *assisted authoring tool* (with expert curation) produced competent items; autonomous generation without review showed heterogeneous and sometimes flawed quality. Supports "AI assists, human approves" provenance semantics (AI_ASSISTED ≠ HUMAN_REVIEW).

**[S14] Law, A. K. K., et al. (2025).** *AI versus human-generated multiple-choice questions for medical education: systematic review* (large-sample comparisons; psychometric comparability with substantial heterogeneity).
- URL: https://d-nb.info/1363960989/34 (full-text repository copy)
- Finding used: psychometric equivalence between AI- and human-written MCQs is **not automatic**; needs per-item quality gates and item statistics monitoring post-publish.

**[S15] Repo-internal precedent (INTERNAL REQUIREMENT, not external research)** — `bank-gate.ts` / `delivery-gate.ts` hard-fail codes (TEMPLATE_STEM, FILLER_DISTRACTORS, KEY_IN_STEM, DUPLICATE_OPTION, …), the Phase 7/0 audit verdicts (98.7% template; metadata approval ≠ content approval), and validator.ts R1–R16 for AI diagnostic items. These are the ground truth about *why* the standard exists and the existing gate vocabulary the standard reuses.

---

## Source coverage map (which spec uses which source)

| Spec section | Primary sources |
|---|---|
| Quality Standard §4.2 principles | S1, S2, S6, S7, S8, S10, S15 |
| Quality Standard §4.3 dimensions 1–15 | S7, S8, S9, S10, S11, S6 |
| Quality Standard cognitive targets | S9 (PISA processes), S6 (UKBI seksi), S10 |
| Item DNA fields | S10 (student/evidence/task model), S1–S3 (curriculum), S15 (repo) |
| Validation Spec pipeline | S8, S12–S14 (AI gates), S15 (existing gates), S7 (fairness/accessibility review) |
| 50-theme blueprint section (§12 of the audit doc) | S1–S3 (curriculum alignment), S6 (UKBI-style coverage), S9 (process mix) |

**Not used as authority**: commercial test-prep blogs (used only to locate official docs), SEO education blogs, and AI-marketing claims about question quality.
