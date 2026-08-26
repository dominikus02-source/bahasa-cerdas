/**
 * Guru Cerdas Sejahtera — Attribution service (P7A/P7C §2).
 *
 * Materialisasi TeacherAttribution:
 * - Eager saat murid join kelas (CLASS_ENROLLMENT)
 * - First-valid-wins: SATU attribution per murid (`studentId @unique`) —
 *   pindah kelas TIDAK memindahkan attribution (P7A locked).
 * - eligibleFrom = max(launchDate, waktu event) — live join memakai `now`;
 *   backfill pre-launch memakai tanggal resmi program (§2: NO retroactive
 *   commission before launch).
 * - Guru founder/ADMIN dikecualikan; self-referral diblokir.
 * - Append-only event history (TeacherAttributionEvent).
 */

import { db } from "@/lib/db";
import { teacherCommissionLaunchDate, isEligibleForCommission } from "./config";
import type { AttributionUpsertResult } from "./types";

function isP2002(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/**
 * Ensure an attribution exists for a student joining a class.
 *
 * @param studentId User.id murid
 * @param groupId   Group.id yang di-join
 * @param eligibleFromOverride  untuk backfill pre-launch → launch date.
 *                             Live join → undefined (= now).
 */
export async function ensureAttributionOnClassJoin(
  studentId: string,
  groupId: string,
  eligibleFromOverride?: Date,
): Promise<AttributionUpsertResult> {
  // ── Existing attribution always wins (§2: first valid attribution wins) ──
  const existing = await db.teacherAttribution.findUnique({
    where: { studentId },
    select: { id: true, teacherId: true, source: true, eligibleFrom: true },
  });
  if (existing) {
    return {
      attributionId: existing.id,
      teacherId: existing.teacherId,
      source: existing.source,
      eligibleFrom: existing.eligibleFrom,
      created: false,
      skipped: true,
      skipReason: "ATTRIBUTION_EXISTS",
    };
  }

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { id: true, teacherId: true, name: true },
  });
  if (!group) {
    return {
      attributionId: "",
      teacherId: "",
      source: "CLASS_ENROLLMENT",
      eligibleFrom: new Date(0),
      created: false,
      skipped: true,
      skipReason: "GROUP_NOT_FOUND",
    };
  }

  const teacher = await db.user.findUnique({
    where: { id: group.teacherId },
    select: { id: true, role: true, isFounder: true },
  });
  if (!teacher || !isEligibleForCommission(teacher.role, teacher.isFounder)) {
    return {
      attributionId: "",
      teacherId: group.teacherId,
      source: "CLASS_ENROLLMENT",
      eligibleFrom: new Date(0),
      created: false,
      skipped: true,
      skipReason: "TEACHER_EXCLUDED",
    };
  }
  if (teacher.id === studentId) {
    return {
      attributionId: "",
      teacherId: group.teacherId,
      source: "CLASS_ENROLLMENT",
      eligibleFrom: new Date(0),
      created: false,
      skipped: true,
      skipReason: "SELF_REFERRAL",
    };
  }

  const now = new Date();
  const launch = teacherCommissionLaunchDate();
  const eligibleFrom = eligibleFromOverride ?? new Date(Math.max(now.getTime(), launch.getTime()));

  try {
    const created = await db.$transaction(async (tx) => {
      const attribution = await tx.teacherAttribution.create({
        data: {
          studentId,
          teacherId: teacher.id,
          source: "CLASS_ENROLLMENT",
          sourceGroupId: group.id,
          status: "ACTIVE",
          attributedAt: now,
          lockedAt: now,
          eligibleFrom,
          metadata: { groupName: group.name },
        },
        select: { id: true, teacherId: true, source: true, eligibleFrom: true },
      });

      await tx.teacherAttributionEvent.create({
        data: {
          attributionId: attribution.id,
          eventType: "CREATED",
          after: { source: "CLASS_ENROLLMENT", groupId: group.id, eligibleFrom: eligibleFrom.toISOString() },
          reason: eligibleFromOverride ? "BACKFILL_PRE_LAUNCH" : "CLASS_JOIN",
        },
      });

      return attribution;
    });

    return {
      attributionId: created.id,
      teacherId: created.teacherId,
      source: created.source,
      eligibleFrom: created.eligibleFrom,
      created: true,
      skipped: false,
    };
  } catch (err) {
    if (isP2002(err)) {
      // Race: attribution created concurrently — first valid wins.
      const winner = await db.teacherAttribution.findUnique({
        where: { studentId },
        select: { id: true, teacherId: true, source: true, eligibleFrom: true },
      });
      if (winner) {
        return {
          attributionId: winner.id,
          teacherId: winner.teacherId,
          source: winner.source,
          eligibleFrom: winner.eligibleFrom,
          created: false,
          skipped: true,
          skipReason: "ATTRIBUTION_EXISTS",
        };
      }
    }
    throw err;
  }
}
