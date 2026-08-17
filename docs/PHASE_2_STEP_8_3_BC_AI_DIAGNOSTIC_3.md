# PHASE 2 · STEP 8.3 — BC AI DIAGNOSTIC 3.0 (AI-Driven Adaptive Diagnostic)

**Status**: DONE — build + tsc + lint + seluruh regression hijau.
**NOT COMMITTED** — menunggu Founder Review (pola fase shell/4E).

## 1. Tujuan

Lapisan diagnostik adaptif berbasis AI di atas engine Assessment kanonik 2.0–2.2
(learner-state + diagnostic profile + `LearningEvidence` sebagai satu-satunya otoritas).
AI menghasilkan soal tes awal secara dinamis (bukan dari bank statis), menyesuaikan
skill/kesulitan per slot, dengan fallback jujur ke bank soal bila generator gagal —
dan **tidak pernah** menulis ke `QuestionMetadata` (lihat §6).

## 2. Arsitektur

```
LearningEvidence (kanonik) → Diagnostic Profile → AI Generator (per-slot) → AdaptivePracticeSession (state JSON)
        ↑                        (read-only)              ↓                                        ↓
        └────────── evidence baru (upsert) ◄───────────── jawaban murid ──────────────────── payload publik
```

- `AdaptivePracticeSession.questionIds` (kolom JSON yang sudah ada) menyimpan
  `AiSessionState {v:1, mode:"AI-ADAPTIVE", targetSize, order, items, usedTopics, usedSubskills, genFailed}`.
- `source = "AI_DIAGNOSTIC"` membedakan sesi AI dari sesi bank — tanpa migrasi Prisma.
- Klien hanya menerima proyeksi publik (`toPublicQuestion`): id, teks, opsi, tipe, skill,
  subskill, difficulty, topic. **Tanpa** correctAnswer/explanation/misconceptionMap/
  evidenceTarget/diagnosticRationale (test kebocoran mengunci ini).

## 3. Modul Baru (`lib/diagnostic-ai/`)

| File | Peran |
|------|-------|
| `config.ts` | Konstanta (source, selectionVersion "3.0", sizes 6/8/10/12/15, default 10, min-useful 6, sesi 30 mnt, model/temp/tokens/timeout, rate limit jawaban 10/10 mnt), `aiDiagnosticEnabled()` (GROQ/DEEPSEEK/GEMINI), kueri skill coverage (READING→GRAMMAR→VOCABULARY→LITERATURE→WRITING, tanpa LISTENING/SPEAKING), plan kesulitan EASY≈30%/MEDIUM≈40%/HARD≈30%, `pickAiDiagnosticSubskill` |
| `types.ts` | `AiDiagnosticItem`, proyeksi publik, `AiNextPlan`, `AiAnswerOutcome`, `AiSessionState`, `isAiSessionState` |
| `validator.ts` | R1–R16 (tipe, panjang teks 20–400, skill valid & bukan LISTENING/SPEAKING, subskill cocok, difficulty, topic, cognitiveTarget, opsi 2–4 unik + PG tepat 4 + BS tepat `Benar`/`Salah` + ISIAN tanpa opsi, correctAnswer index/teks valid, explanation ≥20, misconceptionMap per opsi salah ≥10, evidenceTarget, rationale ≥20, R14 jawaban tidak tertulis di stem, R15 anti stem-duplikat, R16 id wajib & unik) — **reject, bukan auto-repair**; isu dikirim balik ke prompt (maks 3 percobaan: inisial + 2 retry) |
| `prompts.ts` | System prompt 17 aturan (tanpa klise "Sebagai AI,"; JSON persis satu objek) + user prompt per slot (skill/subskill berlabel, kesulitan, topik terpakai, avoid-stems terpotong 80 char, ringkasan evidence sesi) |
| `generator.ts` | `callWithFallback(responseFormat:"text")` → `cleanJSONOutput` → `tryFixJSON` → inject `id: randomUUID()` → validasi → `shuffleItem` (via `shuffleOptions` — posisi jawaban benar bervariasi, server-side) |
| `controller.ts` | `buildInitialState`, `nextPlanForSlot`, `planNextQuestion` (CONTINUE/TARGET_REACHED/GENERATION_UNAVAILABLE), `summarizeSessionEvidence`, `buildAnswerOutcome`, `canCompleteHonestly` (≥6), `stateFromJson` |
| `bank-fallback.ts` | `pickBankFallbackCandidate` (jarak kesulitan → unseen-first → tie-break id deterministik), `toFallbackAiItem` (correctAnswer diambil via `db.soal.findUnique`, evidenceTarget HIGH, jalur tepercaya tanpa re-validasi R11) |
| `persist.ts` | `loadAiSessionState`/`saveAiSessionState` (updateMany scoped id+userId, `Prisma.InputJsonValue`), `evidenceMetadata()` `{version:"1.0", selectionVersion:"3.0", ai:true}` |

## 4. Wiring Route (`app/api/player/diagnostic/route.ts`)

| Cabang | Perilaku AI |
|--------|-------------|
| POST `start` | `aiDiagnosticEnabled()` + size ∈ [6,8,10,12,15] → `startAiDiagnostic` (generate butir pertama, buat sesi `AI_DIAGNOSTIC`, IN_PROGRESS, expires 30 mnt, kembalikan payload adaptif). Gagal/generator null → jatuh ke jalur bank. Rate limit `bca-diagnostic-start` 5/30 mnt tetap. |
| POST `answer` | `isAiSession(session)` → rate limit `bca-diagnostic-ai-answer` (10/10 mnt) → `answerAiDiagnostic`: cocokkan jawaban server-side ke `correctAnswer` (index/teks), simpan `LearningEvidence` (upsert idempotent per (userId, source, activityId, questionId), skill/difficulty/metadata `{ai:true}`), lanjutkan: generate butir berikut atau fallback bank, `reasonCode` ANSWERED/TARGET_REACHED/GENERATION_UNAVAILABLE. |
| GET `?sessionId=` (resume) | `isAiSession(session)` → `getAiDiagnosticPayload`: IN_PROGRESS → butir aktif + sisa; COMPLETED → profil hasil (jalur kanonik `computeProfileFromEvidence` + untested + confidence ladder) — kontrak sama persis dengan sesi bank. |
| GET preview (home) | Tanpa evidence + AI aktif → payload STATE A adaptif (`adaptive: true`, durationLabel, skillsLabel, selectionVersion 3.0) tanpa pemeriksaan pool bank. Ada evidence → perilaku lama (personalization + diagnosticCompleted). |

Jalur bank (selector, profile, personalization, reward, protection harian, dll.) **tidak diubah** — add-only.

## 5. UI (`app/arena/diagnostic/[sessionId]/page.tsx`)

- Mode adaptif: `answeredCount`/`sessionSize` di header + progress bar, `nextQuestion` di-swap tiap jawaban (satu butir aktif), interstitial "Sesi Selesai → Lihat Hasil" saat `remaining === 0`, label tombol "Soal Berikutnya"/"Lihat Hasil" sadar adaptif.
- Panel hasil TIDAK diubah (kolom per kemampuan, band PROVISIONAL, insight, rekomendasi — di-render dari profil kanonik yang sama).
- Klien tidak pernah mengirim skill/difficulty/level/score; hanya `{action, sessionId, questionId, answer}`.

## 6. Keputusan Kunci: AI tidak menulis ke QuestionMetadata

- `METADATA_SOURCES`/`METADATA_STATUSES` di `lib/question-metadata/taxonomy.ts` adalah daftar tertutup:
  tidak ada sumber AI, dan `APPROVED` hanya dari HUMAN_REVIEW/EMPIRICAL.
- Maka butir AI **tidak pernah** ditulis ke `QuestionMetadata` (tidak melewati gate approved-status,
  tidak menyamar sebagai `status='APPROVED'`). Butir hidup di state sesi (JSON), jawaban/statistik
  masuk `LearningEvidence` (source `AI_DIAGNOSTIC`). Ini konsisten dengan keputusan STEP 4B/4E:
  diagnostic = evidence-only, dan korpus bank yang layak masuk pipeline metadata tetap jalur lama.
- Dampak lanjutan: butir AI tidak muncul di candidate pool adaptive/kustomisasi berikutnya —
  di-dokumentasikan sebagai trade-off yang disengaja (kejujuran metadata > visibilitas).

## 7. Keamanan & Anti-Farming

- Kunci jawaban hanya di server; payload publik disanitasi (test §9 memastikan tidak ada
  `correctAnswer`/`misconceptionMap` di UI/page/route payload).
- Rate limit jawaban terpisah (10/10 mnt, identifier `bca-diagnostic-ai-answer`) + start 5/30 mnt.
- Sesi di-scope `where: {id, userId}`; sesi non-DIAGNOSTIC ditolak 403; kedaluwarsa 30 mnt.
- **Tanpa XP/koin** di jalur AI (konsisten Part N 4E) — anti-farming via absence of reward.
- API key (Groq) server-only; test memastikan tidak bocor ke source (sentinel literal dikecualikan
  dari scan hanya di file test itu sendiri).

## 8. File

**Baru**: `lib/diagnostic-ai/{config,types,validator,prompts,generator,controller,bank-fallback,persist}.ts`, `scripts/test-ai-diagnostic.ts`, `docs/PHASE_2_STEP_8_3_BC_AI_DIAGNOSTIC_3.md`
**Diubah**: `app/api/player/diagnostic/route.ts` (wiring AI add-only), `app/arena/diagnostic/[sessionId]/page.tsx` (mode adaptif), `package.json` (`test:ai-diagnostic`)

## 9. Verifikasi

| Check | Hasil |
|-------|-------|
| `npm run test:ai-diagnostic` (BARU) | ✅ 86/86 (R1–R16, plan kesulitan, kueri skill, fallback, proyeksi publik tanpa bocor, prompt, route static, sentinel API key) |
| `npm run test:diagnostic-assessment` | ✅ 48/48 |
| `npm run test:diagnostic-4e1` | ✅ 36/36 |
| `npm run test:diagnostic-personalization` | ✅ 32/32 |
| `npm run test:adaptive-practice` | ✅ 25/25 |
| `npm run test:adaptive-simulation` | ✅ 21/21 |
| `npm run test:adaptive-reward-hardening` (4D) | ✅ 41/41 (route 4D 0 diff) |
| `npm run test:my-day-home` | ✅ 37/37 |
| `npm run test:student-home` | ✅ 61/61 |
| `npm run test:arena-web` | ✅ 56/56 |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:premium-economy` | ✅ 63/63 |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run lint` | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ 371 pages, prerender 371/371, exit 0 |
| `git diff --check` | ✅ bersih |
| Protected zones (prisma/, adaptive route 4D, gamification, learning-loop, engines, learner-state) | ✅ 0 diff |
| DB | READ ONLY — 0 write, 0 migrasi |

## 10. Catatan Provider/Model

- Model: `openai/gpt-oss-120b` (Groq), temp 0.3, maxTokens 2400, timeout 40 dtk, `responseFormat:"text"`
  (tanpa `json_object` — DeepSeek json-mode rawan empty content; prompt JSON-strict + salvage).
- Rantai fallback `callWithFallback` reuse inti provider AI yang sama dengan alat AI lainnya.
- Bila semua provider gagal ×3 percobaan → fallback bank (jujur, `GENERATION_UNAVAILABLE`,
  `canCompleteHonestly` bila ≥6 terjawab) — **error AI tidak pernah menggagalkan tes awal**.

## 11. Remaining (tidak berubah)

1. **Commit/push STEP 4E + 4E.1 + 4E.2 + 8.3 bila disetujui founder**
2. TKA UTBK/Guru enrichment 30 → 150
3. Game server revival (VPS mati)
4. GameRoom migration SQL via Supabase dashboard
5. UI game solo: badge-score client vs server masih beda (kosmetik)
6. SQL `2026-08-02_no_absen.sql` & `2026-08-08_school_identity.sql` (Production + Preview)
