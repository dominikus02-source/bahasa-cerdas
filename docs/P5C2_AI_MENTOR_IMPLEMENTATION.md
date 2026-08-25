# P5C-2 — AI Mentor Implementation

**Date:** 2026-08-25  
**Status:** P5C-2 PASS ✅  
**Scope:** AI Mentor for MURID_PREMIUM  
**Files Created/Modified:** 8 files

---

## 1. Architecture

```
POST /api/player/mentor
      ↓
Authentication (getUser)
      ↓
Role Check (MURID only)
      ↓
Entitlement Check (resolvePlan → MURID_PREMIUM)
      ↓
Rate Limit (10 req/min via existing rate limiter)
      ↓
Daily Quota (AI_MENTOR_DAILY_LIMIT = 30/day)
      ↓
Context Builder (server-side only)
      ↓
AI Provider (Groq openai/gpt-oss-120b)
      ↓
Structured Output Validation
      ↓
Deterministic Fallback (if provider fails)
      ↓
Response
```

---

## 2. Endpoint

### POST /api/player/mentor

**Request:** `{}` or `{ "action": "explain" }`  
**Response:**
```json
{
  "success": true,
  "data": {
    "headline": "Fokuskan dulu pada Tata Bahasa",
    "diagnosis": "Data belajarmu menunjukkan...",
    "reason": "Kamu sudah cukup kuat dalam...",
    "action": "Coba latihan Tata Bahasa...",
    "encouragement": "Sedikit latihan terarah..."
  },
  "metadata": {
    "requestId": "mentor_...",
    "provider": "groq",
    "model": "openai/gpt-oss-120b",
    "latencyMs": 1234
  }
}
```

**Error Responses:**
- 401: Unauthorized
- 403: Forbidden (not MURID or not Premium)
- 429: Quota exceeded or rate limited
- 500: Internal error

---

## 3. Entitlement Flow

1. `getUser()` → authenticate
2. `resolvePlan(userId)` → get canonical plan
3. Check `plan === "MURID_PREMIUM"` or Founder/Admin bypass
4. If FREE → return 403 with Premium CTA
5. If MURID_PREMIUM → continue

**Entitlement Matrix:**
| Plan | AI_MENTOR_DAILY_LIMIT |
|------|----------------------|
| FREE | unlimited (but blocked by plan check) |
| MURID_PREMIUM | 30/day |
| PRO | unlimited |
| FOUNDER | unlimited |

---

## 4. Context Builder

**Location:** `lib/ai-gateway/mentor-context.ts`

**Data Sources:**
| Source | Data | Freshness |
|--------|------|-----------|
| LearnerState | 7 skills, accuracy, trends | Real-time |
| Learning Loop | Recommendations | Daily |
| PlayerActivity | Recent activity | 7 days |

**Context Contract:**
```typescript
{
  strongestSkill: { skill, label, accuracy, trend },
  focusSkill: { skill, label, accuracy, trend },
  recentMistakes: [{ skill, type }],
  recommendation: { title, description, skill },
  confidence: number,
  hasEnoughData: boolean
}
```

**Privacy:**
- Context built server-side only
- Client cannot inject arbitrary data
- No personal information sent to AI

---

## 5. Data Sources

| System | Usage |
|--------|-------|
| LearnerState | Skill accuracy, trends, confidence |
| Learning Loop | Recommendations, next actions |
| Premium Economy | Entitlement, usage tracking |
| AI Gateway | Provider fallback, rate limiting |

---

## 6. AI Provider

**Primary:** Groq `openai/gpt-oss-120b`  
**Cost:** ~$0.00024 per interaction (~Rp 0.38)  
**Monthly at 30/day:** ~Rp 3,456/student  
**Gross margin:** 82% at Rp 19,000/month

---

## 7. Credit/Usage Behavior

| Metric | Value |
|--------|-------|
| Credit cost | 1 credit per interaction |
| Daily limit | 30 (MURID_PREMIUM) |
| Rate limit | 10 req/min |
| Usage tracking | PremiumUsage (AI_MENTOR, DAY period) |

**Flow:**
1. Check quota via `consumeUsage()`
2. If limit reached → return 429
3. If allowed → proceed with AI call
4. Usage already consumed before AI call (pre-deduction pattern)

---

## 8. Rate Limiting

**Config:** 10 requests/minute per user  
**Location:** `src/ai/core/rate-limit.ts`  
**Mechanism:** Upstash Redis via existing `rateLimitRoute()`

---

## 9. Security

| Risk | Mitigation |
|------|------------|
| Client context spoofing | Context built server-side only |
| userId spoofing | Auth-gated via getUser() |
| Entitlement bypass | Server-side resolvePlan() |
| Rate limit bypass | Server-side rate limiter |
| AI cost abuse | Daily quota + rate limiting |

---

## 10. Fallback Behavior

### Provider Failure
- Falls back to deterministic response
- Uses context to generate useful advice
- No AI call made

### Insufficient Data
- Returns honest "Belum cukup data" message
- Encourages more practice
- No fabricated analysis

### Deterministic Fallback Response:
```json
{
  "headline": "Belum cukup data",
  "diagnosis": "Aku masih mengenali pola belajarmu.",
  "reason": "Data belajar belum cukup untuk memberikan analisis yang akurat.",
  "action": "Selesaikan beberapa latihan lagi, lalu coba tanyakan lagi.",
  "encouragement": "Sedikit demi sedikit, kamu akan semakin kuat!"
}
```

---

## 11. UI

### Premium Users
- Shows "Minta Penjelasan Mentor" button
- Loading state: "Mentor sedang membaca progresmu..."
- Result displayed in gradient card
- "Tanyakan lagi →" for re-request

### FREE Users
- Shows teaser: "Dapatkan panduan belajar yang lebih personal"
- CTA: "Lihat Premium" → /murid/premium
- No API call made

---

## 12. Tests

### P5C-2 Tests (32/32 PASS)
| Category | Tests |
|----------|-------|
| Authentication & Authorization | 4 |
| Entitlement | 4 |
| Rate Limiting | 2 |
| Context Builder | 5 |
| AI Agent | 4 |
| Credit/Usage | 3 |
| Security | 4 |
| UI | 4 |
| AgentId Registration | 2 |

### Regression Tests
| Suite | Result |
|-------|--------|
| Premium Economy | 63/63 ✅ |
| Premium Production | 24/24 ✅ |
| P5B Quick Wins | 23/23 ✅ |
| TypeScript | 0 errors ✅ |
| Build | 268 pages ✅ |

---

## 13. Performance

- Context building: <100ms (parallel reads)
- AI generation: 1-3s (Groq)
- Total response: <4s typical
- No N+1 queries
- No expensive synchronous analytics

---

## 14. Known Limitations

1. **Single provider (Groq)** — If Groq is down, falls back to deterministic
2. **No conversation history** — Each request is independent
3. **Simplified recentMistakes** — Could be enhanced with actual mistake tracking
4. **Pre-deduction pattern** — Usage consumed before AI call (acceptable for low-cost)

---

## 15. Files Created/Modified

| File | Action |
|------|--------|
| `src/ai/core/agent-types.ts` | Added `mentor` to AgentId |
| `lib/ai-gateway/gateway-types.ts` | Added `mentor` to AiAgentId |
| `lib/ai-gateway/agent-cost-policy.ts` | Added mentor cost (1 credit) |
| `src/ai/core/rate-limit.ts` | Added mentor rate limit (10/min) |
| `lib/ai-gateway/mentor-context.ts` | New: Context builder |
| `src/ai/agents/mentor-agent.ts` | New: Agent definition |
| `app/api/player/mentor/route.ts` | New: API route |
| `components/student-home/PremiumValueCard.tsx` | Added Mentor CTA |
| `scripts/test-p5c2-ai-mentor.ts` | New: 32 tests |
| `docs/P5C2_AI_MENTOR_IMPLEMENTATION.md` | This document |

---

**P5C-2 Status: PASS ✅ — Ready for Founder review.**
