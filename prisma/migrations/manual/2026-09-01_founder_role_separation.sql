-- FOUNDER ROLE SEPARATION MIGRATION
-- Date: September 1, 2026
-- Purpose: Apply PRIMARY ROLE = operational identity for 3 founders
--   Dominikus Wahyu:  role ADMIN → GURU  (isFounder=true preserved)
--   Washadi:          role ADMIN → GURU  (isFounder=true preserved)
--   Alexander Suryanta: role ADMIN → GURU (isFounder=true preserved)
--
-- SAFETY:
--   - isFounder flag is NOT changed (already true for all 3)
--   - Commission exclusion via isFounder — UNAFFECTED by role change
--   - Authorization guards use isFounder bypass — UNAFFECTED
--   - Obahmamah (ADMIN, isFounder=false) — NOT touched
--   - All other users — NOT touched
--
-- EXECUTION: Run in Supabase SQL Editor (Production)
-- ROLLBACK: See bottom of file

-- ============================================================
-- STEP 1: PRE-MIGRATION SNAPSHOT (verify current state)
-- ============================================================
-- Run this FIRST to confirm expected pre-conditions:
SELECT id, email, "fullName", role, "isFounder"
FROM "User"
WHERE id IN (
  'cmqxema6a000013z9kefn4jm1',  -- dominikus.02@gmail.com
  'cmqy1g9v50000zag780ik6mrg',  -- hdsastra47@gmail.com
  'cmqy1ga9r0003zag7fbmqhsq4'   -- alexsurya1968@gmail.com
)
ORDER BY email;

-- Expected: all 3 rows with role='ADMIN', "isFounder"=true
-- If any row has role != 'ADMIN' or "isFounder" != true → STOP, investigate

-- ============================================================
-- STEP 2: APPLY MIGRATION (idempotent)
-- ============================================================
-- Only updates if current state matches expectations
UPDATE "User"
SET role = 'GURU'
WHERE id IN (
  'cmqxema6a000013z9kefn4jm1',
  'cmqy1g9v50000zag780ik6mrg',
  'cmqy1ga9r0003zag7fbmqhsq4'
)
AND role = 'ADMIN'  -- idempotent: skip if already GURU
AND "isFounder" = true;  -- safety: only touch founder accounts

-- Rows affected should be exactly 3
-- If 0: already migrated (idempotent safe)
-- If <3: check which founder doesn't match ADMIN+isFounder condition

-- ============================================================
-- STEP 3: POST-MIGRATION VERIFICATION
-- ============================================================
-- Confirm all 3 founders now have role=GURU
SELECT id, email, "fullName", role, "isFounder"
FROM "User"
WHERE id IN (
  'cmqxema6a000013z9kefn4jm1',
  'cmqy1g9v50000zag780ik6mrg',
  'cmqy1ga9r0003zag7fbmqhsq4'
)
ORDER BY email;

-- Expected: all 3 rows with role='GURU', "isFounder"=true

-- Confirm Obahmamah unchanged
SELECT id, email, "fullName", role, "isFounder"
FROM "User"
WHERE id = 'cmqxh3uor000dy3w3l1l4m2th';

-- Expected: role='ADMIN', "isFounder"=false (UNCHANGED)

-- Confirm no other users affected
SELECT role, COUNT(*) as cnt
FROM "User"
WHERE "isFounder" = true
GROUP BY role;

-- Expected: exactly 1 row: role='GURU', cnt=3

-- ============================================================
-- STEP 4: BUSINESS VERIFICATION (run after app deployment)
-- ============================================================
-- Commission eligibility (code-level, verify via audit script):
-- isEligibleForCommission(user) = role === "GURU" && !isFounder
-- For founders: GURU && !true = false → EXCLUDED (correct)
-- For normal guru: GURU && !false = true → ELIGIBLE (correct)

-- Authorization guards (code-level, verified in test-founder-role-separation.ts):
-- admin/layout: role !== "ADMIN" && !isFounder → founder passes via isFounder ✅
-- guru/layout: role !== "GURU" && !isFounder → founder passes via isFounder ✅
-- guru/komisi: role !== "GURU" && !isFounder → founder passes via both ✅

-- ============================================================
-- ROLLBACK (emergency only)
-- ============================================================
-- If migration causes unexpected issues, revert to ADMIN:
-- UPDATE "User"
-- SET role = 'ADMIN'
-- WHERE id IN (
--   'cmqxema6a000013z9kefn4jm1',
--   'cmqy1g9v50000zag780ik6mrg',
--   'cmqy1ga9r0003zag7fbmqhsq4'
-- )
-- AND role = 'GURU'
-- AND "isFounder" = true;
