# ADAPTIVE LEARNING READINESS (AUDIT ONLY)

Apakah arsitektur existing bisa mendukung loop:
`murid → skill lemah → difficulty tepat → soal belum pernah → hasil → update skill → rekomendasi berikutnya`

## Existing Components
| Kebutuhan | Existing | File |
|-----------|----------|------|
| Skill data | LearningSkill (7 skill, level 1–100 dari XP skill) | lib/learning-loop/skills.ts |
| Rekam aktivitas + skillDelta | recordActivity (PlayerActivity + LearningSkill) | lib/learning-loop/activity.ts |
| Riwayat soal per user | TestSession.questionSnapshot (simulasi); XPTransaction ref; PlayerActivity.reference | prisma + lib |
| Difficulty | Difficulty enum (EASY/MEDIUM/HARD) di UKBI/TKA/bank game | schema + banks |
| Randomisasi + anti-repeat | sampleQuestions (seeded, recentIds) / pickRampedQuestions (band lvl) | lib/game-questions/sampler, lib/game/harvest |
| Rekomendasi | LearningRecommendation (rule-based, max 3, TTL 7d) | lib/learning-loop/recommend.ts |
| Next action | PlayerCTA | lib/learning-loop/next-action.ts |

## Missing Components (untuk Adaptive Practice Engine)
1. **Difficulty dari SKILL (bukan level unit)**: mapping skillLevel→kesulitan soal (mis. skill 1–20 → EASY, 21–60 → MEDIUM, 61–100 → HARD).
2. **Pool soal per skill**: bank game/UKBI belum di-tag ke 7 LearningSkill (topic ≠ skill). Butuh map topic→skill atau kolom baru.
3. **Item-response update**: update skillDelta dari benar/salah per difficulty (rule-based sederhana cukup: benar di difficulty d → +delta(d), salah → −delta kecil).
4. **Adaptive session state**: pertanyaan berikutnya dipilih dari hasil sebelumnya dalam satu sesi latihan.

## Technical Debt
- Bank soal game & UKBI memakai `topic/kategori/seksi`, bukan `skill` — perlu mapping layer, bukan schema baru (P0: mapping JSON topic→skill).
- `sampleQuestions` sudah mendukung seed+recentIds+difficultyTargets+spread — siap dipakai adaptive.
- LearningSkill belum punya "last practiced" per skill (PlayerActivity bisa jadi sumber — query terakhir per skill).

## Recommended Architecture
```
AdaptivePracticeSession (state klien/server)
 ├─ pick: skill terlemah (LearningSkill) → map difficulty → sampleQuestions(seed, recentIds, difficultyTargets)
 ├─ answer: server validate (bank jawaban server-side)
 ├─ update: recordActivity({skill, skillDelta(hasil)}) → refresh PlayerCTA
 └─ loop
```

## Database Changes Required (fase build, BUKAN sekarang)
- TIDAK WAJIB: cukup mapping topic→skill (file JSON) + reuse PlayerActivity.
- Opsional: `LearningSkill.lastPracticedAt` (additive) untuk prioritas skill.

## API Changes Required (fase build)
- GET `/api/player/adaptive/next` (skill terlemah + difficulty + soal sanitasi).
- POST `/api/player/adaptive/submit` (validate jawaban server-side, skillDelta, return soal berikutnya).

## Test Strategy
- Pure: mapping skill→difficulty; skillDelta rules; sampler difficulty targets.
- Static: jawaban tidak bocor ke klien (pola sanitasi existing dipakai ulang).
- Integration (env asli): 1 sesi 10 soal → skill naik → rekomendasi berubah.

## Verdict
**READY** — fondasi lengkap; yang hilang hanya mapping topic→skill + session orchestration. Bukan pekerjaan fase Step 1.
