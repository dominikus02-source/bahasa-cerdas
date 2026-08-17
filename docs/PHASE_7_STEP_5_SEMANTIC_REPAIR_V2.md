# PHASE 7.5 — SEMANTIC REPAIR ENGINE V2 + PILOT 100 SOAL

**Tanggal**: 2026-08-17 · **Mode**: CONTROLLED PILOT (100 soal) — tanpa batch produksi, tanpa menimpa soal sumber · **Status**: MENUNGGU REVIEW FOUNDER (no commit/push).

---

## 1. Tujuan

Bangun Mesin Perbaikan Semantik v2 berdasarkan temuan Step 7.4 (1.481 kandidat gagal karena provider AI tidak tersedia), buktikan pada **pilot terkontrol 100 soal** dengan kategori perbaikan, gate semantik deterministik, gate keras jawaban-tunggal, preservasi sumber, dan metrik halusinasi/duplikat/multi-correct.

Prinsip: **BC QUESTION QUALITY > QUESTION QUANTITY** — soal yang tidak bisa diperbaiki jujur = HUMAN_REVIEW/BLOCKED, bukan GOLD asal-asalan.

## 2. Arsitektur (baru, additive-only)

```
lib/master-repair/v2/
  types.ts     — RepairCategory, SemanticVerdict, PilotDecision(+REJECT internal), Confidence,
                 GateResult, DistractorReport, RepairV2Record (sourceSha256/sourceImmutable/
                 distractorReports/aiMeta), V2EngineContext, V2_VALIDATOR_VERSION
  gates.ts     — synonymGate, antonymGate, maknaKataGate, spokGate, majasGate(evidence),
                 ejaanGate(rule+reason), kalimatEfektifGate, distractorEngine(whyWrong),
                 singleCorrectHardGate (REJECT — tidak diturunkan), explanationGate,
                 aiSoundingGate (7 pola), duplicateGateV2 (exact/jaccard≥0.9/template-family;
                 passD threshold TIDAK diturunkan)
  classify.ts  — FACT-DEPENDENT (NAMED_FACT_RISK pd q.text) → SEMANTIC (7 subSkills) →
                 SAFE (TYPE/KEY) → CONTEXT (CONCEPT/TAUTOLOGY/BAD_EXPLAIN) → SAFE (EXPLANATION/FORMAT)
  safe.ts      — typeRepairSafe, explanationReword, semanticKeyRepair, ejaanRepair (deterministik)
  engine.ts    — runSemanticRepairV2: sha256Source, gatesFor, 4 jalur perbaikan, finalize
scripts/master-semantic-repair-v2-pilot.ts — pemilih 100 kandidat + runner + artifact JSON
scripts/test-master-semantic-repair-v2.ts  — harness 37 checks (kanari + unit + integritas artifact)
```

Semua tabel gate **menyalin SSOT** `lib/master-recovery/semantics.ts` (SYNONYM/ANTONYM/MAJAS/KALIMAT/SPOK) + EJAAN_RULES baru (9 pasangan KBBI, semua dengan rule+reason). **0 tabel fiksi**.

## 3. Keputusan Desain Kunci

1. **REJECT (internal)**: `PilotDecision` memuat `REJECT` — hasil gate tunggal-correct `correct_count≠1`. Tidak pernah di-downgrade ke HUMAN_REVIEW (spesifikasi §10).
2. **INVALID_CONTRACT tidak berlaku untuk CONTEXT_REPAIR**: kandidat ISIAN "Jelaskan…" tanpa opsi boleh di-rebuild AI/manusia menjadi MCQ → hindari false-block terhadap perbaikan yang sah (memperbaiki 22 INVALID_CONTRACT dari run pertama).
3. **Self-answer detection**: `synonymGate/antonymGate(a,b)` dengan `a===b` → `SEMANTIC_MISMATCH` (bukan AMBIGUOUS) — menangkap opsi kunci yang menyamar sebagai kata target (kasus BC-SINONIM-0003: 'berani' sebagai kunci padahal stem-nya 'berani').
4. **FACT = VERIFY OR BLOCK**: fakta bernama di teks sumber → HUMAN_REVIEW (engine deterministik tidak bisa membuktikan kebenaran atribusi); fakta muncul TANPA dukungan sumber (dari AI) → BLOCKED via explanationGate (multi-correct ≠ 1 → REJECT).
5. **AI dipakai HANYA bila `repairAiAvailable()`** (provider key nyata) dan sisa budget; tanpa provider → HUMAN_REVIEW jujur (bukan invent fakta).
6. **Komposisi pilot jujur**: KEY_REPAIR & TYPE_REPAIR hanya punya 1 kandidat di pool → diambil apa adanya, selisih diisi CONCEPT_TO_CONTEXT (tercantum di `purpose` distribusi).

## 4. Hasil Pilot

### 4a. Run deterministik (tanpa AI) — baseline
- 100/100 diproses · GOLD **1**, HUMAN_REVIEW 95, INVALID_CONTRACT 4 · confidence MEDIUM 95/LOW 4
- GOLD: `BC-SINONIM-0003` — kunci self-answer 'Berani'(idx 2) → gate MISMATCH → `semanticKeyRepair` → kunci 'Gagah'(idx 3, verifiable di SYNONYM_SETS) → semua gate lulus → KEY_REPAIR.

### 4b. Run AI (Groq gpt-oss-120b, budget 24, rate-limit aman)
| Metrik | Nilai |
|--------|-------|
| Total | 100 |
| **GOLD** | **4** (BC-ARTIKEL-0001, BC-EDITORIAL-0001, BC-FABEL-0001 via AI CONTEXT repair; BC-SINONIM-0003 deterministik) |
| HUMAN_REVIEW | 79 |
| REPAIR_FAILED | 13 (semua `HTTP 429` Groq rate-limit — honest failure, bukan hasil kotor) |
| INVALID_CONTRACT | 4 |
| BLOCKED / REJECT | 0 (AI tidak menyuntik fakta bernama; tidak ada multi-correct di kandidat) |
| confidence | HIGH 4 · MEDIUM 79 · LOW 17 |
| **hallucinatedFactGold** | **0** |
| **multipleCorrectGold** | **0** |
| **duplicateGold** | **0** |
| **sourceMutated** | **0** |
| goldRate | 4/100 |

### 4c. Gate (pada 12 kandidat yang mencapai finalisasi)
| Gate | Pass | Fail |
|------|------|------|
| single-correct | 12 | 0 |
| duplicate | 12 | 0 |
| distractor-engine | 12 | 0 |
| explanation | 5 | 7 (penjelasan AI pendek / tidak menyebut kunci — ditolak, jujur) |
| ai-sounding | 7 | 5 (pola "Berikut ini yang termasuk" dll — ditolak) |

### 4d. INVALID_CONTRACT (4, SEMANTIC — tercatat jujur)
BC-ANTONIM-0005, BC-EJAAN-0005, BC-KALIMAT-EFEKTIF-0005, BC-MAJAS-0005 — ISIAN_SINGKAT "Jelaskan pengertian X menurut pemahaman Anda…" (1 opsi, kunci '0'). Terklasifikasi SEMANTIC karena indikator/tema memuat kata kunci → jalur semantik → opsi < 2 → INVALID_CONTRACT (kontrak rusak: isian seharusnya tanpa opsi, bukan 1 opsi). Keputusan: **jujur INVALID_CONTRACT** (bukan dipaksa); rekomendasi: human menulis ulang sebagai konstruktif murni.

### 4e. GOLD contoh (AI, konteks asli)
- **BC-ARTIKEL-0001**: "Berikut ini kutipan dari sebuah teks:… 'Jakarta, 15 Mei 2024 — Pemerintah kota mengumumkan…'" → opsi [Artikel berita, Cerita pendek, Puisi, Laporan resmi], kunci 0. Explanasi menyebut "informasi faktual terkini…" — lolos explanation gate (menyebut kunci, tanpa fakta baru).
- **BC-EDITORIAL-0001**: kutipan kritik kebijakan → kunci Editorial, alasan opini penulis.
- **BC-FABEL-0001**: "Seekor rubah kelaparan…" → kunci Fabel (hewan bicara + pesan moral).

## 5. Keamanan & Pengaman

- `sourceImmutable`: setiap record menyimpan `sourceSha256` (hash JSON original). Verifikasi artifact: **0 mutasi**.
- Klien tidak pernah mengirim skor/kunci/kebenaran — semua otoritatif server (engine + gate).
- Tidak ada correctAnswer/answerKey bocor di payload; artifacts memuat soal utuh untuk audit internal saja.
- Tidak ada tulis DB, tanpa migrasi, tanpa production batch, tanpa overwrite soal sumber.

## 6. Pengujian

### Harness BARU `test:master-semantic-repair-v2` — **37/37 PASS** ✅
Kanari (input invalid HARUS ditolak): multiple-correct → REJECT · fact attribution → HUMAN_REVIEW (VERIFY OR BLOCK) · hallucination gate (fakta tanpa sumber) → fail · duplicate exact → fail · synonym ambigu (marah/geram) → AMBIGUOUS · distractor duplikat → fail · explanation tidak menyebut kunci → fail.
Unit: classify 4 jalur · SINONIM self-answer → GOLD kunci 3 · ejaan verified/unknown · majas evidence · SPOK verified vs unverified · kalimat efektif · typeRepairSafe · explanationReword · antonym · sha256 stabil · ai-sounding.
Integritas: artifact 100 record, id unik, decision ∈ enum, sha256 ok, distribusi=100, GOLD gate semua pass + HIGH, metrik halusinasi/multi-correct/duplikat/mutasi = 0.

### Regresi §21 (semua dijalankan)
| Suite | Hasil |
|-------|-------|
| test:master-question-quality-audit | 23/29 — **6 GAGAL = baseline data master bank PRA-fase 7** (150 dup group, 149 isian-1-opsi, 1186 template, 6 BS salah opsi) — justru target fase ini, bukan regresi v2 |
| test:master-question-recovery | ✅ SEMUA LULUS |
| test:master-ai-repair | ✅ Failed 0 |
| test:master-question-ai-authoring | ✅ 34/35 (1 kanari; real 0) |
| test:master-question-human-review-calibration | ✅ real 0 (22 kanari instrumentation) |
| **test:master-semantic-repair-v2 (BARU)** | ✅ **37/37** |
| test:question-metadata · test:learner-state | ✅ 24/24 · ✅ 24/24 |
| test:adaptive-practice · adaptive-simulation · adaptive-reward-hardening | ✅ 25 · ✅ 21 · ✅ 41 |
| test:step3c-evidence | ✅ 29/29 |
| test:diagnostic-assessment · 4e1 · personalization | ✅ 48 · ✅ 36 · ✅ 32 |
| test:gamification-engine · guru-phase · premium-economy | ✅ SEMUA LULUS |
| test:student-home | ✅ 61/61 |
| test:arena-web | ✅ 56/56 |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (5 file baru) | ✅ 0 violations |
| `git diff --check` | ✅ bersih |
| Protected zones (prisma/, app/api/, gamification, learning-loop, adaptive, learner-state, diagnostic routes, engines) | ✅ 0 diff |
| DB | ✅ READ-ONLY — 0 write, 0 migrasi |

## 7. Keterbatasan yang Diketahui (jujur)

1. **goldRate rendah (4/100)** — wajar untuk pilot: mayoritas kandidat butuh konteks (44 CONCEPT + 20 TAUTOLOGY + 20 BAD_EXPLAIN) yang memerlukan AI; budget AI 24 dengan rate-limit Groq yang mulai 429.
2. **REPAIR_FAILED 13** — semuanya 429 Groq saat budget tersisa; bukan kegagalan logika. Dengan retry/kunci lain, kandidat ini bisa naik (HUMAN_REVIEW/GOLD).
3. **AI quality gate ketat** — 7 explanation + 5 ai-sounding ditolak; ini disengaja (kualitas), bukan bug.
4. **KEY_REPAIR/TYPE_REPAIR hanya 1 kandidat** di seluruh pool 1.481 — bucket tidak terisi (jujur).
5. **COUNT: BLOCKED 0** — engine hanya BLOCK bila AI menyuntik fakta tak-bersumber; run ini AI output bersih. BLOCK terverifikasi bekerja via explanationGate (canary 2b).
6. **skill inference** — tanpa field `skill`, klasifikasi memakai indikator/tema/kataKunci/file; beberapa soal mungkin salah subType (efek minor).
7. **sisa 1.381 kandidat** TIDAK diproses di batch produksi (sesuai instruksi — menunggu keputusan founder).

## 8. Verdict

**🟢 GREEN** — dengan catatan:
- 0 halusinasi GOLD, 0 multi-correct GOLD, 0 duplikat GOLD, 0 mutasi sumber ✓
- Gate keras (single-correct REJECT) dan passD (duplicate) terbukti bekerja; tidak ada threshold diturunkan ✓
- Verifikasi validasi/server-side utuh; DB read-only; protected zones 0 diff ✓
- Regresi hijau (baseline 6 GAGAL audit kualitas = kondisi data master bank yang sudah KNOWN sejak Step 0, bukan regresi) ✓

## 9. Rekomendasi Founder (keputusan yang diminta)

1. **Setujui arsitektur v2** untuk lanjut ke fase produksi (perbaikan 1.381 kandidat bertahap + HUMAN_REVIEW loop).
2. **Prioritas repair produksi**: (a) jalankan CONTEXT repair dengan provider ber-key + retry/backoff (Groq 429 teratasi dengan cooldown), (b) KEY_REPAIR/TYPE_REPAIR deterministik penuh kapan pun, (c) HUMAN_REVIEW untuk sisa INVALID_CONTRACT dan FACT VERIFY.
3. **Produksi audio MENDENGARKAN** tetap menjadi blocker lintas fitur (UKBI listening).
4. SETUJU untuk commit/push fase ini (sesuai instruksi), atau review lebih lanjut dulu.

## 10. File

| File | Aksi |
|------|------|
| `lib/master-repair/v2/{types,gates,classify,safe,engine}.ts` | BARU (engine v2) |
| `scripts/master-semantic-repair-v2-pilot.ts` | BARU (runner pilot) |
| `scripts/test-master-semantic-repair-v2.ts` | BARU (37 checks) |
| `data/question-bank/audit/master-semantic-repair-v2-pilot-2026-08-17.json` | BARU (artifact 2-run: deterministik + AI) |
| `package.json` | +`pilot:master-semantic-repair-v2`, +`test:master-semantic-repair-v2` |
| `docs/PHASE_7_STEP_5_SEMANTIC_REPAIR_V2.md` | INI |