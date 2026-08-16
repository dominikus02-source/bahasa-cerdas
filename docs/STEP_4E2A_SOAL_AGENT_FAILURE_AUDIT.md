# STEP 4E.2A — Soal Agent Failure Audit & Recovery

> Status: **AUDIT SELESAI + SAFE FIX (telemetri)** — root cause boundary terbukti,
> detail error provider butuh log produksi (lihat §19). Tidak ada production write.

---

## 1. Dashboard Symptom

| Agent | Request | Berhasil | Gagal | Latency | Tersimpan |
|-------|---------|----------|-------|---------|-----------|
| Soal | 15 | 0 | 15 | — | 0 |
| BC Assist | 31 | 31 | 0 | ~1739ms | 0 |

Gagal 15/15 + 0 sukses pada Soal, sementara BC Assist sehat — kegagalan
bersifat SPESIFIK ke alur Soal, bukan pemadaman provider global.

## 2. Soal Architecture (call chain lengkap)

```
SoalForm (forms/soal-form.tsx)
 → handleRunAgent("soal", input)  [alat-ai-client.tsx]
 → runAgentStream (agent-api.ts): POST /api/ai/agents/stream (SSE)
     → route stream: auth → rate limit (5/menit, ×2 premium) → kuota → runAgentStream
       → buildPrompt → streamProviderText (DeepSeek→Groq→Gemini) → parse → salvage
       → logUsage (HANYA jalur sukses/akhir)
     → gagal mulai/tengah → client fallback:
 → runAgent (agent-api.ts): POST /api/ai/agents/run
     → route run: auth → role GURU/ADMIN/FOUNDER → rate limit → kuota → slot → runAgent
       → inputSchema.parse → checkInput → buildPrompt → callWithFallback
       → cleanJSONOutput → JSON.parse → outputSchema.parse → validateAgentOutput
       → retry 1× (correction prompt) → salvage {text} → checkEducationQuality
       → logUsage (success/failure — SATU-SATUNYA penulis baris error `agent:soal`)
```

Agent: `src/ai/agents/soal-agent.ts` (id "soal", defaultModel "deepseek-chat",
maxTokens 8000, outputSchema 15 field, questionTypes 9 enum).
Provider: `src/ai/core/provider.ts`. Prompt: `src/ai/core/prompt-builder.ts`.
Schema: `src/ai/schemas/soal.schema.ts` (legacy; agent memakai outputSchema inline).
Persistence: `AiSavedResult` (saveToHistory — "Tersimpan 0" konsisten karena 0 sukses).
Telemetri: `src/ai/core/usage-logger.ts` → tabel `AIUsage` (feature `agent:soal`).

## 3. BC Assist Comparison (per-tingkat)

| Aspek | Soal | BC Assist |
|-------|------|-----------|
| Route | agents/stream + agents/run | api/ai/bc/chat (SSE) |
| A. Auth | getUser + role gate | getUser |
| B. Authz | GURU/ADMIN/FOUNDER | role-safe persona |
| C. Rate limit | 5/menit (×2 premium) | 30/menit (×2 premium) |
| D. Parsing body | agentId+input | messages |
| E. Validasi input | zod inputSchema (10 field) | TANPA schema (bebas) |
| F. Provider | streamProviderText / callWithFallback | streamProviderText |
| G. Model | deepseek-chat (default) | AI_DEFAULT_MODEL || deepseek-chat |
| H. API key | DeepSeek/Groq/Gemini env (semua terkonfigurasi di Vercel) | sama |
| I. System prompt | agent.systemPrompt + identity | persona |
| J. User prompt | buildPrompt (JSON strict) | pesan user |
| K. JSON format | responseFormat "json" + json_object | teks |
| L. Structured output | outputSchema zod 15 field | tanpa |
| M. Timeout | 120s (stream) | watchdog idle |
| N. Retry | 1× correction | — |
| O. Error handling | salvage text | error ramah |
| P. Telemetri | logUsage (sebelum fix: tanpa latency/errorCode pada error) | logUsage ai-bc-chat + latency |
| Q. Persistence | AiSavedResult | tanpa |
| R. Serialisasi | AgentRunResult | SSE done |

**Divergensi pertama yang bermakna: K–L (json mode + schema ketat + 8000
token)**. Setelah provider, Soal punya lapisan parse/validasi yang tidak
dimiliki BC Assist — tetapi lapisan itu punya salvage sehingga tidak bisa
menyebabkannya 15/15 gagal.

## 4. Failure Chain (per stage)

| Stage | Status | Bukti |
|-------|--------|-------|
| REQUEST → AUTH → ROLE → RATE LIMIT → QUOTA | PASS | 15 baris AIUsage TERTULIS → melewati semua gate ini |
| AGENT DISPATCH | PASS | feature `agent:soal` terisi → getAgent("soal") ok (probe lokal) |
| INPUT VALIDATION | PASS | soalInputSchema.parse input form valid (probe lokal) |
| PROMPT BUILD | PASS | buildPrompt 2 messages ~9.6KB (probe lokal) |
| PROVIDER RESOLUTION | PASS | MODEL_MAP deepseek-chat→deepseek; chain 3 provider |
| **AI REQUEST/RESPONSE** | **FAIL — satu-satunya stage tersisa** | lihat §5 |
| JSON PARSE / SCHEMA / SALVAGE | PASS (salvage menyerap semua output non-kosong) | code review |
| DB SAVE | PASS (tidak pernah tercapai karena gagal) | — |
| TELEMETRI | **BUG ditemukan** (lihat §6) | code review |
| RESPONSE | error ke klien | — |

## 5. First Failing Boundary

**PROVIDER CALL** (`src/ai/core/provider.ts` → callWithFallback / streamProviderText).

Bukti (inklusif, dari kode):
1. Semua stage sebelum provider TERBUKTI lulus (probe lokal + keberadaan baris AIUsage).
2. Stage setelah provider TIDAK MUNGKIN gagal 15/15: `attemptProviderCall`/stream runner
   menyelamatkan output apa pun yang non-kosong (`output = { text: cleaned }`) → sukses.
   Jadi kegagalan hanya bila: (a) chain provider melempar, atau (b) semua provider
   mengembalikan konten KOSONG.
3. BC Assist sehat di chain yang SAMA → bukan pemadaman global; yang membedakan hanya
   mode JSON + 8000 token + prompt besar (divergensi K/L).
4. Detail error provider spesifik (HTTP status, model yang menolak) TIDAK DAPAT
   dibuktikan lokal: env berisi `[SENSITIVE]` (tanpa key asli), DB produksi tidak
   bisa dibaca, dan telemetri LAMA tidak menyimpan errorCode/latency → bukti
   error nyata butuh 1 request baru setelah fix telemetri (lihat §19).

## 6. Why Latency Is "—" (TERBUKTI dari kode)

- Dashboard `ai-analytics` menghitung rata-rata latency HANYA dari baris
  `latencyMs: { not: null }`.
- `runAgent` (jalur run) memanggil `logUsage` TANPA field `latencyMs` — baik
  sukses MAUPUN gagal (hanya `durationMs`). Baris gagal Soal → `latencyMs: null`
  → rata-rata dilewati → dashboard menampilkan "—".
- Bandingkan BC Assist (`ai-bc-chat`): route-nya merekam `latencyMs` → 1739ms tampil.
- **Bukan** "latency hanya dicatat setelah sukses" secara umum — itu BUG telemetri
  spesifik di `agent-runner.ts`: error path juga punya durationMs, hanya tidak
  dikirim sebagai latencyMs.

## 7. Exact Root Cause (dua lapis)

1. **Fungsi**: kegagalan konsisten 15/15 pada stage PROVIDER CALL untuk
   request JSON-mode berat (Soal) — detail error provider belum terbaca
   karena telemetri buta (lapis 2). FIX telemetri TIDAK mengubah perilaku
   provider; produksi tetap harus menjalankan 1 request baru untuk membaca
   errorCode PRODUCTION_ERROR / EMPTY / VALIDATION yang kini tercatat.
2. **Telemetri (dibuktikan)**: `agent-runner.ts` tidak pernah mengisi
   `latencyMs` (→ "—") dan tidak mengisi `errorCode` pada jalur gagal;
   `agent-stream-runner.ts` TIDAK mencatat kegagalan provider sama sekali
   (baris error di dashboard HANYA bisa berasal dari fallback runAgent —
   inilah mengapa "stream gagal" tampak sebagai "15 request").

## 8. Evidence

- Probe lokal: agent terdaftar ✓, inputSchema ✓, buildPrompt ✓, outputSchema ✓.
- Code: salvage selalu menyerap output non-kosong → satu-satunya stage gagal = provider.
- Code: runAgent logUsage tanpa latencyMs/errorCode (sebelum fix).
- Code: stream runner tanpa logging pada error provider (sebelum fix).
- Env Vercel: DEEPSEEK_API_KEY/GROQ_API_KEY/GEMINI_API_KEY/AI_PROVIDER_PRIORITY = **configured**.
- `test-ai-agents.ts` 11 gagal = pre-existing (live call tanpa key lokal — bukan regresi; juga gagal di HEAD bersih).

## 9. Provider Status

Semua env prod terkonfigurasi ("configured"). Model: deepseek-chat (DeepSeek),
gpt-oss-120b (Groq), gemini-2.5-flash (Gemini). Status nyata per request = UNKNOWN
(tunggu 1 request baru pasca-fix untuk membaca errorCode di AIUsage).

## 10. Parser Status

OK — cleanJSONOutput + tryFixJSON + salvage menyerap output apa pun; schema
soalOutputSchema cocok dengan prompt (probe). Bukan penyebab.

## 11. Validation Status

OK — inputSchema cocok dengan payload form; output validation warn-only.
Bukan penyebab.

## 12. Persistence Status

OK — AiSavedResult hanya ditulis pada sukses; "Tersimpan 0" konsisten.
Bukan penyebab.

## 13. Telemetry Status

**BUG — DIPERBAIKI (safe fix, logging layer only):**
- `agent-runner.ts`: seluruh logUsage kini mengisi `latencyMs` (latency provider
  bila ada, fallback durationMs) + `errorCode` stage (PROVIDER_ERROR /
  PROVIDER_EMPTY_RESPONSE / OUTPUT_VALIDATION_FAILED / INVALID_INPUT / UNKNOWN).
- `agent-stream-runner.ts`: kegagalan provider & response kosong kini DICATAT
  (errorCode PROVIDER_ERROR / EMPTY_RESPONSE + latencyMs) — sebelumnya tidak
  tercatat sama sekali (dashboard buta).
- Tanpa perubahan tabel/query analytics; tanpa menyembunyikan apa pun
  (status error tetap error; justru kini punya latency + stage).

## 14. Fix Applied

Kecil & terisolasi (hanya lapisan logging — diizinkan Part 12/13 "fix telemetry only"):
| File | Perubahan |
|------|-----------|
| `src/ai/core/agent-runner.ts` | +`errorCodeFor()`; logUsage (3 titik) + `latencyMs` + `errorCode` |
| `src/ai/core/agent-stream-runner.ts` | +logUsage pada PROVIDER_ERROR & EMPTY_RESPONSE (sebelumnya diam) |

TIDAK ada perubahan: provider selection, model, prompt, schema, parser, salvage,
route, quota, rate limit, klien, DB.

## 15. Tests

- `scripts/test-soal-agent-health.ts` (BARU) — **27/27**: registry, route,
  validasi input, prompt, provider resolution, parse, schema, tipe, jawaban,
  error surfacing, telemetri (latency+errorCode), akar "—", divergensi Soal vs
  BC Assist, client fallback, protected zones.
- `test:ai-tools-jenjang` 1 GAGAL = PRE-EXISTING (juga gagal di HEAD bersih;
  ekspektasi "12 kelas I-XII" vs GRADE_OPTIONS yang sudah ditambah SD — di luar scope).
- `test-ai-agents.ts` 32/43 — 11 gagal live-call TANPA key lokal (pre-existing;
  juga gagal di HEAD bersih).
- `npx tsc --noEmit` ✅ · `npm run lint` ✅ · `npm run build` ✅ (dummy env) · `git diff --check` ✅.
- Regresi lain: premium-economy ✅, guru-phase ✅, ai-bc-architecture/personas/context/navigation/arena-ux ✅ (5 suite), soal-agent-health ✅.

## 16. Build

tsc 0 error · lint 0 violation · build exit 0 · diff-check bersih.

## 17. Protected Zones

`git diff --name-only` — perubahan HANYA: `src/ai/core/agent-runner.ts`,
`src/ai/core/agent-stream-runner.ts`, `package.json`, `scripts/test-soal-agent-health.ts`,
`docs/STEP_4E2A_SOAL_AGENT_FAILURE_AUDIT.md` (+ file STEP 4E.2 yang belum di-commit).
0 diff: prisma/, UKBI, TKA, Jalur Cerdas, Diagnostic 4E/4E.1, Adaptive Practice,
LearningEvidence, LearnerState, Arena core, XP, Coin, Leaderboard, premium economy.

## 18. DB Status

READ ONLY — 0 migration, 0 seed, 0 write (fix murni kode logging; AIUsage ditulis
runtime oleh alur normal, bukan oleh fase ini).

## 19. Known Limitations

1. **Detail error provider (HTTP/model) belum terbaca** — butuh 1 request Soal baru
   pasca-deploy untuk melihat `errorCode` + `provider` di AIUsage. Bila muncul
   PROVIDER_ERROR dengan provider "none" → semua chain gagal; bila EMPTY_RESPONSE →
   model memotong output; bila OUTPUT_VALIDATION_FAILED (tidak mungkin dgn salvage)
   → parser. Verdict saat ini YELLOW karena layer penyebab (provider) teridentifikasi
   tapi pesan error persisnya menunggu observasi produksi.
2. Stream error path yang baru dicatat akan MENAMBAH baris kegagalan di dashboard
   (sebelumnya tidak terlihat) — ini perbaikan visibilitas, bukan regresi.
3. `test-ai-agents.ts` & `test:ai-tools-jenjang` punya kegagalan pre-existing
   (key lokal kosong / ekspektasi grade outdated) — di luar changeset.
4. DeepSeek stream + response_format json_object + 8000 maxTokens adalah
   kombinasi paling mencurigakan (divergensi vs BC chat); perlu verifikasi
   langsung dari AIUsage pasca-fix.

## 20. Final Verdict

**YELLOW** — root cause boundary TERBUKTI (stage PROVIDER CALL; semua stage lain
dibuktikan lulus, telemetri-butik dibuktikan & diperbaiki), fix telemetri aman
terpasang, test 27/27 + build hijau, protected zones 0 diff, DB read-only.
Namun detail error provider persis belum terbaca (butuh observasi produksi 1
request pasca-deploy) — belum layak GREEN, bukan RED (tidak ada perubahan
arsitektur yang diperlukan; tidak ada dugaan tanpa bukti).

**Langkah setelah deploy**: jalankan 1 generasi Soal → cek baris `agent:soal`
terbaru di AIUsage (errorCode + provider + latencyMs) → konfirmasi penyebab
persis (DeepSeek/Groq/Gemini) → fix provider-specific kecil bila perlu.

---

### Git status (akhir fase — NO COMMIT, NO PUSH)
```
M src/ai/core/agent-runner.ts
M src/ai/core/agent-stream-runner.ts
M package.json
?? scripts/test-soal-agent-health.ts
?? docs/STEP_4E2A_SOAL_AGENT_FAILURE_AUDIT.md
(+ file STEP 4E.2 yang belum di-commit: lib/diagnostic/*, app/api/player/*, components/student-home/*, AGENTS.md, dll.)
```
