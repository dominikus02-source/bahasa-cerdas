# Baseline Assessment V2 — Independent Student Ability Diagnostic

## Status
Implemented on branch `feat/diagnostic-assessment-engine-v2`.

## Product decision
Tes Awal is an assessment engine, not a learning path.
- Baseline Assessment measures the learner.
- Jalur Cerdas is one learning intervention.
- Mentor AI consumes the learner profile and recommends the next action.
- Aku Sastrawan is a Premium learning destination for literary development.

## Blueprint
15 objective items:
- Membaca: 3
- Tata Bahasa: 3
- Kosakata: 3
- Sastra: 3
- Menulis: 3

The selector attempts EASY, MEDIUM and HARD within each skill. It only uses approved, metadata-validated and bank-gated production questions.

A separate writing task (80–180 words) measures an initial writing signal across relevance, coherence, sentence control, vocabulary and mechanics.

The writing signal is explicitly provisional. It is not a formal certification score.

## Data flow
Baseline Assessment → LearningEvidence → AbilityProfile → LearnerState / Mentor AI → Learning destinations

The baseline session uses a distinct evidence source: `DIAGNOSTIC_BASELINE_V2`.
This keeps the assessment analytically separate from `DIAGNOSTIC_DAILY` and from Jalur Cerdas progress.

The question content may originate from the generic approved bank, but the assessment selection blueprint is independent of Jalur Cerdas.

## Assessment principles
- Measure several competencies instead of a single learning path.
- Separate measurement from intervention.
- Use multiple difficulty levels so high performance on easy items cannot by itself imply high ability.
- Include direct writing evidence instead of inferring writing ability from multiple-choice questions.
- Keep results provisional and confidence-aware.
- Continue updating the profile from later learning evidence.

## Important limitation
15 objective items + one writing task is a baseline, not a psychometrically calibrated certification test. Listening and speaking are not claimed as measured until production-grade tasks and scoring are available.

## Next evolution
1. Add dedicated diagnostic item governance when the bank is large enough.
2. Add listening tasks.
3. Add speaking tasks.
4. Replace heuristic writing signal with validated analytic AI/human-assisted scoring.
5. Add periodic reassessment and baseline-vs-current reporting.
6. Let Mentor AI route the learner among Jalur Cerdas, Aku Sastrawan Premium, and other learning experiences based on evidence.