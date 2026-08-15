# PHASE 2 STEP 3D — QUESTION METADATA CONTRACT

Version: taxonomy `1.0`, metadata `1.0`.

## Canonical Fields

| Field | Allowed values/shape | Meaning | Nullable |
|---|---|---|---|
| `source` | `JALUR_CERDAS`, `BANK_SOAL`, `LATIHAN`, `GAME` | source boundary | no |
| `questionId` | stable source ID, max 200 chars | never question text/browser random ID | no |
| `skill` | existing `LearningSkillType` IDs: READING, WRITING, LISTENING, SPEAKING, GRAMMAR, VOCABULARY, LITERATURE | broad ability | yes |
| `subskill` | taxonomy IDs with valid parent | focused ability | yes |
| `difficulty` | EASY, MEDIUM, HARD, VERY_HARD | content difficulty only, not empirical rate | yes |
| `level` | integer 1..12 only for `JALUR_CERDAS` | Jalur curriculum level, not school grade | yes |
| `topic` | existing content topic string, max 120 chars | what content is about | yes |
| `questionType` | PILIHAN_GANDA, BENAR_SALAH, ISIAN_SINGKAT, CONSTRUCTED | actual answer form | no |
| `cefr` | A1, A2, B1, B2, C1, C2 | only where CEFR is genuinely applicable | yes |
| `provenance` | AUTHOR, CURRICULUM, EXISTING_DATA, AI_ASSISTED, HUMAN_REVIEW, EMPIRICAL | assignment source | no |
| `confidence` | HIGH, MEDIUM, LOW | confidence in metadata assignment | no |
| `status` | DRAFT, NEEDS_REVIEW, APPROVED | publication/review state | no |
| `taxonomyVersion` | currently `1.0` | interpretation version | no |
| `metadataVersion` | currently `1.0` | record contract version | no |

## Skill Hierarchy

The broad skills reuse existing `LearningSkillType` terminology. The v1 subskills are intentionally limited:

- READING: `READING_IDE_POKOK`, `READING_INFORMASI_TERSURAT`, `READING_INFERENSI`, `READING_MAKNA_KATA`, `READING_STRUKTUR_TEKS`;
- WRITING: `WRITING_EJAAN`, `WRITING_KALIMAT_EFEKTIF`, `WRITING_ORGANISASI_GAGASAN`, `WRITING_KETEPATAN_KATA`;
- LISTENING: `LISTENING_INFORMASI_TERSURAT`, `LISTENING_INFERENSI`, `LISTENING_GAGASAN_UTAMA`;
- SPEAKING: `SPEAKING_KELANCARAN`, `SPEAKING_KETEPATAN_BAHASA`, `SPEAKING_ORGANISASI_GAGASAN`;
- GRAMMAR: `GRAMMAR_EJAAN`, `GRAMMAR_KALIMAT_EFEKTIF`, `GRAMMAR_IMBUHAN`, `GRAMMAR_TANDA_BACA`, `GRAMMAR_KATA_BAKU`;
- VOCABULARY: `VOCABULARY_MAKNA_KATA`, `VOCABULARY_SINONIM_ANTONIM`, `VOCABULARY_KATA_BAKU`, `VOCABULARY_KONTEKS`;
- LITERATURE: `LITERATURE_UNSUR_CERITA`, `LITERATURE_GAYA_BAHASA`, `LITERATURE_APRESIASI_KARYA`, `LITERATURE_MAKNA_SASTRA`.

Topic is independent from skill. For example, skill `READING_INFERENSI` may have topic `Cerpen` or `Teks Eksposisi`.

## Difficulty Semantics

`difficulty` is content difficulty inherited or reviewed from source metadata. It is not empirical difficulty. Empirical metrics must later be calculated from `LearningEvidence` and must not overwrite this field automatically.

Existing numeric source scales and free-form `Soal.difficulty` are not silently converted in production. The sample explicitly maps existing master labels `MUDAH/SEDANG/SULIT` to `EASY/MEDIUM/HARD` and remains `NEEDS_REVIEW`.

## CEFR

CEFR is nullable. It is not forced on Indonesian curriculum questions, Jalur units, or UKBI/TKA. No current sample receives a CEFR value.

## Provenance Rules

- AI_ASSISTED metadata cannot be `APPROVED` automatically.
- `APPROVED` requires `HUMAN_REVIEW` or `EMPIRICAL` provenance.
- Operator IDs are stored as `createdById`/`reviewedById`.
- Metadata changes use the same `(source, questionId)` row and update timestamps; historical `LearningEvidence` is never rewritten.

## Validation

Pure validator: `lib/question-metadata/validation.ts`.

It rejects unknown sources, UKBI/TKA, invalid parent/subskill pairs, invalid difficulty/type/CEFR/provenance/confidence/status, invalid Jalur levels, unsupported versions, and AI auto-approval.
