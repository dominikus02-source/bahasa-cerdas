# PHASE 2 STEP 3H — MY DAY PERSONALIZATION AUDIT

## Current Data Flow

Before Step 3H, Student Home had these separate flows:

```text
HomeDataProvider
  → profile + me + dashboard summary

ContinueLearningCard
  → /api/player/session
  → PlayerCTA / existing Learning Loop nextAction

SkillRadar
  → /api/player/learner-state (after Step 3E integration target)

PremiumValueCard
  → /api/player/premium/status

Adaptive Practice
  → POST /api/player/adaptive-practice
  → no preview GET, no Student Home connection
```

Overlaps:

1. Existing `PlayerCTA` was the only primary recommendation, while Adaptive Practice had a separate selector.
2. Mentor/session and learner state could be fetched independently, creating stale or contradictory context.
3. SkillRadar was descriptive but had no shared My Day data boundary.
4. Premium status was a separate visual fetch.

## Canonical Decision

Step 3H makes Adaptive Practice preview the canonical primary action when an approved eligible pool exists. `PlayerCTA` remains a non-adaptive fallback only. No Student Home component may show a second primary recommendation.

## Implementation Boundary

- New preview mode on the existing adaptive endpoint, not a second recommendation engine.
- My Day preview response includes adaptive decision, learner state, and mentor context.
- HomeDataProvider consumes one My Day adaptive context response plus existing profile/summary sources.
- SkillRadar and MentorCard consume that shared context instead of fetching their own learner/session data.
- Premium remains canonical and server-authoritative; it does not gate core practice.
