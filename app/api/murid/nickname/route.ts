import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import cache from "@/lib/redis";
import {
  validateNicknameFormat,
  isImpersonatingTeacher,
  nicknameRateLimitDaysLeft,
  normalizeNickname,
} from "@/lib/nickname";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const history = await db.nicknameHistory.findMany({
    where: { userId: user.id },
    orderBy: { changedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    nickname: user.nickname,
    nicknameUpdatedAt: user.nicknameUpdatedAt,
    daysLeftForChange: nicknameRateLimitDaysLeft(user.nicknameUpdatedAt),
    history,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "MURID" && !user.isFounder) {
    return NextResponse.json({ error: "Fitur ini khusus akun murid" }, { status: 403 });
  }

  let body: { nickname?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Data tidak valid", code: "BAD_REQUEST" }, { status: 400 });
  }

  const raw = (body.nickname ?? "").trim();
  const isReset = raw.length === 0;
  const currentValue = user.nickname?.trim() || "";

  if (isReset ? currentValue === "" : normalizeNickname(raw) === currentValue) {
    return NextResponse.json({ nickname: user.nickname, nicknameUpdatedAt: user.nicknameUpdatedAt });
  }

  let value: string | null = null;
  if (!isReset) {
    const formatCheck = validateNicknameFormat(raw);
    if (!formatCheck.ok) {
      return NextResponse.json({ error: formatCheck.reason, code: formatCheck.code }, { status: 400 });
    }
    value = formatCheck.value;
  }

  const daysLeft = nicknameRateLimitDaysLeft(user.nicknameUpdatedAt);
  if (daysLeft > 0) {
    return NextResponse.json(
      { error: `Nama panggilan hanya bisa diganti tiap 30 hari. Coba lagi dalam ${daysLeft} hari.`, code: "RATE_LIMIT", daysLeft },
      { status: 400 }
    );
  }

  if (value) {
    const memberships = await db.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);

    if (groupIds.length > 0) {
      const [groups, classmates] = await Promise.all([
        db.group.findMany({ where: { id: { in: groupIds } }, select: { teacher: { select: { fullName: true } } } }),
        db.groupMember.findMany({
          where: { groupId: { in: groupIds }, userId: { not: user.id } },
          select: { user: { select: { nickname: true } } },
        }),
      ]);

      const teacherNames = groups.map((g) => g.teacher.fullName);
      if (isImpersonatingTeacher(value, teacherNames)) {
        return NextResponse.json(
          { error: "Nama panggilan ini menyerupai nama guru di kelasmu.", code: "IMPERSONATION" },
          { status: 400 }
        );
      }

      const lower = value.toLowerCase();
      const taken = classmates.some((c) => c.user.nickname?.trim().toLowerCase() === lower);
      if (taken) {
        return NextResponse.json(
          { error: "Nama panggilan ini sudah dipakai teman sekelasmu. Coba yang lain.", code: "TAKEN_IN_CLASS" },
          { status: 400 }
        );
      }
    }
  }

  const now = new Date();
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { nickname: value, nicknameUpdatedAt: now } }),
    db.nicknameHistory.create({
      data: { userId: user.id, oldNickname: user.nickname, newNickname: value },
    }),
  ]);

  cache.del(`user:me:${user.email.toLowerCase()}`).catch(() => {});

  return NextResponse.json({ nickname: value, nicknameUpdatedAt: now });
}
