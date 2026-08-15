# PHASE 2 STEP 3G — REAL LEARNER SIMULATION

# Executive Summary

Personalized Practice v1 diuji dengan fixture terkontrol, tanpa DB production, tanpa LLM, dan tanpa mengubah Student Home/UKBI/TKA. Simulasi menjalankan enam persona dan tiga hari longitudinal.

Hasil akhir setelah tiga perbaikan P1:

- target skill weak evidence benar;
- improving learner tidak lagi diberi alasan `WEAK_SKILL` permanen;
- unseen selalu mengungguli old/recent;
- metadata-starved pool menghasilkan fallback jujur;
- small pool tidak menggandakan question;
- selection deterministic;
- reason code konsisten dengan state.

Product wording: **evidence-based personalized practice**, bukan adaptive AI.

# Test Dataset

Fixture: `scripts/fixtures/adaptive-practice-fixture.ts`.

- 30 test-only questions;
- 7 canonical skills;
- subskill parent valid;
- difficulty EASY/MEDIUM/HARD;
- topic bervariasi;
- question type PILIHAN_GANDA;
- tidak pernah diinsert ke production;
- tidak memodifikasi `QuestionMetadata` production.

# Personas

## Persona A — New Student

Input: 0 learner evidence.

Observed:

- reason `NO_DATA`;
- no weak-skill claim;
- bounded set of 5;
- server rotation key dapat menggeser skill pada hari berikutnya.

Result: **GREEN**.

## Persona B — Weak Skill

Input: READING 4/10, GRAMMAR 8/10.

Observed:

- target `READING`;
- reason `WEAK_SKILL`;
- target difficulty MEDIUM;
- topic diversity tetap ada.

Result: **GREEN**.

## Persona C — Improving

Input: historical 2/5, recent 9/10.

Observed:

- learner state trend `IMPROVING`;
- reason berubah menjadi `PROGRESSION`, bukan `WEAK_SKILL`;
- skill tetap mendapat latihan tanpa remediation permanen.

Result: **GREEN**.

## Persona D — Declining

Input: historical 5/5, recent 4/10.

Observed:

- trend `DECLINING`;
- skill tetap diprioritaskan untuk latihan;
- tidak ada intervention kompleks atau LLM.

Result: **GREEN**.

## Persona E — Repeater

Input: 10 question IDs recent.

Observed:

- unseen questions dipilih lebih dulu;
- recent questions tidak muncul di bagian awal selama unseen masih tersedia;
- cooldown 14 hari dipakai untuk membedakan recent dan old.

Result: **GREEN**.

## Persona F — Metadata Starved

Input: evidence luas tetapi hanya dua candidate metadata approved.

Observed:

- tidak ada weak-skill claim;
- pool kurang dari requested size menghasilkan fallback, bukan sesi adaptive palsu;
- fallback mengarah ke latihan umum Jalur Cerdas.

Result: **GREEN**.

# Day 1

- no evidence;
- reason `NO_DATA`;
- target berasal dari server rotation key;
- selection size 5;
- no learner-state weakness fabricated.

# Day 2

- evidence state READING 4/10;
- reason `WEAK_SKILL`;
- READING prioritized;
- target difficulty MEDIUM.

# Day 3

- historical READING 2/5;
- recent READING 9/10;
- trend `IMPROVING`;
- reason `PROGRESSION`;
- system tidak terus-menerus menjelaskan skill sebagai lemah.

Observed reason sequence:

```text
NO_DATA → WEAK_SKILL → PROGRESSION
```

# Weak Student

Weakest sufficiently evidenced skill dipilih berdasarkan accuracy terendah setelah sample minimum 5 attempts. One-attempt accuracy tidak cukup untuk membuat target weak.

# Improving Student

Improvement terdeteksi dari perbedaan recent accuracy dan historical accuracy. Threshold 10 percentage points menghasilkan `IMPROVING`. Selector mengubah reason menjadi `PROGRESSION`, sehingga historical weakness tidak menjadi label permanen.

# Declining Student

Decline terdeteksi dari perbedaan negatif minimal 10 percentage points. Selector tetap menargetkan skill tersebut dengan difficulty policy existing v1, tanpa menambah remediation engine baru.

# Repeater

Novelty scoring sekarang bertingkat lebih tinggi daripada skill match:

```text
UNSEEN = 300
OLD >= 14 hari = 150
RECENT < 14 hari = 0
```

Target skill dan difficulty tetap dipakai sebagai tie-break/secondary signal. Ini memastikan recent target tidak mengalahkan unseen skill lain hanya karena match skill.

# Metadata Starvation

Jika candidate approved kurang dari requested session size, selector mengembalikan `null`; API mengembalikan fallback eksplisit:

```text
Belum cukup data untuk latihan personal.
Mulai latihan umum → /arena/jalur-cerdas
```

Tidak ada personalized claim berdasarkan evidence yang metadata-nya belum approved.

# Anti-repeat

- Recent evidence dipetakan per `source + questionId`.
- Cooldown = 14 hari.
- Unseen > old > recent.
- Jika candidate pool lebih kecil dari requested size, tidak ada duplicate question; sesi menjadi fallback.

# Determinism

Selection tidak memakai `Math.random()`. Tie-break menggunakan question ID. No-data rotation memakai seed server `userId + dayKeyWIB`, bukan input klien.

Repeated simulation dengan state/pool/version/time yang sama menghasilkan question IDs yang sama.

# Explanation Accuracy

Setiap selection memiliki:

- `reasonCode`;
- `reasonText`;
- `targetSkill`;
- `targetSubskill` bila tersedia;
- `targetDifficulty`;
- `selectionVersion`.

Simulation memverifikasi `WEAK_SKILL`, `NO_DATA`, `PRACTICE_GAP`, dan `PROGRESSION` tidak bertentangan dengan learner state.

# Security

Static/API tests tetap lulus:

- authentication/session ownership;
- no client skill/difficulty override;
- no question injection at session start;
- answer key absent from start/answer payload;
- metadata must be APPROVED;
- answer writes reuse LearningEvidence;
- no XP/coin/reward path.

`test:adaptive-practice`: 25/25.

# Performance

Pure fixture benchmark, 1.000 iterations, 30 candidates:

- learner state calculation: **5.46 ms**;
- selector: **67.65 ms**;
- DB queries: **0** (pure simulation only).

Expected production start request:

- one learner-state aggregate;
- one metadata candidate query capped 200;
- one question lookup;
- one evidence lookup;
- one session insert.

Expected answer request:

- one owned session lookup;
- metadata + question lookup;
- one LearningEvidence upsert.

These are structural estimates, not production latency claims.

# Bugs Found

1. **P1**: no-data selection always chose the alphabetically first skill. This did not provide balanced daily rotation.
2. **P1**: improving state still returned `WEAK_SKILL` reason.
3. **P1**: skill match weight could make a recent target beat an unseen question from another skill.
4. **P1**: undersized approved pool returned a partial adaptive session instead of explicit fallback.

# Fixes

- Added server-seeded no-data rotation via `rotationKey`.
- Improving state now uses `PROGRESSION` reason.
- Novelty priority raised above skill match in candidate scoring.
- Candidate pool smaller than requested size now returns truthful fallback.
- No UKBI/TKA, Student Home, Premium, reward, or LLM changes.

# Product Quality Score

| Dimension | Score |
|---|---|
| Correct target | GREEN |
| Correct difficulty | GREEN for deterministic v1 policy |
| Anti-repeat | GREEN |
| Explanation | GREEN |
| No false personalization | GREEN |
| Diversity | GREEN |
| Longitudinal evolution | GREEN |

Overall controlled simulation: **GREEN**. Production adaptive quality remains **YELLOW** until approved metadata and real evidence volume exist.

# Final Gate

- **TECHNICAL ADAPTIVE ENGINE: GREEN**
- **LEARNING DECISION QUALITY: GREEN** in controlled fixture simulation
- **SECURITY: GREEN**
- **DATA INTEGRITY: GREEN**
- **FALSE PERSONALIZATION: GREEN**
- **LONGITUDINAL BEHAVIOR: GREEN**
- **ADAPTIVE QUALITY: YELLOW** for production due metadata coverage/migration conditions

Adaptive engine remains API/test-only. Student Home was not modified. No production data was inserted or modified.
