# P5C-3 — Weekly Recap Forensic Audit

**Date:** 2026-08-25  
**Status:** FORENSIC COMPLETE  
**Scope:** Data architecture audit for Weekly Learning Recap

---

## 1. Discovered Data Sources

### 1.1 LearnerState (`lib/learner-state/`)

**Purpose:** Calculate skill accuracy, trends, and confidence from learning evidence.

**Data Available:**
- 7 skills (READING, WRITING, LISTENING, SPEAKING, GRAMMAR, VOCABULARY, LITERATURE)
- Accuracy (overall and recent)
- Trend (IMPROVING, STABLE, DECLINING, INSUFFICIENT_DATA)
- Confidence (NO_DATA, LOW, MEDIUM, HIGH)
- MasteryState (NO_DATA, NOT_ENOUGH_EVIDENCE, DEVELOPING, PROFICIENT)

**Freshness:** Real-time from `LearningEvidence` table

**Limitation:** Uses `RECENT_ATTEMPT_LIMIT = 10` for recent vs historical comparison. Not week-based.

### 1.2 PlayerActivity (`lib/learning-loop/activity.ts`)

**Purpose:** Log granular learning activities.

**Data Available:**
- Activity type (JALUR_CERDAS, LESSON, QUIZ, SIMULATION, etc.)
- Skill association
- XP earned
- Coin earned
- Timestamp (createdAt)

**Freshness:** Real-time

**Limitation:** No direct week-based aggregation. Must filter by date range.

### 1.3 LearningJourney (`lib/learning-loop/journey.ts`)

**Purpose:** Timeline of learning activities grouped by day (WIB).

**Data Available:**
- dayKey (YYYY-MM-DD in WIB)
- Activity type, title, description
- Timestamp

**Freshness:** Real-time

**Limitation:** Timeline view, not aggregate statistics.

### 1.4 LearningSkill (`lib/learning-loop/skills.ts`)

**Purpose:** Track skill XP and level.

**Data Available:**
- Skill type
- XP accumulated
- Level (calculated from XP)

**Freshness:** Real-time

**Limitation:** Cumulative, not week-based. Cannot distinguish this week vs last week.

### 1.5 LearningEvidence (`lib/learner-state/service.ts`)

**Purpose:** Raw evidence of question attempts with correctness.

**Data Available:**
- userId
- source, questionId
- isCorrect
- answeredAt

**Freshness:** Real-time

**Limitation:** Requires JOIN with QuestionMetadata to get skill.

---

## 2. Schema/Model Mapping

| Model | Location | Weekly Recap Usage |
|-------|----------|-------------------|
| `LearningEvidence` | DB | Primary source for skill accuracy |
| `PlayerActivity` | DB | Activity counts, active days |
| `LearningSkill` | DB | Current skill levels |
| `QuestionMetadata` | DB | Skill mapping for evidence |
| `LearningJourney` | DB | Timeline (optional) |

---

## 3. Reusable Functions

| Function | Location | Usage |
|----------|----------|-------|
| `getLearnerState()` | `lib/learner-state/service.ts` | Get current skill states |
| `getRecentActivity()` | `lib/learning-loop/activity.ts` | Get recent activities |
| `getSkillProfile()` | `lib/learning-loop/skills.ts` | Get skill XP/levels |
| `dayKeyWIB()` | `lib/learning-loop/journey.ts` | WIB date utilities |
| `SKILL_LABELS` | `lib/learning-loop/skills.ts` | Skill name mapping |

---

## 4. Missing Data

### 4.1 Week-Based Skill Snapshots

**Issue:** LearnerState calculates trends using `RECENT_ATTEMPT_LIMIT = 10`, not week boundaries.

**Solution:** Query `LearningEvidence` with date range filtering for week-based aggregation.

### 4.2 Previous Week Comparison

**Issue:** No stored "previous week" snapshot.

**Solution:** Calculate both current week and previous week from `LearningEvidence` in same query.

---

## 5. Recommended Aggregation Strategy

### Week Boundary

- **WIB (UTC+7)**: Monday 00:00 to Sunday 23:59
- Use `dayKeyWIB()` pattern for consistency

### Data Sources for Weekly Recap

1. **PlayerActivity** (date-filtered):
   - Count activities this week
   - Count active days
   - List activity types

2. **LearningEvidence** (date-filtered + JOIN QuestionMetadata):
   - Count questions attempted this week
   - Count correct answers
   - Calculate accuracy per skill
   - Compare with previous week

3. **LearnerState** (current):
   - Overall skill trends
   - Strongest/weakest skills

### Aggregation Query

```sql
-- Current week evidence by skill
SELECT 
  m.skill,
  COUNT(*) as attempts,
  COUNT(*) FILTER (WHERE e."isCorrect" = TRUE) as correct
FROM "LearningEvidence" e
JOIN "QuestionMetadata" m ON ...
WHERE e."userId" = $userId
  AND e."answeredAt" BETWEEN $weekStart AND $weekEnd
  AND m."status" = 'APPROVED'
GROUP BY m.skill
```

---

## 6. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| No week-based snapshots | LOW | Calculate from raw evidence |
| Performance on large evidence tables | LOW | Bounded queries, indexed columns |
| Timezone handling | MEDIUM | Use WIB consistently |

---

## 7. Files to Modify

| File | Action |
|------|--------|
| `lib/learning-loop/weekly-recap.ts` | **New:** Aggregation engine |
| `app/api/player/weekly-recap/route.ts` | **New:** API route |
| `components/student-home/WeeklyRecapCard.tsx` | **New:** UI component |
| `components/student-home/PremiumValueCard.tsx` | **Modified:** Add recap integration |

---

**Forensic Status: COMPLETE — Ready for implementation.**
