# BahasaCerdas — Business Metric Dictionary (September 2026)

**Version**: 1.0
**Date**: September 1, 2026
**Purpose**: Canonical definitions for all business metrics used in the Business Truth Audit.

---

## User Metrics

| Metric | Definition | Source | Confidence |
|--------|-----------|--------|------------|
| `user.total` | All User records in database | `User.count()` | HIGH |
| `user.guru` | Users with role = GURU | `User.count(role=GURU)` | HIGH |
| `user.murid` | Users with role = MURID | `User.count(role=MURID)` | HIGH |
| `user.admin` | Users with role = ADMIN | `User.count(role=ADMIN)` | HIGH |
| `user.founders` | Users with isFounder = true | `User.count(isFounder=true)` | HIGH |
| `user.active` | Users with any activity in period | Union of activity tables | HIGH |

## Activation Metrics

| Metric | Definition | Source | Confidence |
|--------|-----------|--------|------------|
| `activation.teachers.any_activity` | GURU users with ≥1 record in any activity table | Union of groups/quizzes/ai/rpp | HIGH |
| `activation.teachers.with_groups` | GURU users with ≥1 Group | `Group.groupBy(teacherId)` | HIGH |
| `activation.students.any_activity` | MURID users with XP, karya, progress, or evidence | Union of activity tables | HIGH |
| `activation.students.with_xp` | MURID users with ≥1 XP record | `XpLedger.groupBy(userId)` | HIGH |

## Retention Metrics

| Metric | Definition | Source | Confidence |
|--------|-----------|--------|------------|
| `retention.{month}.registered` | Users who signed up in month | `User.count(createdAt in month)` | HIGH |
| `retention.{month}.activated` | Registered users with any activity | Union of activity tables | HIGH |
| `retention.{month}.d7_rate` | % of activated users active in days 1-7 | Activity table date range | HIGH |
| `retention.{month}.d14_rate` | % of activated users active in days 8-14 | Activity table date range | HIGH |
| `retention.{month}.d30_rate` | % of activated users active in days 15-30 | Activity table date range | HIGH |

## Learning Metrics

| Metric | Definition | Source | Confidence |
|--------|-----------|--------|------------|
| `learning.units_progress` | Total UserUnitProgress records | `UserUnitProgress.count()` | HIGH |
| `learning.completed_units` | UserUnitProgress with completed=true | `UserUnitProgress.count(completed)` | HIGH |
| `learning.unique_students` | Unique users with ≥1 progress record | `UserUnitProgress.groupBy(userId)` | HIGH |
| `learning.evidence_total` | Total LearningEvidence records | `LearningEvidence.count()` | HIGH |

## Karya Metrics

| Metric | Definition | Source | Confidence |
|--------|-----------|--------|------------|
| `karya.total` | Total StudentKarya records | `StudentKarya.count()` | HIGH |
| `karya.unique_authors` | Unique users who published karya | `StudentKarya.groupBy(userId)` | HIGH |
| `karya.likes` | Total StudentKaryaLike records | `StudentKaryaLike.count()` | HIGH |
| `karya.comments` | Total StudentKaryaComment records | `StudentKaryaComment.count()` | HIGH |

## Assessment Metrics

| Metric | Definition | Source | Confidence |
|--------|-----------|--------|------------|
| `assessment.ukbi.sessions` | Total ProgresKompetensi records | `ProgresKompetensi.count()` | HIGH |
| `assessment.ukbi.completed` | ProgresKompetensi with status=COMPLETED | `ProgresKompetensi.count(COMPLETED)` | HIGH |
| `assessment.ukbi.certificates` | KompetensiCertificate records | `KompetensiCertificate.count()` | HIGH |
| `assessment.test_sessions` | Total TestSession records | `TestSession.count()` | HIGH |
| `assessment.adaptive.sessions` | Total AdaptivePracticeSession records | `AdaptivePracticeSession.count()` | HIGH |

## Gamification Metrics

| Metric | Definition | Source | Confidence |
|--------|-----------|--------|------------|
| `gamification.xp.total` | Sum of all XP awarded | `XpLedger.aggregate(sum)` | HIGH |
| `gamification.badges_awarded` | Total UserBadge records | `UserBadge.count()` | HIGH |
| `gamification.achievements_completed` | UserAchievement with completed=true | `UserAchievement.count(completed)` | HIGH |

## Monetization Metrics

| Metric | Definition | Source | Confidence |
|--------|-----------|--------|------------|
| `monetization.transactions.total` | Total Transaksi records | `Transaksi.count()` | HIGH |
| `monetization.transactions.successful` | Transaksi with status=SUCCESS | `Transaksi.count(SUCCESS)` | HIGH |
| `monetization.revenue.total` | Sum of amount where status=SUCCESS | `SUM(Transaksi.amount)` | HIGH |
| `monetization.premium_users` | GURU users with isPremium=true, !isFounder | `User.count(premium)` | HIGH |
| `monetization.trial_users` | GURU users with trialStartedAt != null | `User.count(trial)` | HIGH |
| `monetization.trial_active` | GURU users with trialEndsAt > now | `User.count(active_trial)` | HIGH |

## Content Metrics

| Metric | Definition | Source | Confidence |
|--------|-----------|--------|------------|
| `content.soal.total` | Total Soal records | `Soal.count()` | HIGH |
| `content.quizzes` | Total Quiz records | `Quiz.count()` | HIGH |
| `content.ukbi_questions` | Total UKBIQuestion records | `UKBIQuestion.count()` | HIGH |
| `content.tka_questions` | Total TKAQuestion records | `TKAQuestion.count()` | HIGH |
| `content.levels` | Total LearningLevel records | `LearningLevel.count()` | HIGH |
| `content.units` | Total LearningUnit records | `LearningUnit.count()` | HIGH |

## North Star Metrics

| Metric | Definition | Source | Confidence |
|--------|-----------|--------|------------|
| `north_star.weekly_active_learners` | Unique users with any learning activity in past 7 days | Union of xpLedger/learningEvidence/userUnitProgress/studentKarya | HIGH |
| `north_star.monthly_active_learners` | Unique users with any learning activity in past 30 days | Union of xpLedger/learningEvidence | HIGH |

## Data Quality Metrics

| Metric | Definition | Source | Confidence |
|--------|-----------|--------|------------|
| `data_quality.test_accounts` | Users with email containing demo/test/example/dev/staging | `User.count(email LIKE ...)` | HIGH |
| `data_quality.internal_accounts` | Founders + admins | `User.count(isFounder)` + `User.count(ADMIN)` | HIGH |
| `data_quality.profiles_empty` | Profile records with all key fields null | `Profile.count(all null)` | HIGH |
| `data_quality.users_no_avatar` | Users with avatar=null | `User.count(avatar=null)` | HIGH |

## Derived Metrics

| Metric | Formula | Status |
|--------|---------|--------|
| `assessment.ukbi.completion_rate` | ukbi.completed / ukbi.sessions × 100 | DERIVED |
| `monetization.trial_to_paid_rate` | premium_users / trial_users × 100 | DERIVED |
| `growth.users.percentage` | (current - historical) / historical × 100 | DERIVED |
| `teacher_student.activation_rate` | teachers_with_students / total_teachers × 100 | DERIVED |
