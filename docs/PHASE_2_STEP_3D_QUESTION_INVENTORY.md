# PHASE 2 STEP 3D — QUESTION INVENTORY

Scope: metadata foundation only. UKBI/TKA are inventoried separately and not modified.

## Student Learning Sources

| Source | Model/storage | Stable identity | Answer key | Current metadata | Usage | Adaptive eligibility now |
|---|---|---|---|---|---|---|
| Jalur Cerdas | `LearningUnit.content.questions[]` JSON | question `id` inside unit; activity boundary `unitId` | `jawaban` in server content | unit title/level, question type; no canonical skill/difficulty | lesson `/api/jalur-cerdas/[unitId]` | Not yet; evidence now exists but metadata mostly nullable |
| Latihan | `Quiz`, `QuizQuestion`, `QuizSubmission`, `QuizAnswer` | `QuizQuestion.id`; source `Soal.id`/custom source | server `Soal.correctAnswer` or `QuizQuestion.customAnswer` | assignment, type, points, time; source `Soal` has topic/difficulty/KD fields | `/api/murid/quiz/[id]` | Partially; evidence + sample metadata path exists |
| Bank Soal | `Soal`, master JSON under `data/question-bank/master/` | `Soal.kodeSoal` is stable unique when present; DB `Soal.id` is row identity | `Soal.correctAnswer` | `kelas`, `topik`, `kompetensi`, `indikator`, `difficulty`, `levelBerpikir`, `estimasiWaktu`, type | teacher-created/assigned Latihan | Sample only; no mass metadata |
| Game curated bank | `lib/game/question-bank.ts`, normalized `GameQuestion` | normalized bank ID | server/client-specific game path | optional topic/skill/difficulty in canonical type; source formats differ | solo/duel games | Not included in sample |
| Game Jalur harvest | `LearningUnit.content` + curated bank via `lib/game/harvest.ts` | lesson ID or generated bank ID | included in harvest server pool; some solo clients receive keys | `lvl` derived from unit/bank, not canonical learner metadata | Menara/Tantang | Not included; no universal attempt evidence |

## Separate Certified Sources

| Source | Model | Identity/answer | Boundary |
|---|---|---|---|
| UKBI | `UKBIQuestion`, `TestSession`, `TestAnswer`, `ProgresKompetensi` | question ID + server snapshot `correctAnswer` | certified simulation; untouched |
| TKA | `TKAQuestion`, `TestSession`, `TestAnswer`, `ProgresKompetensi` | question ID + server snapshot `correctAnswer` | certified simulation; untouched |

## Safe Counts

Production database counts were not queried from this environment. Local static scan:

- `data/question-bank`: 101 JSON files, 3,034 records including master sources;
- product-specific non-master sources: 51 files, 1,534 records;
- product-specific records with explicit `skill`: 0/1,534;
- product-specific records with CEFR: 0/1,534;
- product-specific records have `tags`, `band`, `track`, `section`, `difficulty`, and `type`.

The repository's recorded Jalur validation status says 720 questions across 72 units after deduplication. The DB validator was not run against production in this environment.

## Decision

No existing single model safely represented shared metadata across Jalur/Latihan/Bank Soal without mixing certified assessments. Step 3D adds `QuestionMetadata` as a metadata index keyed by `(source, questionId)`, without duplicating question content or answer keys.
