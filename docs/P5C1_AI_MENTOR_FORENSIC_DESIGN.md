# P5C-1 — AI Mentor Forensic & Technical Design

**Date:** 2026-08-25  
**Status:** READ-ONLY — Design Document  
**Scope:** AI Mentor for MURID_PREMIUM using existing BahasaCerdas infrastructure  
**Infrastructure Audited:** AI Gateway, Provider System, LearnerState, Learning Loop

---

## 1. Product Definition

### What the AI Mentor IS

A **contextual learning mentor** that answers:
- "Kenapa saya sering salah di bagian ini?"
- "Apa yang harus saya perbaiki?"
- "Kenapa jawaban saya kurang tepat?"
- "Latihan apa yang paling cocok untuk saya sekarang?"

### What the AI Mentor is NOT

- ❌ General-purpose chatbot
- ❌ Substitute for a human teacher
- ❌ Diagnostic tool (LearnerState handles this)
- ❌ Score generator (existing engines handle this)

### Core Principle

The AI Mentor adds value through **understanding and interpretation**, not simply through access to a generic chatbot.

---

## 2. Forensic Audit

### 2.1 AI Gateway Infrastructure

| Component | Location | Purpose | Production Ready |
|-----------|----------|---------|------------------|
| Plan Resolver | `lib/ai-gateway/plan-resolver.ts` | Resolve user plan (FOUNDER/MURID_FREE/GURU_PRO/etc.) | ✅ Yes |
| Quota Checker | `lib/ai-gateway/quota-checker.ts` | Check and deduct credits atomically | ✅ Yes |
| Agent Cost Policy | `lib/ai-gateway/agent-cost-policy.ts` | Calculate credit cost per agent | ✅ Yes |
| Provider Guard | `lib/ai-gateway/provider-guard.ts` | Circuit breaker for providers | ✅ Yes |
| Circuit Breaker | `lib/ai-gateway/circuit-breaker.ts` | Provider health tracking | ✅ Yes |
| Gateway Config | `lib/ai-gateway/gateway-config.ts` | Hard/soft mode flag | ✅ Yes |

**Key Finding:** AI Gateway is designed for **Guru-only credit billing**. Murid (all roles) get `MURID_FREE` plan with unlimited credits. Premium Economy handles Murid feature-tiered caps separately.

### 2.2 Provider System

| Provider | Model | Status | Cost |
|----------|-------|--------|------|
| Groq | `openai/gpt-oss-120b` | ✅ Primary | $0.0003/1K tokens |
| Groq | `openai/gpt-oss-20b` | ✅ Fallback | $0.0003/1K tokens |
| DeepSeek | `deepseek-chat` | ⚠️ Dormant | $0.0005/1K tokens |
| Gemini | `gemini-2.5-flash` | ⚠️ Dormant | $0.00015/1K tokens |

**Key Finding:** Only Groq is active. Provider fallback chain exists but currently single-provider.

### 2.3 Agent System

| Component | Location | Purpose |
|-----------|----------|---------|
| Agent Registry | `src/ai/core/agent-registry.ts` | Register and retrieve agents |
| Agent Runner | `src/ai/core/agent-runner.ts` | Execute agents with validation |
| Prompt Builder | `src/ai/core/prompt-builder.ts` | Build system/user prompts |
| Rate Limiter | `src/ai/core/rate-limit.ts` | Per-agent rate limiting |
| Usage Logger | `src/ai/core/usage-logger.ts` | Log AI usage to AIUsage table |

**Key Finding:** Agent system supports custom agents with input/output schemas, quality checks, and safety rules. AI Mentor can be registered as a new agent.

### 2.4 LearnerState

| Component | Location | Purpose |
|-----------|----------|---------|
| Service | `lib/learner-state/service.ts` | Fetch learner state from DB |
| Calculator | `lib/learner-state/calculator.ts` | Calculate skill accuracy, trends, confidence |
| Types | `lib/learner-state/types.ts` | LearnerSkillState with 7 skills |

**Key Finding:** LearnerState provides rich skill data:
- 7 skills (READING, WRITING, LISTENING, SPEAKING, GRAMMAR, VOCABULARY, LITERATURE)
- Accuracy (overall and recent)
- Trend (IMPROVING, STABLE, DECLINING, INSUFFICIENT_DATA)
- Confidence (NO_DATA, LOW, MEDIUM, HIGH)
- MasteryState (NO_DATA, NOT_ENOUGH_EVIDENCE, DEVELOPING, PROFICIENT)

### 2.5 Learning Loop

| Component | Location | Purpose |
|-----------|----------|---------|
| Skills | `lib/learning-loop/skills.ts` | Skill profiling and XP |
| Recommend | `lib/learning-loop/recommend.ts` | Generate recommendations |
| NextAction | `lib/learning-loop/next-action.ts` | Next best action CTA |
| Session | `lib/learning-loop/session.ts` | Daily insights generation |

**Key Finding:** Learning Loop already generates recommendations based on weak skills. AI Mentor can leverage this.

---

## 3. Data Grounding Design

### Minimum Student Context for Useful Mentoring

```typescript
interface MentorContext {
  // Skill profile (from LearnerState)
  skills: {
    name: string;
    accuracy: number | null;
    recentAccuracy: number | null;
    trend: string;
    confidence: string;
    masteryState: string;
  }[];
  
  // Strongest and weakest skills (derived)
  strongestSkill: string | null;
  weakestSkill: string | null;
  
  // Recent learning evidence (from LearningEvidence)
  recentMistakes: {
    skill: string;
    questionType: string;
    answeredAt: string;
  }[];
  
  // Current recommendation (from Learning Loop)
  currentRecommendation: {
    title: string;
    description: string;
    skill: string;
  } | null;
}
```

### Field Justification

| Field | Why Needed | Source | Freshness | Missing Behavior |
|-------|-----------|--------|-----------|------------------|
| `skills` | Core context for mentoring | LearnerState | Real-time | Show "Aku masih mengenali pola belajarmu" |
| `strongestSkill` | Recognize strengths | Derived from skills | Real-time | Skip strength recognition |
| `weakestSkill` | Focus recommendations | Derived from skills | Real-time | Show generic advice |
| `recentMistakes` | Ground explanations in evidence | LearningEvidence | Last 7 days | Show "Selesaikan beberapa latihan lagi" |
| `currentRecommendation` | Contextual next steps | Learning Loop | Daily | Show generic "Latih kemampuanmu" |

### Context Size Estimate

- Skills: ~7 objects × 100 bytes = 700 bytes
- Recent mistakes: ~5 objects × 150 bytes = 750 bytes
- Recommendation: ~1 object × 200 bytes = 200 bytes
- **Total: ~1.6 KB** (well within token limits)

---

## 4. Privacy & Data Minimization

### What AI Mentor Receives

✅ **YES:**
- Skill accuracy and trends
- Recent mistake patterns (anonymized)
- Current recommendation
- Learning streak

❌ **NO:**
- Full name (use "Kamu" instead)
- School information
- Complete activity history
- Raw database dumps
- Other students' data

### Server-Side Context Builder

The context builder runs **server-side only**. The client never injects student history.

```typescript
// Server-side only
async function buildMentorContext(userId: string): Promise<MentorContext> {
  const learnerState = await getLearnerState(userId);
  const recentEvidence = await getRecentEvidence(userId, 7); // Last 7 days
  const recommendation = await getActiveRecommendations(userId);
  
  return {
    skills: learnerState.map(s => ({
      name: s.label,
      accuracy: s.accuracy,
      recentAccuracy: s.recentAccuracy,
      trend: s.trend,
      confidence: s.confidence,
      masteryState: s.masteryState,
    })),
    strongestSkill: findStrongest(learnerState),
    weakestSkill: findWeakest(learnerState),
    recentMistakes: recentEvidence.slice(0, 5),
    currentRecommendation: recommendation[0] ?? null,
  };
}
```

---

## 5. AI Mentor Response Design

### Response Structure

```
1. Apa yang terjadi
   → "Kemampuan [skill] kamu [trend] dengan akurasi [X]%"

2. Mengapa ini mungkin terjadi
   → "Ini bisa terjadi karena [pattern dari recentMistakes]"

3. Apa yang bisa dilakukan
   → "Coba fokus ke [weakestSkill] dengan [recommendation]"

4. Langkah kecil berikutnya
   → "Mulai dengan [specific action]"
```

### Response Examples

**Example 1: Weak skill detected**
```
Kemampuan Tata Bahasa kamu menunjukkan akurasi 45% dengan tren menurun.
Ini bisa terjadi karena pola kesalahan di bagian imbuhan dan kalimat efektif.
Coba fokus ke Tata Bahasa dengan latihan imbuhan dasar.
Langkah kecil: Selesaikan 1 unit Jalur Cerdas tentang imbuhan hari ini.
```

**Example 2: Insufficient data**
```
Aku masih mengenali pola belajarmu. Yuk selesaikan beberapa latihan lagi
agar saranku semakin tepat.
```

### Response Guidelines

**DO:**
- Be encouraging but not overly verbose
- Ground advice in actual evidence
- Use simple, clear language
- Acknowledge uncertainty

**DO NOT:**
- Shame the student
- Fabricate certainty
- Diagnose personal conditions
- Pretend to know something not supported by evidence

---

## 6. Cost & Quota Design

### Current MURID_PREMIUM Entitlement

| Key | Limit | Period |
|-----|-------|--------|
| `AI_MENTOR_DAILY_LIMIT` | 30 | Day |
| `AI_PRACTICE_MONTHLY_LIMIT` | 50 | Month |

### Cost Estimation

**Provider:** Groq `openai/gpt-oss-120b`
- Input: ~500 tokens (system prompt + context)
- Output: ~300 tokens (mentor response)
- **Total: ~800 tokens per interaction**

**Cost per interaction:**
- Groq rate: $0.0003/1K tokens
- 800 tokens × $0.0003/1000 = **$0.00024 per interaction**
- ~Rp 0.38 per interaction (at Rp 16,000/USD)

**Monthly cost at 30 interactions/day:**
- 30 × 30 days = 900 interactions
- 900 × $0.00024 = **$0.216/month**
- ~Rp 3,456/month per student

**Margin analysis:**
- Revenue: Rp 19,000/month
- AI cost: Rp 3,456/month
- **Gross margin: 82%** ✅

### Recommended Quota

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Daily limit | 30 interactions | Sustainable at Rp 19,000/month |
| Rate limit | 10/minute | Prevent abuse |
| Max context size | 2 KB | Keep token usage low |
| Max output size | 500 tokens | Encourage concise responses |

---

## 7. Failure Modes

| Failure | Behavior |
|---------|----------|
| Provider timeout | Return "AI Mentor sedang sibuk. Coba lagi sebentar." |
| Provider failure | Fallback to next provider (currently single-provider) |
| Fallback failure | Return "Layanan AI sedang tidak tersedia. Silakan coba nanti." |
| Insufficient quota | Return "Kuota mentor harianmu sudah habis. Besok akan reset." |
| Empty learning evidence | Return "Aku masih mengenali pola belajarmu. Yuk selesaikan beberapa latihan lagi." |
| New student | Return "Mulai beberapa latihan dulu agar aku bisa membantumu lebih baik." |
| Unsafe question | Return "Aku hanya bisa membantu tentang kemampuan bahasa Indonesia. Ada yang ingin kamu tanyakan tentang latihanmu?" |

---

## 8. UX Entry Point

### Recommended: PremiumValueCard (after P5B enhancement)

**Why this location:**
1. Already shows personalized learning value (P5B)
2. Contextually relevant to skill progress
3. Not intrusive (single card, not floating)
4. Already has isPremium distinction

**Implementation:**
- FREE: Shows "Pelajari Premium" (existing)
- PREMIUM: Shows "Tanyakan Mentor" button when sufficient evidence

**Alternative considered:**
- SkillRadar: Too focused on data display
- Progresku: Too focused on historical view
- After completing latihan: Good but requires session tracking

---

## 9. Conversation Scope

### Recommended: A. Single Contextual Explanation

**Why single explanation:**
1. **Smallest product that creates clear value** — answers one question well
2. **Lowest cost** — single interaction vs multi-turn
3. **Easiest to implement** — no conversation state management
4. **Faster response** — no context accumulation
5. **Clear success metric** — "Did the student understand?"

**Multi-turn consideration:**
- Requires conversation history storage
- Increases token usage exponentially
- More complex UX
- Can be added in P5D if needed

---

## 10. Security Review

| Risk | Mitigation |
|------|------------|
| Prompt injection | Server-side context builder; client cannot inject arbitrary history |
| Client context spoofing | Context built server-side from userId; client sends no context |
| User ID spoofing | Auth-gated via `getUser()`; userId from session |
| Entitlement bypass | Server-side `resolvePlan()` check; client cannot set plan |
| AI cost abuse | Rate limiting (10/min) + daily quota (30/day) |
| Rate-limit bypass | Server-side rate limiter; client cannot bypass |
| Excessive context exposure | Context limited to 2 KB; no raw DB dumps |

### Security Rules

1. **Server-authoritative:** All context built server-side
2. **Auth-gated:** `getUser()` required before任何 AI call
3. **Entitlement check:** `resolvePlan()` verifies MURID_PREMIUM
4. **Rate limiting:** `checkAgentRateLimit()` enforces limits
5. **Usage logging:** All interactions logged to AIUsage table

---

## 11. Implementation Blueprint

### API Route

```
POST /api/player/mentor
```

**Request:** `{ question: string }`  
**Response:** `{ answer: string, skill: string, confidence: string }`

### Server-Side Flow

```
1. Auth check (getUser)
2. Entitlement check (resolvePlan → MURID_PREMIUM)
3. Rate limit check (checkAgentRateLimit)
4. Quota check (PremiumUsage: AI_MENTOR_DAILY_LIMIT)
5. Build context (buildMentorContext)
6. Call AI (callWithFallback)
7. Deduct usage (consumeUsageGuarded)
8. Log usage (logUsage)
9. Return response
```

### UI Component

```typescript
// components/student-home/MentorCTA.tsx
export function MentorCTA() {
  const { premium } = useHomeData();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Show only for PREMIUM with sufficient evidence
  if (!premium || premium.plan !== "MURID_PREMIUM") return null;
  
  return (
    <div className="mentor-cta">
      <h4>Tanyakan Mentor</h4>
      <input 
        value={question} 
        onChange={e => setQuestion(e.target.value)}
        placeholder="Kenapa saya sering salah di bagian ini?"
      />
      <button onClick={handleAsk} disabled={loading}>
        {loading ? "Bertanya..." : "Tanyakan"}
      </button>
      {answer && <div className="answer">{answer}</div>}
    </div>
  );
}
```

### Error States

| Error | UI Response |
|-------|-------------|
| Auth required | Redirect to login |
| Not Premium | Hide mentor CTA |
| Quota exceeded | "Kuota harian habis. Besok reset." |
| Rate limited | "Terlalu banyak pertanyaan. Tunggu sebentar." |
| Provider error | "AI Mentor sedang sibuk. Coba lagi." |
| Empty evidence | "Selesaikan beberapa latihan dulu." |

---

## 12. Test Plan

### Deterministic Tests

| Test | Expected |
|------|----------|
| FREE murid cannot access | 403 FORBIDDEN |
| MURID_PREMIUM can access | 200 with answer |
| Client cannot spoof context | Context built server-side |
| Empty evidence uses fallback | Honest "Aku masih mengenali" message |
| Provider fallback works | Chain through providers |
| Quota is enforced | 402 when limit reached |
| Rate limiting works | 429 when too fast |
| No unnecessary data sent | Context limited to 2 KB |

---

## 13. Database Changes

### Minimal Changes Required

| Change | Reason | Risk |
|--------|--------|------|
| Add `mentor-mentor` to AiAgentId enum | Register AI Mentor agent | Low |
| Add `AI_MENTOR` to USAGE_FEATURES | Track usage via PremiumUsage | Low |

**No new tables needed.** Leverages existing:
- `AiUsage` for AI call logging
- `PremiumUsage` for daily quota enforcement
- `LearningEvidence` for context building
- `LearningSkill` for skill profile

---

## 14. Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/ai/agents/mentor-agent.ts` | AI Mentor agent definition |
| `app/api/player/mentor/route.ts` | API route for mentor |
| `components/student-home/MentorCTA.tsx` | UI component |
| `scripts/test-p5c1-mentor.ts` | Tests |

### Modified Files

| File | Change |
|------|--------|
| `src/ai/core/agent-types.ts` | Add `mentor` to AgentId |
| `lib/premium-economy/features.ts` | Add `AI_MENTOR` to USAGE_FEATURES |
| `lib/ai-gateway/agent-cost-policy.ts` | Add `mentor` cost policy |

---

## 15. Verification Status

| Check | Status |
|-------|--------|
| `npx tsc --noEmit` | NOT YET RUN |
| `git diff` | Documentation-only (this file) |

---

## 16. Key Findings Summary

### What Already Exists (90% of AI Mentor)

1. ✅ AI Gateway with quota checking
2. ✅ Provider system with fallback
3. ✅ Agent system with registration
4. ✅ LearnerState with skill data
5. ✅ Learning Loop with recommendations
6. ✅ Premium Economy with daily limits
7. ✅ Rate limiting infrastructure
8. ✅ Usage logging infrastructure

### What Needs Building (10% of AI Mentor)

1. 🔨 Mentor agent definition (prompt + schema)
2. 🔨 Context builder (server-side)
3. 🔨 API route (POST /api/player/mentor)
4. 🔨 UI component (MentorCTA)
5. 🔨 Tests

---

**P5C-1 Status: DESIGN COMPLETE — Ready for Founder approval before implementation.**
