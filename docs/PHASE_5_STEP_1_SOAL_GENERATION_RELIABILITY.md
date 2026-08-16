# PHASE 5 STEP 1 — Soal Generation Failure Audit & Reliability Hardening

> Status: **AUDIT + MINIMAL FIX SELESAI** — root cause terbukti dari kode +
> dokumentasi resmi provider; fix terkecil (provider call level) terpasang;
> observability 4E.2A sudah live. NO commit/push (GIT RULE).

---

## 1. Executive Summary

Dashboard: Agent Soal 15 request / 0 berhasil / 15 gagal / Latency "—" /
Tersimpan 0, sementara BC Assist 31/31 sukses. Audit membuktikan:
(1) semua stage sebelum provider lulus; (2) stage setelah provider mustahil
gagal 15/15 karena salvage menyerap output non-kosong; (3) **first failing
boundary = provider call untuk request JSON-mode berat (Soal)**; (4) dua
defect nyata pada lapisan provider yang membuat kegagalan konsisten mungkin:
**mode `response_format: json_object`** — yang menurut dokumentasi resmi
DeepSeek "may occasionally return empty content" (risiko tinggi pada
generasi 8000 token), dan tidak didukung dengan pasti oleh model fallback
Groq gpt-oss (docs Groq: json_object hanya "for all other models"; gpt-oss
memakai json_schema); serta (5) **stream kosong tidak memicu fallback**
(stream selesai dengan fullText "" → EMPTY_RESPONSE mati, tanpa pindah
provider). Fix minimal: hapus json_object dari DeepSeek/Groq (prompt sudah
JSON-strict — strategi yang sama dengan streamGroq & /api/guru/latihan yang
terbukti bekerja) + lempar ProviderEmptyError pada stream kosong agar chain
fallback benar-benar berfungsi. Telemetri failure (latencyMs + errorCode)
sudah diperbaiki di STEP 4E.2A.

## 2. Current Dashboard Symptom

| Agent | Request | Berhasil | Gagal | Latency | Tersimpan |
|-------|---------|----------|-------|---------|-----------|
| Soal | 15 | 0 | 15 | — | 0 |
| BC Assist | 31 | 31 | 0 | ~1739ms | 0 |

## 3. Existing Architecture

"Membuat Soal" = agent `soal` di `/guru/ai-tools`:
`SoalForm → handleRunAgent("soal", input) → POST /api/ai/agents/stream (SSE)
→ (fallback) POST /api/ai/agents/run → runAgent`.

- Agent: `src/ai/agents/soal-agent.ts` — defaultModel "deepseek-chat",
  maxTokens 8000, outputSchema 15 field, questionTypes 9 enum.
- Provider: `src/ai/core/provider.ts` — DeepSeek→Groq→Gemini (priority),
  streaming watchdog, salvage parse.
- Prompt: `src/ai/core/prompt-builder.ts` (JSON-strict).
- Parser: `cleanJSONOutput`/`tryFixJSON`/salvage → `outputSchema` (zod).
- Persistence: `AiSavedResult` (saveToHistory, POST-success only).
- Metrics: `AIUsage` (feature `agent:soal`) → `/api/admin/ai-analytics`.

## 4. End-to-End Request Flow

```
UI (SoalForm)
→ POST /api/ai/agents/stream        [app/api/ai/agents/stream/route.ts]
  → auth getUser → rate limit (5/mnt ×2 premium) → kuota (checkAndPrepareDeduction)
  → runAgentStream                    [src/ai/core/agent-stream-runner.ts]
    → buildPrompt                     [prompt-builder.ts]
    → streamProviderText              [provider.ts: deepseek→groq→gemini]
    → parse/salvage → logUsage
→ stream gagal sebelum teks → fallback POST /api/ai/agents/run [route.ts]
  → auth → role gate → rate limit → kuota → acquireAiSlot
  → runAgent                          [agent-runner.ts]
    → inputSchema.parse → guardrail → buildPrompt
    → callWithFallback                [provider.ts]
    → parse/retry/salvage → logUsage
→ AiSavedResult (jika saveToHistory)  [app/api/ai/agents/saved/route.ts]
→ dashboard                           [/api/admin/ai-analytics]
```

## 5. Actual Failure Point

**PROVIDER CALL** (DeepSeek→Groq→Gemini) — stage REQUEST/RESPONSE. Bukti:
- 15 baris AIUsage ber-status error HANYA bisa ditulis `runAgent` (stream
  runner pra-4E.2A tidak pernah log error) → semua gate sebelumnya lulus.
- Stage post-provider mustahil gagal 15/15: salvage mengubah output non-kosong
  apa pun menjadi sukses. Kegagalan = chain melempar atau semua provider
  mengembalikan konten kosong.
- BC Assist sehat di chain yang sama (mode teks, tanpa json_object) → bukan
  pemadaman global; divergensi = json mode + 8000 token.

## 6. Root Cause

Dua defect provider (terbukti dari kode + dokumentasi resmi):

1. **`response_format: json_object` pada DeepSeek (stream & non-stream) dan
   Groq non-stream (gpt-oss-120b).**
   - DeepSeek docs (guides/json_mode, Notice): *"When using the JSON Output
     feature, the API may occasionally return empty content."* — generasi
     panjang 8000 token adalah kasus berisiko tertinggi → DeepSeek bisa
     mengembalikan KOSONG (non-stream: ProviderEmptyError → lanjut chain;
     stream: fullText "" → EMPTY_RESPONSE tanpa fallback).
   - Groq docs (Structured Outputs): json_object ("JSON Object Mode") hanya
     untuk "all other models"; gpt-oss memakai `json_schema` — kiriman
     json_object ke gpt-oss berisiko HTTP 400 (repo sendiri sudah mendokumentasi
     penolakan json_object+stream di Groq).
   - Akibat: chain bisa kehabisan 3 provider → `ProviderChainFailedError` →
     runAgent → error row; atau stream mati di EMPTY_RESPONSE lalu fallback
     run ikut gagal → error row. Persis pola 15/15.
2. **Stream kosong tidak memicu fallback** — streamDeepSeek/streamGroq/
   streamGemini mengembalikan `{fullText: ""}` TANPA error → stream runner
   EMPTY_RESPONSE (mati), chain tidak berpindah provider.

## 7. Secondary Causes

- Telemetri buta (sudah diperbaiki 4E.2A): runAgent tanpa latencyMs → "—";
  stream provider error tidak tercatat sama sekali.
- Tidak ada observability stage (PROVIDER vs EMPTY vs VALIDATION) sebelum 4E.2A.
- `AI_PROVIDER_PRIORITY`/kunci Gemini produksi tidak dapat diverifikasi lokal
  (env [SENSITIVE]) — kandidat penyumbang bila Gemini tidak terjangkau.

## 8. Provider Audit

| Aspek | DeepSeek (primary) | Groq (fallback) | Gemini (3rd) |
|-------|--------------------|-----------------|--------------|
| Model | deepseek-chat | openai/gpt-oss-120b | gemini-2.5-flash |
| Endpoint | api.deepseek.com/v1/chat/completions | api.groq.com/openai/v1/chat/completions | generativelanguage...generateContent |
| Timeout | 120s request / watchdog 30s-connect+60s-idle | sama | sama |
| Format | OpenAI-compatible | OpenAI-compatible | contents/generationConfig |
| json_object | **DIHAPUS (fix)** — docs: bisa empty | **DIHAPUS (fix)** — gpt-oss pakai json_schema | tidak pernah dipakai |
| Fallback trigger | HTTP !ok / throw / empty (kini throw) | HTTP !ok / throw / empty (kini throw) | HTTP !ok / throw / empty (kini throw) |
| Sebelum fix | empty stream → EMPTY_RESPONSE tanpa fallback | — | — |

Chain: `loadPriority()` (default deepseek,groq,gemini; override
AI_PROVIDER_PRIORITY). `ProviderStreamInterruptedError` tetap diteruskan
(jangan ganti provider saat teks parsial — preservasi). Setelah fix, stream
kosong melempar `ProviderEmptyError` → chain pindah provider.

## 9. Prompt/Output Contract Audit

Prompt: JSON-strict ("Output JSON VALID SAJA. Tidak ada markdown fences.
Return valid JSON only. No explanations outside the JSON object.") + contoh
output schema. Kontrak output (soalOutputSchema): title/metadata/stimulus?/
questions[10 field]/answerKeyText/teacherNotes/editableText — SELARAS dengan
prompt (verified: fixture schema parse OK). Parser: cleanJSONOutput (fence
strip) + tryFixJSON (trailing comma etc.) + salvage — semua diuji hijau.
TIDAK ada mismatch yang bisa menyebabkan 15/15 (salvage menyerap).
Keputusan: prompt TIDAK diubah; json_object provider dihapus karena justru
merusak kontrak (mode yang terdokumentasi bisa menghasilkan kosong).

## 10. Validation Audit

inputSchema soal (10 field, default curriculum/bloomLevel/languageStyle) —
valid untuk payload form (probe). outputSchema ketat — TIDAK dilemahkan
(test: "schema menolak field wajib hilang" hijau). validateAgentOutput
warn-only (Phase 6A) — tidak memblokir.

## 11. QuestionMetadata Audit

Agent `soal` (ai-tools) TIDAK menulis QuestionMetadata/Soal — output tinggal
di klien + opsional AiSavedResult. Bank Soal Latihan Harian memakai
`/api/guru/latihan` (prompt JSON array, TANPA response_format — terbukti
bekerja). Jadi: tidak ada jalur metadata yang bisa gagal pada agent:soal;
metadata schema 0 diff.

## 12. Persistence Audit

- Agent:soal → `AiSavedResult` (POST-success hanya) — "Tersimpan 0" konsisten
  dengan 0 sukses. Bukan jalur kegagalan.
- "Berhasil" dihitung dari `runAgent.success` (logUsage `success: !finalError`)
  — tidak pernah menghitung save gagal sebagai sukses.

## 13. Metrics Audit

- Counter akurat secara struktur: total = count(feature), success =
  status="success", failed = status≠success, latency = AVG(latencyMs != null).
- Sebelum 4E.2A: runAgent tidak pernah mengisi latencyMs (sukses maupun gagal)
  → "—" untuk SEMUA agent non-stream; dan stream provider error tidak tercatat
  → dashboard me-review angka (15 = fallback run saja). Setelah 4E.2A: failure
  punya latencyMs + errorCode; stream failure tercatat. Metrik sekarang akurat
  secara instrumentasi; angka lama (15/15) adalah artefak pra-fix.

## 14. Reproduction Result

`scripts/test-soal-generation-reliability.ts` — **27/27** (fixture, tanpa
network/DB): valid generation ✓, truncated JSON → repair/salvage ✓, markdown
fences ✓, trailing comma ✓, ProviderChainFailed ✓, interrupted-stream
rethrow ✓, empty-stream-throws (baru) ✓, json_object removed (baru) ✓,
schema rejection (tidak dilemahkan) ✓, metadata agent:soal absent ✓,
latihan route proof ✓, metrik sukses+gagal=total ✓, latencyMs+errorCode ✓,
secret sanitized ✓, protected zones 0 diff ✓, chain 3 provider utuh ✓.

## 15. Fix Implemented

`src/ai/core/provider.ts` (satu file, provider-call level, ~20 baris):
1. Hapus `response_format: {type:"json_object"}` dari `callDeepSeek`,
   `callGroq` (gpt-oss), `streamDeepSeek` — prompt JSON-strict + parser
   menangani format (strategi terbukti: streamGroq & /api/guru/latihan).
2. `streamDeepSeek`/`streamGroq`/`streamGemini`: stream selesai tapi kosong →
   `throw new ProviderEmptyError(...)` agar chain benar-benar fallback ke
   provider berikutnya (sebelumnya mati di EMPTY_RESPONSE tanpa fallback).

TIDAK diubah: schema, validation, parser, salvage, prompt, route, quota,
rate limit, klien, metrik, DB. No fake success, no silent accept (salvage
tetap memberi teks + warning; empty tetap failure jujur).

## 16. Tests

- `test:soal-generation-reliability` (BARU) — 27/27.
- `test:soal-agent-health` (4E.2A) — 27/27 (tetap hijau).
- `test:question-metadata` 24/24 · `test:premium-economy` ✅ · `test:guru-phase` ✅ ·
  `test:ai-bc-architecture` ✅.
- `npx tsc --noEmit` 0 · `npm run lint` 0 · `npm run build` exit 0 ·
  `git diff --check` bersih.
- `test-ai-agents` 32/43 (11 live-call gagal TANPA key lokal — pre-existing,
  bukan regresi; sama di HEAD bersih).

## 17. Regression

Lihat §16 — semua suite terkait hijau; tidak ada test yang dilemahkan.

## 18. Security

- Tidak ada secret dicetak/di-log; error ke klien disanitasi (run route
  PROVIDER_BUSY tanpa raw body; ProviderHttpError internal-only).
- Test 11 memverifikasi tidak ada header auth di payload error.
- Tidak ada bypass auth/rate limit/quota.

## 19. Protected Zones

`git diff --name-only` — perubahan HANYA: `src/ai/core/provider.ts`,
`package.json`, `scripts/test-soal-generation-reliability.ts`,
`docs/PHASE_5_STEP_1_SOAL_GENERATION_RELIABILITY.md`.
0 diff: prisma/, LearningEvidence, QuestionMetadata schema, LearnerState,
AdaptivePracticeSession, adaptive selector/reward, gamification, learning-loop,
UKBI, TKA, Jalur Cerdas, Arena core, leaderboard, coins, premium economy,
diagnostic, app/api/player.

## 20. DB Write Status

READ ONLY — 0 migration, 0 seed, 0 production write. (AIUsage tetap ditulis
oleh alur runtime normal; bukan oleh fase ini.)

## 21. Known Limitations

1. Verifikasi LIVE tidak mungkin lokal (env [SENSITIVE]) — perilaku nyata
   provider pasca-fix harus dikonfirmasi dari AIUsage produksi pada 1 request
   baru (errorCode + provider + latencyMs kini tercatat).
2. Bila Gemini tetap tidak terjangkau di produksi (key/quota/priority), chain
   tetap bergantung pada DeepSeek+Groq — fix ini meniadakan dua mode kegagalan
   terdokumentasi di keduanya; observasi pasca-deploy akan memastikan.
3. `AI_PROVIDER_PRIORITY` produksi tidak dapat dibaca nilainya (Encrypted) —
   hanya "configured".
4. Jumlah "15" adalah artefak telemetri lama (stream error tidak tercatat);
   pasca-fix angka request bisa berbeda (lebih akurat).

## 22. Final Verdict

**YELLOW → GREEN-menuju**: root cause TERBUKTI (kode + dokumentasi resmi
DeepSeek/Groq), fix minimal terpasang dan diverifikasi 27/27 + build hijau,
telemetri kini sanggup menjelaskan setiap kegagalan. Verifikasi LIVE penuh
masih menunggu deploy + 1 observasi produksi (external dependency: env
provider tidak dapat dieksekusi lokal) — sesuai definisi YELLOW; setelah
observasi produksi hijau, verdict naik ke GREEN.

---

### Git status (akhir fase — NO COMMIT, NO PUSH)

```
M src/ai/core/provider.ts
M package.json
?? scripts/test-soal-generation-reliability.ts
?? docs/PHASE_5_STEP_1_SOAL_GENERATION_RELIABILITY.md
```
