# AI Tools Simplification — Phase 1 Forensic Audit

> Date: 2026-08-22 · Author: opencode · Status: AUDIT COMPLETE
>
> Goal: Simplify AI Tools by removing PPT Generator and making Question
> Generation (Soal) the reliable core AI workflow for teachers. Audit-first
> approach — no code changes until founder approves report.

---

## 1. Current Architecture

### 1.1 File Map (22 files in ai-tools scope)

```
app/(dashboard)/guru/ai-tools/
├── page.tsx                          # Server component entry (auth + redirect)
├── _components/
│   ├── alat-ai-client.tsx            # Main orchestrator (770 lines, 9 agents)
│   ├── agent-card.tsx                # Sidebar agent card (43 lines)
│   ├── agent-result-panel.tsx        # Result display (989 lines)
│   ├── history-panel.tsx             # Saved results list
│   └── forms/
│       ├── rpp-form.tsx              # RPP generator form
│       ├── soal-form.tsx             # Question generator form (146 lines)
│       ├── ppt-form.tsx              # PPT generator form (120 lines) ← TO REMOVE
│       ├── review-form.tsx           # Review materi form
│       ├── bc-assistant-form.tsx     # BC Assistant chat
│       ├── eyd-form.tsx              # EYD correction
│       ├── feedback-form.tsx         # Student feedback
│       ├── grading-form.tsx          # Auto-grading
│       └── text-analysis-form.tsx    # Text analysis
├── lib/
│   ├── agent-api.ts                  # Central API client (315 lines)
│   ├── export-api.ts                 # DOCX/PPTX/PDF export (70 lines)
│   └── saved-results-api.ts          # Saved results CRUD (112 lines)

src/ai/
├── agents/
│   ├── soal-agent.ts                 # Soal agent definition (327 lines)
│   ├── ppt-agent.ts                  # PPT agent definition (312 lines) ← TO REMOVE
│   └── ... (7 other agents)
├── core/
│   ├── agent-runner.ts               # Non-streaming execution (475 lines)
│   ├── agent-stream-runner.ts        # Streaming SSE execution (455 lines)
│   ├── output-validator.ts           # JSON cleaning + validation (235 lines)
│   ├── provider.ts                   # Gemini→Grok→DeepSeek chain
│   ├── prompt-builder.ts             # Prompt construction
│   ├── agent-types.ts                # Type definitions (164 lines)
│   ├── agent-registry.ts             # Agent registry (69 lines)
│   └── rate-limit.ts                 # Sliding window rate limiter (59 lines)
├── schemas/
│   └── soal.schema.ts                # Duplicate soal schema (73 lines)
└── evaluators/
    └── education-quality-checker.ts   # Quality checker
```

### 1.2 Agent Pipeline (non-streaming path)

```
SoalForm → handleRunAgent("soal", input)
  → alat-ai-client.tsx → runAgentStream(agent-api.ts)
    → POST /api/ai/agents/stream (SSE)
      → agent-stream-runner.ts:
        1. auth → role gate (GURU/ADMIN/FOUNDER)
        2. rate limit (10 req/min/agent, ×2 premium)
        3. kuota check (3 credits per soal run)
        4. inputSchema.parse(input)
        5. checkInput (guardrails — warn only)
        6. buildPrompt (system + user messages)
        7. streamProviderText (Gemini→Grok→DeepSeek, 120s timeout)
        8. cleanJSONOutput → JSON.parse → outputSchema.parse
        9. validateAgentOutput (warnings only — never rejects)
        10. retry 1× with correction prompt on parse/validation fail
        11. salvage {text: rawContent} on second failure
        12. checkEducationQuality (fire-and-forget)
        13. logUsage (fire-and-forget)
        14. SSE events: token/done/error
  → if stream fails to start → fallback to runAgent (non-streaming)
```

### 1.3 Provider Chain

| Priority | Provider | Model | JSON Mode | Notes |
|----------|----------|-------|-----------|-------|
| 1 | DeepSeek | deepseek-chat | response_format: json | Primary, 8000 maxTokens |
| 2 | Groq | gpt-oss-120b | Yes | Fallback, 65K max output |
| 3 | Gemini | gemini-2.5-flash | Yes | Last resort |

Rate limit detection: HTTP 429/503 + message substring matching.

### 1.4 Credit System

| Agent | Credits/run | Quota Source |
|-------|-------------|--------------|
| rpp | 5 | lib/ai-gateway/agent-cost-policy.ts |
| soal | 3 | lib/ai-gateway/agent-cost-policy.ts |
| ppt | 3 | lib/ai-gateway/agent-cost-policy.ts |
| review | 2 | lib/ai-gateway/agent-cost-policy.ts |
| feedback | 2 | lib/ai-gateway/agent-cost-policy.ts |
| grading | 2 | lib/ai-gateway/agent-cost-policy.ts |
| text-analysis | 2 | lib/ai-gateway/agent-cost-policy.ts |
| eyd | 2 | lib/ai-gateway/agent-cost-policy.ts |
| bc-assistant | 0 | Free |

Deduction: atomic via `checkAndDeductCredits` (raw SQL `$1 < currentBalance`).

---

## 2. Failure Findings

### CRITICAL — Must fix before production use

| # | Finding | File | Impact |
|---|---------|------|--------|
| C1 | **Output validation is warnings-only** | output-validator.ts:88-101 | `validateAgentOutput` returns a warning string but NEVER blocks output. Invalid questions (missing answer, duplicate text, wrong type) reach the teacher's screen. The caller in agent-runner.ts line ~200+ only pushes to `warnings[]`, never returns early. |
| C2 | **Duplicate soal schemas cause drift** | soal-agent.ts vs schemas/soal.schema.ts | Two independent Zod schemas for soal input/output exist. `soal-agent.ts` has its own inline `soalInputSchema` + `soalOutputSchema`. `schemas/soal.schema.ts` has a separate copy. Neither imports the other. If one is updated, the other silently drifts — validation differences won't be caught. |
| C3 | **No per-question item-level validation** | agent-runner.ts, agent-stream-runner.ts | After `outputSchema.parse`, there is NO check that each question's `answer` matches the correct type (e.g., pilihan_ganda answer must be one of the options). The schema only checks top-level shape, not semantic correctness of each item. |

### HIGH — Significantly impacts reliability

| # | Finding | File | Impact |
|---|---------|------|--------|
| H1 | **PPT form is a dead-end thin shell** | ppt-form.tsx (120 lines) | No streaming support, no saved results panel, no result panel integration beyond basic text display. Uses `runAgent()` (non-streaming) only. If teacher generates PPT, they get raw text — no export to actual PPTX. `export-api.ts` has `downloadPptxExport()` but it calls `/api/ai/export/pptx` which does NOT exist. |
| H2 | **No abort/cancel support** | agent-api.ts | `runAgentStream` has no AbortController. Teacher cannot cancel in-progress generation. If DeepSeek is slow (120s timeout), teacher is stuck watching a spinner with no way out. |
| H3 | **Single retry with no escalation** | agent-runner.ts:~200 | On output validation failure, exactly ONE retry with "repair JSON" prompt. If the model consistently returns malformed output for a given input, the teacher gets a raw text salvage with no actionable guidance. |
| H4 | **Soal form has no streaming support** | soal-form.tsx | Despite `runAgentStream` existing, the Soal form's `onSubmit` callback goes through `alat-ai-client.tsx` which calls `runAgentStream` — but the form itself has no progress indicator, no token streaming display, no intermediate feedback. Teacher sees only a spinner. |

### MEDIUM — Affects user experience

| # | Finding | File | Impact |
|---|---------|------|--------|
| M1 | **No steps/wizard in soal form** | soal-form.tsx | All 8 fields visible at once. Teacher must fill subject, grade, topic, count, types (multi-select chips), difficulty, answer key, explanation in one screen. No guided flow. |
| M2 | **Error messages are technical** | agent-runner.ts, agent-stream-runner.ts | Provider errors surface as raw strings like "Layanan AI sedang sibuk" or JSON parse errors. No user-friendly Bahasa Indonesia messages with suggested actions. |
| M3 | **Quality checker is fire-and-forget** | agent-runner.ts | `checkEducationQuality` runs after response is sent. Teacher never sees quality warnings (distractor quality, difficulty alignment, Bloom mismatch). |
| M4 | **No question count validation** | output-validator.ts:168-183 | `validateSoalOutput` only checks that `questions` is an array and `editableText` exists. Does NOT verify `questions.length === questionCount` from input. |
| M5 | **Export API incomplete** | export-api.ts | `downloadPptxExport` calls `/api/ai/export/pptx` which may not exist. `downloadPdfExport` calls `/api/ai/export/pdf` which may not exist. Only `downloadDocxExport` is confirmed working. |

### LOW — Minor issues

| # | Finding | File | Impact |
|---|---------|------|--------|
| L1 | **AgentCard has no disable/remove logic** | agent-card.tsx | All 9 agents always visible. No way to hide PPT agent without removing it from registry. |
| L2 | **PPT agent validation is shallow** | output-validator.ts:186-214 | `validatePPTOutput` only checks first slide with issues (breaks on first error). Doesn't check all slides. |
| L3 | **No progress steps in alat-ai-client** | alat-ai-client.tsx | 770-line component with no step indicator. Agent selection → form → spinner → result. No "Step 1: Analyzing...", "Step 2: Generating...". |

---

## 3. Failure Taxonomy

### 3.1 By Root Cause

| Root Cause | Findings | Fix Approach |
|------------|----------|-------------|
| **Validation too permissive** | C1, C4 | Make `validateSoalOutput` reject (not warn) on critical issues; add per-item checks |
| **Schema duplication** | C2 | Delete `schemas/soal.schema.ts`, use only `soal-agent.ts` inline schemas |
| **Missing item-level validation** | C3, C4 | Add post-parse loop: check answer ∈ options, answer type matches question type, count matches |
| **Dead PPT codepath** | H1, L2, M5 | Remove ppt-form.tsx, ppt-agent.ts, PPT from agent registry, PPT from alat-ai-client |
| **No streaming UX** | H2, H4 | Add AbortController to runAgentStream; add progress indicator to soal-form |
| **No user-facing quality** | M3 | Surface quality check results in AgentResultPanel |
| **UX complexity** | M1, L3 | Wizard steps for soal form (Tujuan → Materi → Format → Generate → Review) |

### 3.2 By Severity × Effort

| | Low Effort (< 1hr) | Medium Effort (1-4hr) | High Effort (> 4hr) |
|---|---|---|---|
| **Critical** | C2 (delete duplicate schema) | C1 (harden validator) | C3 (per-item validation) |
| **High** | M4 (add count check) | H1 (remove PPT) | H2 (abort support) |
| **Medium** | L2 (PPT validator — will be removed) | M1 (soal wizard) | M3 (quality surfacing) |
| **Low** | L1 (agent card disable) | L3 (progress steps) | — |

---

## 4. Recommended Action Plan

### Phase 2: Remove PPT Generator (est. 2 hours)

1. Delete `ppt-form.tsx` import from `alat-ai-client.tsx`
2. Remove PPT from `AGENTS` array in `alat-ai-client.tsx`
3. Remove `ppt` from `AGENT_IDS` in agent registry
4. Delete `ppt-agent.ts` from `src/ai/agents/`
5. Remove PPT validation from `output-validator.ts`
6. Remove PPT correction message from `output-validator.ts`
7. Remove `downloadPptxExport` from `export-api.ts` (dead code)
8. Remove PPT case from `generateTitle` in `alat-ai-client.tsx`
9. Run `test:soal-agent-health` + `test:ai-tools-audit` + build

### Phase 3: Harden Soal Generation (est. 4 hours)

1. Delete `schemas/soal.schema.ts` (use only soal-agent.ts inline schemas)
2. Add per-item validation in `validateSoalOutput`:
   - `answer` must be in `options` for pilihan_ganda
   - `answer` type must match question type
   - `questions.length` must match input `questionCount`
   - No duplicate `question` texts
   - `explanation` present when `includeExplanation=true`
3. Change `validateAgentOutput` soal branch from warn-only to REJECT on critical failures (missing questions, wrong count, duplicate text)
4. Add `questions.length === questionCount` check in post-parse

### Phase 5-6: Improve Soal Form UX (est. 6 hours)

1. Wizard steps: Tujuan (subject/grade/topic) → Materi (stimulus, optional) → Format (types/difficulty/count) → Generate → Review
2. Progress indicator during generation ("Menganalisis...", "Menyusun soal...", "Memvalidasi...")
3. Error messages in Bahasa Indonesia with suggested actions
4. Show quality warnings inline (distractor quality, difficulty alignment)

---

## 5. What Stays

| Component | Reason |
|-----------|--------|
| Soal agent + form | Core workflow — harden, don't remove |
| RPP agent + form | Established, working, separate concern |
| Review/Feedback/Grading/TextAnalysis/EYD | Evaluation tools — independent of simplification |
| BC Assistant | Free chatbot — no credits, no complexity |
| Agent registry + runner + stream runner | Infrastructure — used by all agents |
| output-validator | Infrastructure — harden for soal, leave rest |
| provider chain | Infrastructure — works, tested |
| rate-limit | Infrastructure — works, tested |
| quota-checker | Infrastructure — works, tested |

---

## 6. What Gets Removed

| Component | Reason |
|-----------|--------|
| ppt-form.tsx | Thin shell, no streaming, no export, dead end |
| ppt-agent.ts | Agent definition for removed feature |
| PPT validation in output-validator | Dead code after agent removal |
| downloadPptxExport in export-api | Dead code, calls non-existent endpoint |
| schemas/soal.schema.ts | Duplicate of soal-agent.ts inline schemas |

---

## 7. Verification Checklist (post-changes)

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run lint` — 0 violations
- [ ] `npm run build` (dummy env) — exit 0
- [ ] `npm run test:soal-agent-health` — 27/27
- [ ] `npm run test:ai-tools-audit` — all pass
- [ ] PPT agent NOT in agent registry
- [ ] PPT form NOT importable
- [ ] Soal form still works end-to-end
- [ ] Soal validation rejects invalid output (not just warns)
- [ ] Per-item answer validation working
- [ ] No duplicate schemas
- [ ] Protected zones 0 diff (prisma/, gamification/, learning-loop/)
- [ ] `git diff --check` clean

---

*This report is READ-ONLY. No code changes until founder approves.*
