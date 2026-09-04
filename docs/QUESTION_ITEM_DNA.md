# BahasaCerdas — Question Item DNA (Logical Specification v1.0)

**Status**: SPECIFICATION (Phase 1A). Defines the **logical** structure of a future question item — what the item *is*, who owns each part, what students may see, and what must be validated. This is intentionally **not** a Prisma schema: no migrations, no code. A physical mapping pass (Phase 1B+) may map these fields onto `Soal`/`QuestionMetadata`/new tables.

**Governing ideas**:
- Evidence-Centered Design vocabulary ([S10]): **student model** (what we claim), **evidence model** (observations that update the claim), **task model** (the item itself). The DNA below groups fields by these roles.
- The audit's core defect was that **authoring data, metadata, and delivery data were collapsed into one object with no ownership or review semantics**. This spec separates them hard.
- Skill/subskill vocabulary comes from `question-metadata/taxonomy.ts`; cognitive targets from `AiCognitiveTarget` + the R1–R6 process scale ([S9]).

---

## 1. Field groups and the master table

| Group | Purpose | Student-facing? | Owner |
|---|---|---|---|
| **A. Identity & lineage** | stable id, version, provenance, audit trail | never (id may be exposed, provenance never) | system |
| **B. Task model (content)** | stimulus, prompt, options, key, explanation | stimulus/prompt/options yes; key/explanation no | author |
| **C. Evidence model** | skill target, cognitive target, misconception map, distractor rationale, evidence target | no | assessment designer + review |
| **D. Curriculum & context** | theme, phase/grade, curriculum mapping, difficulty target | metadata visible to guru; never key material | curriculum editor |
| **E. Status & review** | validation status, review status, reviewer, publication status | no | pipeline/human review |
| **F. Empirical statistics** | p-value, discrimination, exposure, calibration | no | system (telemetry) |

### Field-by-field

| Field | Group | Purpose | Req | Owner | Student-facing? | Validation requirement |
|---|---|---|---|---|---|---|
| `item_id` | A | stable unique id | required | system | id only | format check; collision check |
| `kodeSoal` | A | human/domain id (`BC-{THEME}-NNNN`) for BC bank | required for bank items | system | no | unique; pattern check |
| `theme` | D | one of the 50 themes (canonical label) | required | author | yes (topic label) | must exist in theme registry |
| `skill` / `subskill` | C | taxonomy ids (READING/…; SUBSKILLS) | required/required-or-null | assessment designer | yes (labels) | must exist in taxonomy |
| `assessment_purpose` | C | DIAGNOSTIC / PRACTICE / FORMATIVE / SUMMATIVE_* | required | designer | no | enum |
| `evidence_target` | C | which learner-model claim this item updates: `{ skill, subskill, process, confidence }` | required | designer | no | consistent with skill/subskill |
| `cognitive_target` | C | R1…R6 / `AiCognitiveTarget` (MENGINGAT…MENCIPTAKAN) | required | designer | no | in enum; mapped to R-scale in doc |
| `misconception_target` | C | the predictable error the item is built to expose (may be per-distractor) | optional (2+ recommended) | designer | no | free-text rationale, reviewed |
| `curriculum_mapping` | D | fase/elemen/CP reference (e.g., `D.Membaca: mengidentifikasi ide pokok`) | required for curriculum themes | curriculum editor | no | must reference declared CP; fase ∈ {D,E,F} for SMP/SMA |
| `grade`/`phase` | D | VII–XII or Fase D/E/F | required | author | yes | in range |
| `source` | A | MANUAL / AI_ASSISTED / MASTER_BANK / IMPORT / MIGRATED | required | system | no | provenance honesty (§4.2-11) |
| `provenance` | E | AUTHOR / AI_ASSISTED / HUMAN_REVIEW / EMPIRICAL / … | required | pipeline | no | set by pipeline; HUMAN_REVIEW only after real read |
| `stimulus` | B | passage/text/document the item depends on | required where construct requires (D4) | author | yes | length & register per grade; internal-consistency review |
| `stimulus_type` | B | NONE / SHORT_CONTEXT / PASSAGE / LITERARY / FUNCTIONAL / MULTIMODAL | required | author | yes | matches theme blueprint archetype |
| `prompt` | B | the actual question/instruction | required | author | yes | singular, unambiguous (D5) |
| `item_type` | B | PILIHAN_GANDA / BENAR_SALAH / ISIAN_SINGKAT / CONSTRUCTED | required | author | yes | supported by delivery engine |
| `options` | B | string[] | PG/BS required; ISIAN forbidden | author | yes | 3–5 PG options policy ([S11]); normalized-unique |
| `answer_key` | B | index or exact text | required | author | **no** | in-range; matches intended answer (D6) |
| `explanation` | B | why the key is correct, citing stimulus | required for publish | author | no (post-submit feedback may show a *sanitized* subset by product decision) | consistent with key (WRONG_ANSWER check) |
| `distractor_rationale` | B/C | per-distractor error explanation | required at score ≥2 (D7) | author | no | consistency with misconception_target |
| `difficulty_target` | D | EASY/MEDIUM/HARD/VERY_HARD cell | required | designer | guru-facing only | validated not arithmetic (D9) |
| `validation_status` | E | STRUCTURAL_PASS / CONTENT_PASS / PEDAGOGIC_PASS / FAILED(code) | pipeline | pipeline | no | set by Validation Spec stages |
| `review_status` | E | DRAFT / NEEDS_REVIEW / APPROVED / REJECTED / CALIBRATION | required | review | no | APPROVED only after human content read |
| `reviewer` + `reviewed_at` | E | who/ when | required for APPROVED | review | no | non-empty only for human decision |
| `version`/`lineage` | A | revision chain; `derived_from_item_id` | required | system | no | immutability of published content; new version = new review |
| `duplicate_group` | A/D | hash group id when a duplicate family is detected | optional (set by gate) | system | no | set by duplicate gate |
| `publication_status` | E | DRAFT / ELIGIBLE / PUBLISHED / RETIRED | required | system | no | ELIGIBLE only via Validation Spec; PUBLISHED only via delivery allowlist |
| `empirical` fields | F | `p_value`, `discrimination`, `exposure_count`, `last_calibrated_at` | optional → required for CALIBRATION | system | no | from telemetry; privacy-safe aggregates |

## 2. Authoring data vs student-delivery data (hard separation)

| Data class | Contents | Where it may go |
|---|---|---|
| **STUDENT_DELIVERY** | `item_id` (or public code), `theme`/`topic` label, `skill`/`subskill` labels, `grade`, `stimulus`, `stimulus_type`, `prompt`, `item_type`, `options` (sanitized), `difficulty` label | student-facing payloads (subject to existing `sanitizeSoalForStudent` + leakage tests) |
| **AUTHORING_AND_METADATA** | everything else: `answer_key`, `explanation`, `distractor_rationale`, `evidence_target`, `misconception_target`, `cognitive_target`, `curriculum_mapping`, provenance/review fields, statistics | server/admin/review surfaces only |

Rules:
1. No field from the second class may appear in any student payload — enforced by the existing sanitizers and regression leakage tests (D15). This is a **published-content invariant**, not a preference.
2. `explanation` may be shown *after* a completed attempt only through a product-sanctioned, sanitized path (results screen), and never before/during the attempt.
3. The diagnostic engine's existing sanitized API contract (`toPublicQuestion`) is the model for every future delivery surface.

## 3. Provenance semantics (adopted from the audit's lesson)

| `provenance` value | Means | Gates |
|---|---|---|
| `AUTHOR` | Written by a named human author | content review still required |
| `AI_ASSISTED` | Drafted by AI, edited/owned by a human | full Validation Spec; AI-specific checks ([S12]–[S14]); never auto-APPROVED |
| `MASTER_BANK`/`IMPORT`/`MIGRATED` | legacy or bulk import | cannot reach ELIGIBLE without a fresh human review per this standard (containment stays) |
| `HUMAN_REVIEW` | a human actually read the item content and stands behind it | required (with `reviewer`, `reviewed_at`) for APPROVED → ELIGIBLE |
| `EMPIRICAL` | item has calibration stats backing its difficulty/discrimination | only after `CALIBRATION` cycle |

## 4. Relationship to current models (mapping sketch — no schema change)

- `Soal` already stores most of group B (`text`, `options`, `correctAnswer`, `explanation`, `type`, `kelas`, `topik`, `difficulty`, `source`) — note `correctAnswer` already exists server-side.
- `QuestionMetadata` (BANK_SOAL) already stores the taxonomy/review half: `skill`, `subskill`, `difficulty`, `status`, `provenance`, `confidence`, `reviewedBy`.
- Missing logical fields that a future physical pass must add (Phase 1B, requires its own approval): `assessment_purpose`, `evidence_target`, `misconception_target`, `distractor_rationale`, `curriculum_mapping` (or a pointer to a CP registry), `publication_status` semantics beyond APPROVED, `duplicate_group`, and empirical fields. Each missing field is **optional in the physical layer until authored** — the DNA is the contract for what authoring must eventually fill.
- `LearningSkillType` (used by LearningEvidence) is the learner-model vocabulary that `evidence_target.skill` must resolve to — evidence written to the ledger must keep resolving ([S10]).

## 5. Cognitive scale mapping (single source of truth for the bank)

| R-scale (audit/this spec) | AiCognitiveTarget | Meaning | Typical archetype |
|---|---|---|---|
| R1 | MENGINGAT | recognition/recall | spelling form, term definition (only where construct is recall) |
| R2 | MEMAHAMI | understand/locate explicit info | informasi tersurat, gagasan utama (literal) |
| R3 | MENERAPKAN | apply a rule to new material | editing/EYD application, SPOK in a novel sentence |
| R4 | MENGANALISIS | infer/analyze relations | inference, structure, cause-effect, character motivation |
| R5 | MENGEVALUASI | evaluate/reflect | fakta-opini, argument quality, critical reflection |
| R6 | MENCIPTAKAN | integrate/synthesize | (constructed-response only in bank context) |

The bank's declared target mix for rebuilt themes stays as the audit recommended (R2 40 / R3 30 / R4 25 / R5+ 5) — the DNA simply makes the per-item target explicit and reviewable.

## 6. What a "good" item must declare before it can be written

The Validation Spec requires the **authoring contract** be filled first:
1. `theme` + `grade`/`phase`
2. `skill` + `subskill` + `assessment_purpose` + `evidence_target` (what response updates which claim)
3. `cognitive_target` (R-level)
4. `difficulty_target` cell
5. `stimulus_type` per theme archetype (audit §12/§15)
6. `misconception_target` (what error the item should catch) — or an explicit note that the item is a pure performance discriminator

Only then is content (stimulus → prompt → options/key → rationale) authored. This ordering is the operational meaning of "assessment before generation."
