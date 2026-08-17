# BC ASSESSMENT ENGINE 2.2 — REALISTIC STUDENT SIMULATION + CALIBRATION

## Baseline

```
engine: lib/diagnostic/ability.ts (v2.1, uncommitted)
fixtures: scripts/fixtures/assessment-archetypes.ts (NEW)
```

## Summary

Engine diuji dengan **16 archetype murid sintetis** (S1–S16), **8 kasus adversarial** (A–H), **uji monotonicity**, dan **1.000 set evidence acak (Monte Carlo)**. Hasil: semua perilaku engine masuk akal, jujur terhadap ketidakpastian, deterministik, dan cepat (avg **0.14 ms/profile**).

## 1. Synthetic Profiles (S1–S16)

| Archetype | Expected | Actual | Verdict |
|---|---|---|---|
| S1 semua pemula (bukti tipis) | confidence LOW, placement bukan TINGGI, mastery none | ✅ LOW, bukan TINGGI, 0 PROFICIENT | PASS |
| S2 semua kuat | HIGH, strongest ada, TINGGI, mastery PROFICIENT | ✅ | PASS |
| S3 Reading kuat, Grammar lemah | strongest READING, focus GRAMMAR | ✅ | PASS |
| S4 Grammar kuat, Vocabulary lemah | strongest GRAMMAR, focus VOCABULARY | ✅ | PASS |
| S5 akurasi tinggi, bukti sedikit | accuracy 100% tapi confidence BUKAN HIGH | ✅ | PASS |
| S6 akurasi rendah, bukti banyak | accuracy ≈0.4 jujur, bukan HIGH, bukan PROFICIENT | ✅ | PASS |
| S7 Easy kuat, Medium lemah | consistency VARIED, mastery bukan PROFICIENT | ✅ | PASS |
| S8 Easy lemah, Hard kuat | mastery bukan PROFICIENT (pola tak konsisten) | ✅ | PASS |
| S9 meningkat | signal CURRENT | ✅ | PASS |
| S10 menurun | signal CONTRADICTED | ✅ | PASS |
| S11 baseline kuat, recent lemah | CONTRADICTED (tidak overwrite naif) | ✅ | PASS |
| S12 baseline lemah, recent kuat | CURRENT (membaik) | ✅ | PASS |
| S13 satu skill terukur | coverage.skills < 0.5, bukan HIGH | ✅ | PASS |
| S14 banyak bukti, subskill sempit | coverage.subskills < 0.3, bukan HIGH | ✅ | PASS |
| S15 sempurna tapi hanya EASY | band DIBATASI DASAR, bukan PROFICIENT | ✅ | PASS |
| S16 70% merata EASY/MED/HARD | accuracy ≈0.7, diff coverage 3, band MENENGAH/TINGGI | ✅ | PASS |

## 2. Golden Tests — 39/39 PASS

Semua assertion perilaku (band-level, bukan angka pasti): strongest/focus/insufficient/confidence/placement/mastery/signal.

## 3. Adversarial Cases (A–H) — 23/23 PASS

| Case | Hasil |
|---|---|
| A 1/1 HARD | band TINGGI (sinyal sulit) + confidence LOW (tidak overclaim) + bukan PROFICIENT |
| B 10/10 EASY | band DIBATASI DASAR + bukan PROFICIENT |
| C 10/10 EASY+MEDIUM | TINGGI + mastery wajar (20 bukti, 2 diff, subskill teruji) |
| D 10/10 EASY+HARD | TINGGI |
| E 50/100 MEDIUM | accuracy 0.5 jujur + confidence bukan HIGH + bukan PROFICIENT |
| F 1/10 EASY + 10/10 HARD | TINGGI (10 HARD benar mendominasi wajar) |
| G 100% satu subskill | coverage.subskills < 0.3 + overall bukan HIGH |
| H 100% satu subskill | mastery NOT_ENOUGH_EVIDENCE (subskill sempit) |

**Fix kalibrasi:** gate mastery `subskillCoverage ≥ 0.4` (sebelumnya hanya `> 0`) — mencegah mastery dari 20 soal satu subskill. Semua test regression tetap hijau.

**Weight sanity:** EASY=1.0 · MEDIUM=1.5 · HARD=2.0 · VERY_HARD=2.5. 1 HARD benar = 2 EASY benar (bukan dominan berlebihan). 10 EASY salah + 1 HARD benar → weightedAccuracy < 0.3 (tidak overclaim).

## 4. Monotonicity — 14/14 PASS

- Confidence ladder: 0→NO_DATA, 2→LOW, 8→MEDIUM, 12→HIGH — tidak turun saat bukti konsisten bertambah (10→25→50).
- Difficulty lebih luas + akurasi sama → ability tidak menurun (EASY-only DASAR → +MEDIUM → +HARD).
- Evidence lebih buruk → weightedAccuracy turun (alasan jelas), tapi confidence bukti tidak turun.
- 50 bukti satu skill EASY ≠ HIGH; 50 bukti lintas skill → confidence lebih tinggi.

## 5. Monte Carlo (1.000 set acak) — 14/14 PASS

- **0 NaN / Infinity / division by zero** di 1.000 profil.
- **0 nilai di luar rentang** (accuracy/weighted/subskillCoverage/difficultyCoverage/coverage).
- **0 confidence anomaly**: tidak ada HIGH dengan totalEvidence < 15.
- **0 mastery anomaly**: tidak ada PROFICIENT dengan attempts < 10 / diffCoverage < 2 / subskillCoverage < 0.4.
- **0 placement anomaly**: band selalu DASAR/MENENGAH/TINGGI, level 1–12 valid.
- Distribusi: confidence LOW 268 / MEDIUM 690 / HIGH 42; placement DASAR 857 / MENENGAH 95 / TINGGI 48 — bervariasi, wajar.
- Edge case evidence kosong: placement null, confidence NO_DATA, signal INSUFFICIENT, 7 skill insufficient.

## 6. Performance

```
avg: 0.138 ms/profile · min: 0.010 ms · max: 49.3 ms (warm-up JIT) · total 138 ms / 1.000
target < 10 ms → ✅ 70× lebih cepat
```

`computeAbilityProfile()` murni deterministik — **tanpa DB query** di fungsi scoring.

## 7. Personalization & Student Home Sanity

- Reading lemah + Grammar kuat → rekomendasi **READING** (bukan random) ✅
- S3 (Reading kuat, Grammar lemah) → rekomendasi **GRAMMAR** ✅
- Semua skill tanpa bukti → **CONTINUE_EVIDENCE** (bukan "latih skill X") ✅
- Bukti tipis (S1) → confidence **bukan PROFILE_CONFIDENT** (tidak overclaim) ✅
- S2 semua kuat → tidak menyuruh baseline ulang ✅
- Copy jujur: "Belum cukup terukur" (insufficient) · "BC masih memetakan kemampuanmu" (low confidence, diperbarui) · "BC sudah cukup mengenali kemampuanmu" (PROFILE_CONFIDENT, diperbarui) ✅

## 8. Baseline vs Recent

`detectReassessmentSignal(baseline, recent)` → **CURRENT / AGING / CONTRADICTED / INSUFFICIENT**:
- S11 (baseline kuat, recent lemah) → **CONTRADICTED** — profil tidak di-overwrite naif; sinyal tersedia untuk recommendation layer.
- S12 (baseline lemah, recent kuat) → **CURRENT** (membaik).
- Tidak memaksa assessment ulang otomatis — signal hanya untuk rekomendasi.

## 9. Calibration Decisions

1. **Gate mastery subskill ≥ 0.4** (fix dari adversarial H).
2. **Overall confidence HIGH butuh subskill coverage ≥ 0.3** (fix dari S14/G — banyak bukti satu subskill ≠ profil yakin).
3. **Generator fixture `fill()` diperbaiki** agar akurasi target menyebar untuk n kecil (deterministik, coprime).
4. S1 dijadikan "pemula sejati" (bukti tipis) agar menguji jalur honest.
5. Copy low-confidence: "mengenali" → **"memetakan"** (selaras spesifikasi); PROFILE_CONFIDENT: "Profil sudah cukup akurat" → **"BC sudah cukup mengenali kemampuanmu"**.

## 10. Regression — semua hijau

| Test | Hasil |
|---|---|
| test:assessment-simulation (NEW) | ✅ 39/39 |
| test:assessment-adversarial (NEW) | ✅ 23/23 |
| test:assessment-monotonicity (NEW) | ✅ 14/14 |
| test:assessment-randomized (NEW) | ✅ 14/14 |
| test:assessment-quality | ✅ 45/45 |
| test:assessment-engine | ✅ 36/36 |
| test:arena-web | ✅ 94/94 |
| test:diagnostic-assessment | ✅ 48/48 |
| test:diagnostic-personalization | ✅ 32/32 |
| test:my-day-home | ✅ 37/37 |
| test:my-day-personalization | ✅ 25/25 |
| test:adaptive-practice | ✅ 25/25 |
| test:learner-state | ✅ 24/24 |
| tsc / ESLint | ✅ 0 / 0 |
| no-emoji | ✅ 0 regresi baru (2 pre-existing) |
| git diff --check | ✅ bersih |
| DB | READ ONLY |
| Protected zones (prisma, gamification, engines, TTS, Arena game) | ✅ 0 diff |

## 11. Files Changed (fase 2.2)

| File | Change |
|---|---|
| `lib/diagnostic/ability.ts` | +`detectReassessmentSignal` (CURRENT/AGING/CONTRADICTED/INSUFFICIENT), `reassessmentSignal` di profile, options baseline/recent, gate mastery subskill ≥0.4, overall HIGH butuh subskill coverage ≥0.3 |
| `lib/diagnostic/personalization.ts` | Copy low-confidence "BC masih memetakan kemampuanmu" |
| `lib/diagnostic/assessment-state.ts` | Copy PROFILE_CONFIDENT "BC sudah cukup mengenali kemampuanmu" |
| `scripts/fixtures/assessment-archetypes.ts` | **NEW** — 16 archetypes + 8 adversarial + generator deterministik |
| `scripts/test-assessment-{simulation,adversarial,monotonicity,randomized}.ts` | **NEW** — 4 suite |
| `package.json` | 4 script test baru |

## Final Verdict

**PASS**

## Commit

**NOT CREATED**

## Push

**NOT CREATED**
