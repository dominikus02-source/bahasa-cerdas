import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { awardXp } from "@/lib/award-xp";
import { evaluateBadges, grantBadgeByCode } from "@/lib/gamification/badge-engine";
import { levelFromXp } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";
import { getXpValue } from "@/lib/gamification/xp-config";
import { ageGateSatisfied } from "@/lib/roblox/age-gate";
import {
  assessLinkCode,
  formatLinkCode,
  generateLinkCode,
  isIdempotencyKey,
  isRobloxUserId,
  normalizeLinkCode,
} from "@/lib/roblox/codes";
import {
  ROBLOX_XP_SOURCE,
  linkCodeTtlMs,
  questionSessionTtlMs,
  robloxAgeGate,
  robloxExperienceName,
  robloxExperienceUrl,
  robloxPlaceId,
  robloxUniverseId,
} from "@/lib/roblox/config";
import { RobloxServiceError } from "@/lib/roblox/errors";
import { decideRobloxXp, sanitizeBadgeCodes } from "@/lib/roblox/grading";
import { asRecord } from "@/lib/roblox/json";
import {
  clampQuestionCount,
  gradeRobloxAnswer,
  parseUnitQuestions,
  sampleQuestions,
  toPublicQuestion,
  type StoredRobloxQuestion,
} from "@/lib/roblox/questions";
import type { RobloxPageStatus, RobloxResultPayload } from "@/lib/roblox/types";

function optionalUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^[A-Za-z0-9_]{3,20}$/.test(trimmed) ? trimmed : null;
}

function optionalDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 40);
  return trimmed || null;
}

function displayNameOf(user: { nickname: string | null; fullName: string }): string {
  return (user.nickname || user.fullName).slice(0, 40);
}

export async function getRobloxPageStatus(userId: string): Promise<RobloxPageStatus> {
  const gate = robloxAgeGate();
  const now = new Date();
  const [link, attestation, code] = await Promise.all([
    db.robloxLink.findUnique({ where: { userId } }),
    db.robloxAgeAttestation.findUnique({ where: { userId } }),
    db.robloxLinkCode.findFirst({
      where: { userId, usedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    experienceName: robloxExperienceName(),
    experienceUrl: robloxExperienceUrl(),
    placeId: robloxPlaceId(),
    universeId: robloxUniverseId(),
    ageGate: {
      enabled: gate.enabled,
      minAge: gate.minAge,
      satisfied: ageGateSatisfied(attestation?.confirmedMinAge, gate),
    },
    link: link
      ? {
          robloxUserId: link.robloxUserId,
          robloxUsername: link.robloxUsername,
          robloxDisplayName: link.robloxDisplayName,
          linkedAt: link.linkedAt.toISOString(),
        }
      : null,
    code: code ? { display: formatLinkCode(code.code), expiresAt: code.expiresAt.toISOString() } : null,
  };
}

export async function issueRobloxLinkCode(
  userId: string,
  input: { confirmAge: boolean; regenerate: boolean },
): Promise<RobloxPageStatus> {
  const gate = robloxAgeGate();
  const linked = await db.robloxLink.findUnique({ where: { userId }, select: { id: true } });
  if (linked) {
    throw new RobloxServiceError(409, "ALREADY_LINKED", "Akun Roblox sudah tertaut. Putuskan tautan dulu untuk menautkan akun lain.");
  }

  const attestation = await db.robloxAgeAttestation.findUnique({ where: { userId } });
  const satisfied = ageGateSatisfied(attestation?.confirmedMinAge, gate);
  if (!satisfied && !input.confirmAge) {
    throw new RobloxServiceError(
      403,
      "AGE_CONFIRMATION_REQUIRED",
      `Konfirmasi bahwa kamu berusia ${gate.minAge} tahun atau lebih.`,
    );
  }
  if (input.confirmAge && gate.enabled) {
    const confirmedMinAge = Math.max(gate.minAge, attestation?.confirmedMinAge ?? 0);
    await db.robloxAgeAttestation.upsert({
      where: { userId },
      create: { userId, confirmedMinAge },
      update: { confirmedMinAge, confirmedAt: new Date() },
    });
  }

  const now = new Date();
  const current = await db.robloxLinkCode.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  if (current && !input.regenerate) return getRobloxPageStatus(userId);

  await db.robloxLinkCode.updateMany({
    where: { userId, usedAt: null },
    data: { expiresAt: now },
  });
  await db.robloxLinkCode.create({
    data: {
      userId,
      code: generateLinkCode(),
      expiresAt: new Date(now.getTime() + linkCodeTtlMs()),
    },
  });
  return getRobloxPageStatus(userId);
}

export async function confirmRobloxAge(userId: string): Promise<RobloxPageStatus> {
  const gate = robloxAgeGate();
  if (gate.enabled) {
    const attestation = await db.robloxAgeAttestation.findUnique({ where: { userId } });
    const confirmedMinAge = Math.max(gate.minAge, attestation?.confirmedMinAge ?? 0);
    await db.robloxAgeAttestation.upsert({
      where: { userId },
      create: { userId, confirmedMinAge },
      update: { confirmedMinAge, confirmedAt: new Date() },
    });
  }
  return getRobloxPageStatus(userId);
}

export async function revokeRobloxLink(userId: string): Promise<RobloxPageStatus> {
  const now = new Date();
  await db.$transaction(async (tx) => {
    const link = await tx.robloxLink.findUnique({ where: { userId } });
    if (link) {
      await tx.robloxLinkRevocation.create({
        data: {
          userId,
          robloxUserId: link.robloxUserId,
          robloxUsername: link.robloxUsername,
          linkedAt: link.linkedAt,
        },
      });
      await tx.robloxLink.delete({ where: { userId } });
    }
    await tx.robloxLinkCode.updateMany({
      where: { userId, usedAt: null },
      data: { expiresAt: now },
    });
  });
  return getRobloxPageStatus(userId);
}

export async function verifyAndBind(input: {
  code: string;
  robloxUserId: string;
  robloxUsername?: unknown;
  robloxDisplayName?: unknown;
}): Promise<{ linked: true; alreadyLinked: boolean }> {
  const code = normalizeLinkCode(input.code);
  if (!code) throw new RobloxServiceError(400, "INVALID_CODE", "Kode tidak dikenal.");
  if (!isRobloxUserId(input.robloxUserId)) {
    throw new RobloxServiceError(400, "INVALID_ROBLOX_USER", "userId Roblox tidak valid.");
  }
  const username = optionalUsername(input.robloxUsername);
  const displayName = optionalDisplayName(input.robloxDisplayName);

  try {
    return await db.$transaction(async (tx) => {
      const row = await tx.robloxLinkCode.findUnique({ where: { code } });
      const state = assessLinkCode(row, new Date());
      if (!row || state !== "valid") {
        const errorCode = state === "used" ? "CODE_USED" : state === "expired" ? "CODE_EXPIRED" : "INVALID_CODE";
        throw new RobloxServiceError(400, errorCode, "Kode tidak berlaku.");
      }

      const attestation = await tx.robloxAgeAttestation.findUnique({ where: { userId: row.userId } });
      if (!ageGateSatisfied(attestation?.confirmedMinAge)) {
        throw new RobloxServiceError(403, "AGE_GATE", "Pemain belum memenuhi batas usia.");
      }

      const byUser = await tx.robloxLink.findUnique({ where: { userId: row.userId } });
      const byRoblox = await tx.robloxLink.findUnique({ where: { robloxUserId: input.robloxUserId } });
      if (byUser && byUser.robloxUserId !== input.robloxUserId) {
        throw new RobloxServiceError(409, "ACCOUNT_ALREADY_LINKED", "Akun BahasaCerdas ini sudah tertaut ke Roblox lain.");
      }
      if (byRoblox && byRoblox.userId !== row.userId) {
        throw new RobloxServiceError(409, "ROBLOX_ALREADY_LINKED", "Akun Roblox ini sudah tertaut ke pemain lain.");
      }

      const claimed = await tx.robloxLinkCode.updateMany({
        where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date(), usedByRobloxUserId: input.robloxUserId },
      });
      if (claimed.count !== 1) throw new RobloxServiceError(409, "CODE_USED", "Kode sudah dipakai.");

      if (byUser) {
        await tx.robloxLink.update({
          where: { userId: row.userId },
          data: { robloxUsername: username, robloxDisplayName: displayName },
        });
        return { linked: true as const, alreadyLinked: true };
      }

      await tx.robloxLink.create({
        data: {
          userId: row.userId,
          robloxUserId: input.robloxUserId,
          robloxUsername: username,
          robloxDisplayName: displayName,
        },
      });
      return { linked: true as const, alreadyLinked: false };
    });
  } catch (error) {
    if (error instanceof RobloxServiceError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new RobloxServiceError(409, "LINK_CONFLICT", "Akun ini sudah tertaut.");
    }
    throw error;
  }
}

type PlayableLink = {
  userId: string;
  robloxUserId: string;
  robloxUsername: string | null;
  user: { nickname: string | null; fullName: string; xp: number };
};

async function requirePlayableLink(robloxUserId: string): Promise<PlayableLink> {
  if (!isRobloxUserId(robloxUserId)) {
    throw new RobloxServiceError(400, "INVALID_ROBLOX_USER", "userId Roblox tidak valid.");
  }
  const link = await db.robloxLink.findUnique({
    where: { robloxUserId },
    include: { user: { select: { nickname: true, fullName: true, xp: true } } },
  });
  if (!link) throw new RobloxServiceError(403, "NOT_LINKED", "Akun Roblox belum tertaut.");
  const attestation = await db.robloxAgeAttestation.findUnique({ where: { userId: link.userId } });
  if (!ageGateSatisfied(attestation?.confirmedMinAge)) {
    throw new RobloxServiceError(403, "AGE_GATE", "Pemain belum memenuhi batas usia.");
  }
  return link;
}

export async function getRobloxSession(robloxUserId: string) {
  if (!isRobloxUserId(robloxUserId)) {
    throw new RobloxServiceError(400, "INVALID_ROBLOX_USER", "userId Roblox tidak valid.");
  }
  const link = await db.robloxLink.findUnique({
    where: { robloxUserId },
    include: { user: { select: { nickname: true, fullName: true, xp: true } } },
  });
  if (!link) return { linked: false as const };
  const attestation = await db.robloxAgeAttestation.findUnique({ where: { userId: link.userId } });
  if (!ageGateSatisfied(attestation?.confirmedMinAge)) {
    return { linked: true as const, ageAllowed: false as const };
  }
  const level = levelFromXp(link.user.xp);
  return {
    linked: true as const,
    ageAllowed: true as const,
    displayName: displayNameOf(link.user),
    level,
    xp: link.user.xp,
    rank: rankFromLevel(level),
    robloxUserId: link.robloxUserId,
    robloxUsername: link.robloxUsername,
  };
}

async function questionPool(input: { level?: number; unitId?: string }) {
  if (input.unitId) {
    const unit = await db.learningUnit.findFirst({
      where: { id: input.unitId, isActive: true, level: { type: "JALUR" } },
      select: { id: true, title: true, content: true, level: { select: { level: true } } },
    });
    if (!unit) return null;
    const questions = parseUnitQuestions(unit.content);
    if (questions.length === 0) return null;
    return { level: unit.level.level, unitId: unit.id, unitTitle: unit.title, questions };
  }

  const levelRow = await db.learningLevel.findFirst({
    where: { type: "JALUR", level: input.level },
    select: {
      level: true,
      units: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: { id: true, title: true, content: true },
      },
    },
  });
  if (!levelRow) return null;
  const questions: StoredRobloxQuestion[] = [];
  let unitId = "";
  let unitTitle = "";
  for (const unit of levelRow.units) {
    const parsed = parseUnitQuestions(unit.content);
    if (parsed.length === 0) continue;
    if (!unitId) {
      unitId = unit.id;
      unitTitle = unit.title;
    }
    for (const question of parsed) {
      if (!questions.some((item) => item.id === question.id)) questions.push(question);
    }
  }
  if (!unitId || questions.length === 0) return null;
  return { level: levelRow.level, unitId, unitTitle, questions };
}

export async function createRobloxQuestionSession(input: {
  robloxUserId: string;
  level?: number;
  unitId?: string;
  count?: unknown;
}) {
  const unitId = input.unitId?.trim() || "";
  const level = input.level;
  if (unitId && !/^[a-zA-Z0-9_-]{8,40}$/.test(unitId)) {
    throw new RobloxServiceError(400, "INVALID_UNIT", "unitId tidak valid.");
  }
  if (!unitId && (typeof level !== "number" || !Number.isInteger(level) || level < 1 || level > 30)) {
    throw new RobloxServiceError(400, "MISSING_TARGET", "Sertakan level atau unitId.");
  }
  const link = await requirePlayableLink(input.robloxUserId);
  const pool = await questionPool({ level, unitId: unitId || undefined });
  if (!pool) throw new RobloxServiceError(404, "NO_QUESTIONS", "Soal untuk level atau unit itu tidak ada.");
  const sampled = sampleQuestions(pool.questions, clampQuestionCount(input.count));
  const session = await db.robloxPlaySession.create({
    data: {
      userId: link.userId,
      robloxUserId: link.robloxUserId,
      level: pool.level,
      unitId: pool.unitId,
      unitTitle: pool.unitTitle.slice(0, 160),
      answerKey: sampled,
      questionCount: sampled.length,
      expiresAt: new Date(Date.now() + questionSessionTtlMs()),
    },
  });
  return {
    sessionId: session.id,
    expiresAt: session.expiresAt.toISOString(),
    level: pool.level,
    unitId: pool.unitId,
    unitTitle: pool.unitTitle,
    questions: sampled.map(toPublicQuestion),
  };
}

function readStoredQuestions(value: Prisma.JsonValue): StoredRobloxQuestion[] {
  if (!Array.isArray(value)) return [];
  const questions: StoredRobloxQuestion[] = [];
  for (const item of value) {
    const row = asRecord(item);
    if (!row || typeof row.id !== "string") continue;
    if (typeof row.jawaban !== "string" && typeof row.jawaban !== "number") continue;
    const options = Array.isArray(row.options)
      ? row.options.filter((option): option is string => typeof option === "string")
      : [];
    questions.push({
      id: row.id,
      type: typeof row.type === "string" ? row.type : "pilihan_ganda",
      prompt: typeof row.prompt === "string" ? row.prompt : "",
      options,
      jawaban: row.jawaban,
      explanation: typeof row.explanation === "string" ? row.explanation : null,
    });
  }
  return questions;
}

function readAnswers(value: unknown): Map<string, unknown> | null {
  if (!Array.isArray(value)) return null;
  const answers = new Map<string, unknown>();
  for (const item of value.slice(0, 20)) {
    const row = asRecord(item);
    if (!row || typeof row.questionId !== "string") continue;
    if (typeof row.answer !== "string" && typeof row.answer !== "number" && typeof row.answer !== "boolean") continue;
    answers.set(row.questionId, row.answer);
  }
  return answers;
}

function asStoredResult(value: Prisma.JsonValue, sessionId: string): RobloxResultPayload | null {
  const row = asRecord(value);
  if (!row || typeof row.correct !== "number" || typeof row.total !== "number") return null;
  const feedback = Array.isArray(row.feedback)
    ? row.feedback.flatMap((item) => {
        const entry = asRecord(item);
        if (!entry || typeof entry.questionId !== "string" || typeof entry.correct !== "boolean") return [];
        return [{
          questionId: entry.questionId,
          correct: entry.correct,
          explanation: typeof entry.explanation === "string" ? entry.explanation : null,
        }];
      })
    : [];
  return {
    sessionId,
    correct: row.correct,
    total: row.total,
    score: typeof row.score === "number" ? row.score : 0,
    xp: typeof row.xp === "number" ? row.xp : 0,
    alreadyRewarded: true,
    replay: true,
    totalXp: typeof row.totalXp === "number" ? row.totalXp : 0,
    level: typeof row.level === "number" ? row.level : 1,
    rank: typeof row.rank === "string" ? row.rank : "BRONZE",
    badgesAwarded: Array.isArray(row.badgesAwarded)
      ? row.badgesAwarded.filter((code): code is string => typeof code === "string")
      : [],
    feedback,
  };
}

async function collectNewBadges(userId: string, codes: string[]): Promise<string[]> {
  const beforeRows = await db.userBadge.findMany({
    where: { userId },
    select: { badge: { select: { code: true } } },
  });
  const before = new Set(beforeRows.map((row) => row.badge.code));
  await evaluateBadges(userId);
  for (const code of codes) {
    await grantBadgeByCode(userId, code);
  }
  const afterRows = await db.userBadge.findMany({
    where: { userId },
    select: { badge: { select: { code: true } } },
  });
  return afterRows.map((row) => row.badge.code).filter((code) => !before.has(code));
}

async function grantSessionXp(userId: string, sessionId: string, correct: number, total: number, badgeCodes: string[]) {
  const decision = decideRobloxXp({
    sessionId,
    sessionConsumed: false,
    sessionKey: null,
    requestKey: sessionId,
    correct,
    total,
    baseXp: getXpValue("ROBLOX"),
  });
  if (decision.kind !== "award") {
    throw new RobloxServiceError(409, "XP_CONFLICT", "XP sesi ini tidak bisa diberikan.");
  }

  let xp = 0;
  let alreadyRewarded = false;
  let totalXp = 0;
  let level = 1;
  let rank = "BRONZE";
  if (decision.xp > 0) {
    const hasil = await awardXp(userId, ROBLOX_XP_SOURCE, decision.xp, decision.reference);
    totalXp = hasil.totalXp;
    level = hasil.levelBaru;
    rank = hasil.rank;
    if (hasil.xpDiberikan > 0) {
      xp = hasil.xpDiberikan;
    } else {
      alreadyRewarded = true;
      const existing = await db.xPTransaction.findUnique({
        where: { userId_source_reference: { userId, source: ROBLOX_XP_SOURCE, reference: decision.reference } },
        select: { amount: true },
      });
      xp = existing?.amount ?? 0;
    }
  } else {
    const user = await db.user.findUnique({ where: { id: userId }, select: { xp: true } });
    totalXp = user?.xp ?? 0;
    level = levelFromXp(totalXp);
    rank = rankFromLevel(level);
  }

  let badgesAwarded: string[] = [];
  try {
    badgesAwarded = await collectNewBadges(userId, badgeCodes);
  } catch {
    badgesAwarded = [];
  }

  return { xp, alreadyRewarded, totalXp, level, rank, badgesAwarded, reference: decision.reference };
}

export async function submitRobloxResults(input: {
  robloxUserId: string;
  sessionId: string;
  idempotencyKey: unknown;
  answers: unknown;
  badgeCodes?: unknown;
}): Promise<RobloxResultPayload> {
  if (typeof input.sessionId !== "string" || input.sessionId.length < 8 || input.sessionId.length > 40) {
    throw new RobloxServiceError(400, "INVALID_SESSION", "Sesi tidak valid.");
  }
  if (!isIdempotencyKey(input.idempotencyKey)) {
    throw new RobloxServiceError(400, "INVALID_IDEMPOTENCY_KEY", "Kunci idempotensi tidak valid.");
  }
  const answers = readAnswers(input.answers);
  if (!answers) throw new RobloxServiceError(400, "INVALID_ANSWERS", "Jawaban harus berupa daftar.");

  const link = await requirePlayableLink(input.robloxUserId);
  const session = await db.robloxPlaySession.findFirst({
    where: { id: input.sessionId, robloxUserId: link.robloxUserId, userId: link.userId },
  });
  if (!session) throw new RobloxServiceError(404, "SESSION_NOT_FOUND", "Sesi tidak ditemukan.");

  if (session.consumedAt) {
    if (session.idempotencyKey !== input.idempotencyKey) {
      throw new RobloxServiceError(409, "SESSION_CONSUMED", "Sesi ini sudah dinilai dengan kiriman lain.");
    }
    const stored = session.result ? asStoredResult(session.result, session.id) : null;
    if (stored) return stored;
  } else if (session.expiresAt.getTime() <= Date.now()) {
    throw new RobloxServiceError(410, "SESSION_EXPIRED", "Sesi soal sudah berakhir. Ambil soal baru.");
  } else {
    const claimed = await db.robloxPlaySession.updateMany({
      where: { id: session.id, consumedAt: null },
      data: { consumedAt: new Date(), idempotencyKey: input.idempotencyKey },
    });
    if (claimed.count !== 1) {
      const latest = await db.robloxPlaySession.findUnique({ where: { id: session.id } });
      if (!latest || latest.idempotencyKey !== input.idempotencyKey) {
        throw new RobloxServiceError(409, "SESSION_CONSUMED", "Sesi ini sudah dinilai dengan kiriman lain.");
      }
      const stored = latest.result ? asStoredResult(latest.result, latest.id) : null;
      if (stored) return stored;
    }
  }

  const questions = readStoredQuestions(session.answerKey);
  const feedback = questions.map((question) => ({
    questionId: question.id,
    correct: gradeRobloxAnswer(question.jawaban, answers.get(question.id), question.options),
    explanation: question.explanation,
  }));
  const correct = feedback.filter((item) => item.correct).length;
  const total = questions.length;
  const granted = await grantSessionXp(link.userId, session.id, correct, total, sanitizeBadgeCodes(input.badgeCodes));
  const result: RobloxResultPayload = {
    sessionId: session.id,
    correct,
    total,
    score: total > 0 ? Math.round((correct / total) * 100) : 0,
    xp: granted.xp,
    alreadyRewarded: granted.alreadyRewarded,
    replay: false,
    totalXp: granted.totalXp,
    level: granted.level,
    rank: granted.rank,
    badgesAwarded: granted.badgesAwarded,
    feedback,
  };
  await db.robloxPlaySession.update({
    where: { id: session.id },
    data: { result },
  });
  return result;
}

export async function awardRobloxBadges(robloxUserId: string, badgeCodes: unknown) {
  const link = await requirePlayableLink(robloxUserId);
  const codes = sanitizeBadgeCodes(badgeCodes);
  let awarded: string[] = [];
  try {
    awarded = await collectNewBadges(link.userId, codes);
  } catch {
    awarded = [];
  }
  return { evaluated: true, badgesAwarded: awarded };
}
