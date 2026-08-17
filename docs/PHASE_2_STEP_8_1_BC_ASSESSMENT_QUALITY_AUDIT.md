# BC ASSESSMENT ENGINE 2.1 — ASSESSMENT QUALITY + SCORING AUDIT

## Baseline

```
commit: (BC Assessment Engine 2.0 — uncommitted working tree)
engine: lib/diagnostic/ability.ts (NEW)
```

## PHASE 1 — READ-ONLY AUDIT

### Current Measurement

```
Tes Awal (diagnostic)
  └→ selectDiagnosticQuestions() — blueprint 8/10/12, difficulty plan EASY≈30%/MED≈40%/HARD≈30%
  └→ answer → LearningEvidence (source BANK_SOAL, activityId=session.id)
  └→ complete → buildSessionProfile() → DiagnosticProfile (raw accuracy per skill)
```

### Blueprint (AUDIT A)

| Skill | Soal (ukuran 10) | Subskill | Difficulty | Source | Valid? |
|---|---|---|---|---|---|
| READING | 2 | dipilih seluas mungkin (tidak ditarget) | plan EASY/MED/HARD | BANK_SOAL APPROVED | ✅ |
| GRAMMAR | 2 | tidak ditarget | plan | BANK_SOAL | ✅ |
| VOCABULARY | 2 | tidak ditarget | plan | BANK_SOAL | ✅ |
| LITERATURE | 1 | tidak ditarget | plan | BANK_SOAL | ✅ |
| WRITING | 2 | tidak ditarget | plan | BANK_SOAL | ✅ |
| LISTENING | 1 | tidak ditarget | plan | BANK_SOAL (jika korpus ada) | ⚠️ fallback jujur dicatat |
| SPEAKING | 0 | — | — | — | tidak pernah direquest (aman) |

**Temuan:** selector memilih per-skill, bukan per-subskill — subskill coverage bersifat insidental. Difficulty plan per slot ada (EASY/MED/HARD), tapi scoring TIDAK memakai difficulty.

### Scoring (AUDIT C/D)

- `computeProfileFromEvidence`: per-skill accuracy = correct/attempts — **RAW, tanpa difficulty weighting**.
- Difficulty hanya dipakai untuk `strongestEvidence` (difficulty tertinggi yang benar).
- Category: ≥0.8 STRONG, ≥0.6 DEVELOPING, else WEAK (hanya jika attempts > 0).
- **Masalah:** 5/5 EASY dan 5/5 HARD menghasilkan category yang sama.

### Confidence (AUDIT E/F)

- Diagnostic: `confidenceFor(attempts, recentAccuracy)` — ≥5 attempts + recent ≥0.7 → PROFILE_CONFIDENT, else PROVISIONAL.
- Learner-state: attempts <5 LOW, <10 MEDIUM, else HIGH.
- **Masalah:** confidence TIDAK mempertimbangkan difficulty coverage, subskill coverage, konsistensi, source reliability.

### Coverage (AUDIT G)

- Skill coverage: `withUntestedSkills` menambah skill tanpa bukti → INSUFFICIENT_EVIDENCE (jujur) ✅
- Subskill coverage: **TIDAK dihitung** — LearningEvidence tidak menyimpan subskill.
- Difficulty coverage: tidak dihitung.

### Mastery (AUDIT H)

- Learner-state: `masteryFor` — attempts ≥10 + recent ≥5 + accuracy ≥0.8 + recent ≥0.8 + trend ≠ DECLINING → PROFICIENT ✅ (sudah baik)
- Diagnostic category: STRONG dari 1/1 → kemampuan label, tapi confidence PROVISIONAL mengawal. **Bukan mastery.**

### Evidence Sources (AUDIT J/M)

| Source | Menulis LearningEvidence? | Reliability |
|---|---|---|
| BANK_SOAL (diagnostic) | ✅ (activityId=session.id) | HIGH |
| BANK_SOAL (adaptive) | ✅ | MEDIUM |
| JALUR_CERDAS | ✅ | MEDIUM |
| LATIHAN (quiz) | ✅ | MEDIUM |
| ARENA | ❌ (XP saja) | — |
| UKBI/TKA | ❌ | — |
| KARYA | ❌ | — |

**Temuan:** diagnostic profile murni dari evidence sesi (assessment ≠ practice) ✅. Arena/UKBI/TKA/Karya belum masuk LearningEvidence — aman untuk saat ini (tidak ada kontaminasi).

### Recency (AUDIT K)

- Learner-state: recent (10 terakhir) vs historical + trend ✅
- Diagnostic: snapshot sesi tunggal (fine untuk baseline).

### Contradiction (AUDIT L)

- Learner-state trend menangkap shift recent vs historical (≥0.1).
- Diagnostic: tidak ada deteksi kontradiksi antar sesi — tidak dalam scope minimal.

## Critical Problems

1. **P0 — Scoring tidak difficulty-aware.** 5/5 EASY = 5/5 HARD di mata engine.
2. **P1 — Confidence tidak mempertimbangkan coverage.** 2/2 bisa terlihat sama dengan 20/20.
3. **P1 — Subskill coverage tidak diukur.** "Grammar belum cukup terukur" tidak bisa dibedakan dari "Grammar lemah" berdasarkan data.
4. **P1 — Tidak ada canonical ability profile** (strongest/focus/insufficient + confidence + coverage dalam satu fungsi).

## PHASE 2 — IMPLEMENTATION

### Canonical Ability Engine — `lib/diagnostic/ability.ts` (NEW)

**`normalizeEvidence(items)`** — canonical normalizer: menerima DiagnosticEvidenceDetail / LearningEvidence rows, membuang skill invalid & isCorrect null, menormalkan difficulty/subskill.

**`computeAbilityProfile(items)`** — fungsi kanonik (MURNI, deterministik):

```
output: {
  skills: [{ skill, accuracy, weightedAccuracy, abilityBand, maxDifficultySeen,
             maxDifficultyCorrect, subskillCoverage, difficultyCoverage,
             confidence, masteryState, consistency, note }],
  strongest, focus, insufficient,
  overallConfidence, coverage {skills, subskills, difficulties},
  placement, profileVersion
}
```

### Difficulty-Aware Ability (P1)

```
difficultyWeight: EASY=1.0 · MEDIUM=1.5 · HARD=2.0 · VERY_HARD=2.5
weightedAccuracy = Σ(correct×weight) / Σ(weight)

abilityBandFor(weightedAccuracy, maxDifficultySeen):
  hanya EASY → DASAR (sinyal terbatas)
  MEDIUM tercapai → ≥0.8 TINGGI · ≥0.6 MENENGAH · else DASAR
  HARD/VERY_HARD → ≥0.7 TINGGI · ≥0.5 MENENGAH · else DASAR
```

**5/5 EASY ≠ 5/5 HARD** — profiler beda, explainable, tanpa IRT/Rasch.

### Confidence (P1)

```
skillConfidenceFor(attempts, difficultyCoverage, subskillCoverage, accuracy):
  0 bukti → NO_DATA
  <5 → LOW
  ≥5 + difficultyCoverage ≥2 → MEDIUM
  ≥10 + diffCoverage ≥3 + accuracy ≥0.7 + subskill teruji → HIGH
```

**2/2 = LOW confidence, 10/12 = MEDIUM, 25/30 = HIGH** — ABILITY ≠ CONFIDENCE.

### Coverage (P1)

- subskillCoverage = subskill teruji / total subskill taksonomi skill
- difficultyCoverage = jumlah tingkat kesulitan berbeda (0–4)
- skillCoverage = skill ber-evidence / 7 skill
- insufficient = attempts 0 ATAU < 3 butir → "belum cukup terukur", bukan "lemah"

### Mastery (P1)

```
masteryFor(attempts, accuracy, diffCoverage, subskillCoverage, consistency):
  attempts <10 atau coverage <2 → NOT_ENOUGH_EVIDENCE
  consistency VARIED → DEVELOPING
  accuracy ≥0.8 + STABLE → PROFICIENT
```

### Consistency (P2 — contradiction signal)

`consistencyFor(items)`: akurasi per tingkat kesulitan; spread >0.3 → VARIED (sinyal kontradiktif), dan VARIED memblokir mastery PROFICIENT.

### Wiring — `app/api/player/diagnostic/route.ts`

- `answerDiagnostic`: subskill direkam di metadata evidence (additive, tanpa migrasi).
- `loadSessionEvidence`: baca subskill dari metadata.
- `buildSessionProfile`: return `{ profile, abilityProfile }` — kompatibel dengan semua caller (`.profile`), additive `abilityProfile` di payload complete/GET/preview.

### UI — `app/arena/diagnostic/[sessionId]/page.tsx`

Blok baru **"Profil Awalmu"** di ResultPanel:
- **Mulai kuat** (strongest) / **Perlu dilatih** (focus) / **Belum terukur** (insufficient)
- Catatan confidence: "Kepercayaan BC masih rendah — butuh lebih banyak bukti" (honest)
- "Profil awal — akan semakin akurat setelah kamu berlatih."

## Tests

| Check | Hasil |
|---|---|
| `test:assessment-quality` (NEW) | ✅ **45/45** |
| `test:assessment-engine` | ✅ 36/36 |
| `test:arena-web` | ✅ 94/94 |
| `test:diagnostic-assessment` | ✅ 48/48 |
| `test:diagnostic-personalization` | ✅ 32/32 |
| `test:my-day-home` | ✅ 37/37 |
| `test:my-day-personalization` | ✅ 25/25 |
| `test:adaptive-practice` | ✅ 25/25 |
| `test:learner-state` | ✅ 24/24 |
| TypeScript | ✅ 0 errors |
| ESLint | ✅ 0 errors |
| no-emoji | ✅ 0 regresi baru (2 pre-existing) |
| git diff --check | ✅ bersih |
| Protected zones | ✅ 0 diff |
| DB | READ ONLY |

## Protected Zones (0 diff)

Prisma · gamification · learning-loop · engines · XP/coins · bottom-nav · Arena game engine · TTS

## Files Changed

| File | Change |
|---|---|
| `lib/diagnostic/ability.ts` | **NEW** — normalizeEvidence + computeAbilityProfile (canonical) |
| `app/api/player/diagnostic/route.ts` | subskill direkam, abilityProfile additive di payload |
| `app/arena/diagnostic/[sessionId]/page.tsx` | Blok "Profil Awalmu" di hasil |
| `scripts/test-assessment-quality.ts` | **NEW** — 45 asersi quality |
| `package.json` | test:assessment-quality script |

## Final Verdict

**PASS**

## Commit

**NOT CREATED**
