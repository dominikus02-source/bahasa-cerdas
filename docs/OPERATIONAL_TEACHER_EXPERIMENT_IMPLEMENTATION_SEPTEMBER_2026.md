# OPERATIONAL TEACHER EXPERIMENT — Phase 10 Guided Activation (Implementation, September 2026)

## Status
**BUILT — NOT COMMITTED / NOT PUSHED. Measurement-only. Awaiting Founder Review (project convention: shell-phase / experiment phases are never committed without founder approval).**

This document records the implementation of the smallest intervention to raise **new-teacher activation** from the frozen 11.2% (54/484) baseline toward ≥25%, per the three spec documents (all still SPECIFICATION ONLY):
- `docs/OPERATIONAL_TEACHER_EXPERIMENT_SPEC_SEPTEMBER_2026.md`
- `docs/TEACHER_ACTIVATION_ANALYTICS_SPEC_SEPTEMBER_2026.md`
- `docs/OPERATIONAL_CLASSROOM_METRIC_SPEC_SEPTEMBER_2026.md`

Protected decision layer (`docs/FOUNDER_DECISION_LAYER.md`) and admin executive/founder-health surfaces were **NOT modified** (verified 0 diff).

## Scope (P0 ONLY)
1. Guided onboarding
2. First-class activation CTA
3. Immediate class code
4. **Student milestone visibility**
5. **Activation telemetry integration**

This session deliberately focused the code on **(4) + (5)**, since they were the confirmed gaps:
- There was **no live "first student joined" feedback** on the guru onboarding.
- The **F5 first-join ProductEvent was NOT wired** (only F4 `class_code_shared` and F8 `teacher_session` existed in Phase 9).
- `/api/group` POST already returned `code` immediately (#3), and beranda already had an `isEmptyState` "Buat Kelas Pertama" CTA (#2).

**Deferred by decision:** reward/XP on first join — to avoid altering join semantics and the commission attribution path. No new GURU XP source was added.

## What Was Built

### 1. `app/api/guru/onboarding/status/route.ts` — (NEW) milestone poll endpoint
`GET /api/guru/onboarding/status?groupId=<id>` — read-only companion to the guided onboarding.
- **Auth:** 401 unauth; `isTeacherOrStudent` (GURU/founder) else 403 `"Hanya guru yang bisa mengakses"`.
- **Ownership:** 400 without `groupId`; 200 `{hasGroup:false}` when group not found; 403 `"Bukan kelas kamu"` when `group.teacherId !== caller`.
- **Response:** `{ groupId, hasGroup, memberCount, firstJoinedAt, firstStudentName, milestones:{m1,m3}, activated }`.
- Orders `GroupMember` by `joinedAt asc` → `memberCount` = F6 numerator source; `firstJoinedAt` = F5 proxy source; `firstStudentName` = `fullName` (fallback `nickname`).
- No answer key, no PII beyond the student's own display name (teacher's own class).

### 2. F5 first-join event (activation telemetry)
- `lib/analytics/product-event-store.ts` — added `PRODUCT_EVENT_F5_FIRST_JOIN = "class_first_join"`.
- `app/api/group/join/route.ts` — after `groupMember.create`, counts members; **fires only on the actual first join** (`memberCount === 1`): `void recordProductEvent({ actorId: group.teacherId, event: "class_first_join", entityType:"Group", entityId:group.id, logicalKey:"group-<id>-first-join", props:{grade, studentId} })`.
  - Best-effort / fire-and-forget (never blocks join), idempotent via the `@@unique([actorId,event,entityType,entityId,logicalKey])` contract (P2002 → `{recorded:false}`).
  - Later joins don't re-fire (idempotent once-per-group).
  - **Commission attribution untouched** — `ensureAttributionOnClassJoin` still first-valid-wins.
- `app/api/analytics/product-event/route.ts` — added `"class_first_join"` to `ALLOWED_EVENTS` allowlist (behind existing `rateLimitRoute`, 30/60s).

### 3. Onboarding Step 4 — milestone visibility screen
`app/(dashboard)/guru/onboarding/page.tsx` (additive; 3-step → 4-step flow):
- **Progress dots** now `[0,1,2,3]` (4 steps).
- Share-code step (step 2) primary CTA changed from `Mulai Mengajar` (→ beranda) to **`Undang Murid & Mulai Mengajar 🚀`** → `handleGoToMilestone` (→ step 3, live milestone screen). This fixes the dead-end where a new teacher finished sharing with zero live feedback.
- **Step 3 (index 3) milestone screen** (`milestoneStep` states: 0 loading / 1 waiting / 2 first-joined / 3 threesome):
  - **Waiting:** "Tunggu murid pertamamu" + re-displays `accessCode` + note that the page auto-updates.
  - **First-joined (m1):** "Murid pertamamu bergabung! 🎉" with the student's name (`firstStudentName`).
  - **Threesome (m3):** "Hebat! Kelasmu sudah ramai 🎉" + active-class milestone reached.
  - **Live counter** (`memberCount murid bergabung`) + 3-step progress bars (1/2/3) + active-class label.
  - **Actions:** "Lihat Halaman Murid" (`/murid/gabung-kelas`), "Ke Halaman Kelasku" (`handleSkipToClass` → `/guru/kelasku`), "Selesai ke Dasbor" (`handleFinish` → `/guru/beranda`).
- **Live poll:** a `useEffect` (deps `[step, createdClass?.id]`) polls `/api/guru/onboarding/status?groupId=` every **4000ms** only while on step 3 → updates `memberCount`/`firstStudentName`/`milestoneStep`. GET-only (idempotent, safe). Cleared on unmount.

### 4. Beranda first-class CTA (verified existing, no change)
`app/(dashboard)/guru/beranda/page.tsx` already implements the first-class CTA via `isEmptyState` ("Buat Kelas Pertama" → `/guru/kelasku`) when a new teacher has 0 classes & 0 students. This satisfies P0 #2 and was intentionally **not** modified to keep scope tight.

## Files Changed / Created
| File | Action |
|------|--------|
| `app/api/guru/onboarding/status/route.ts` | NEW |
| `lib/analytics/product-event-store.ts` | +`PRODUCT_EVENT_F5_FIRST_JOIN` |
| `app/api/group/join/route.ts` | +F5 first-join event (additive, best-effort) |
| `app/api/analytics/product-event/route.ts` | +`class_first_join` allowlist |
| `app/(dashboard)/guru/onboarding/page.tsx` | +Step 4 milestone screen (4 dots, poll, celebrations, CTA) |
| `scripts/test-operational-teacher-build.ts` | NEW — 28 assertions |
| `package.json` | +`test:operational-teacher-build` |
| `docs/OPERATIONAL_TEACHER_EXPERIMENT_IMPLEMENTATION_SEPTEMBER_2026.md` | THIS document |

## Event Mapping (activation funnel)
| Stage | Endpoint/Event | Source | Status before → after |
|-------|----------------|--------|------------------------|
| F4 code shared | `class_code_shared` (once/group) | `/api/group` POST | ✅ existed (Phase 9) → unchanged |
| F8 teacher session | `teacher_session` (once/day WIB) | `/api/group` POST + `/api/guru/dashboard` | ✅ existed (Phase 9) → unchanged |
| **F5 first join** | **`class_first_join` (once/group)** | **`/api/group/join`** | **⬜ missing → ✅ WIRED this session** |
| Immediate code ctx | return `code` | `/api/group` POST | ✅ existed |
| First-class CTA | `isEmptyState` | beranda | ✅ existed |
| Milestone visibility | `/api/guru/onboarding/status` | onboarding step 3 | **⬜ missing → ✅ WIRED this session** |

ACTIVATION/O1 = "created ≥1 class" (F3). Metrics frozen: baseline 11.2%, target ≥25%. Measurement remains read-only via existing analytics.

## Verification
| Check | Result |
|-------|--------|
| `npx prisma validate` (dummy env) | ✅ Valid |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint` (6 changed/new files) | ✅ 0 violations |
| `npm run test:operational-teacher-build` (NEW) | ✅ 28/28 |
| `npm run test:operational-baseline` | ✅ 27/27 |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:guru-phase` | ✅ SEMUA LULUS |
| `npx tsx scripts/test-phase-simulation-workflow.ts` | ✅ 90/90 |
| `npm run build` (dummy env) | ✅ 419 routes, 0 errors, EXIT=0 |
| Protected zones (FOUNDER_DECISION_LAYER.md, admin exec/page, founder-health) | ✅ 0 diff |
| No git add/commit/push | ✅ measurement-only |

## Note Re: Pre-existing uncommitted work
Git status shows several **pre-existing** Phase-9/Phase-10-spec uncommitted files (e.g. `prisma/schema.prisma` + ProductEvent model + `2026-09-08_product_event.sql` migration, `lib/analytics/product-event-store.ts`, `/api/group` F4/F8 hooks, the spec/baseline JSON + docs, `teacher-growth-forensic.ts`). These were authored in prior sessions and are **not part of this build session's diff**. Their presence is expected; committing everything is deferred until founder approval.

## Launch Gate
1. Founder reviews this build + the three spec docs + frozen metrics.
2. If approved: apply migration `prisma/migrations/manual/2026-09-08_product_event.sql` to production via Supabase SQL Editor (idempotent, additive — already authored in Phase 9).
3. Commit + push.
4. Measure activation over a defined window; compare to 11.2% baseline; target ≥25%.

## Rollback
- F5 event + allowlist: trivially removable (logicalKey idempotency means no duplicate data; events are telemetry only).
- Milestone screen: revert `onboarding/page.tsx` to 3-step; remove step-3 JSX.
- Status endpoint: delete route.
- No schema change is required for rollback beyond the already-idempotent ProductEvent table.

## Limitations
- Milestone polling is client-side (4s interval, GET-only); acceptable for a single-teacher onboarding screen.
- The experiment is **measurement-only** — no reward/XP/commission change (by decision).
- Activation % depends on teachers reaching the milestone stage; the CTA change routes them there explicitly.
