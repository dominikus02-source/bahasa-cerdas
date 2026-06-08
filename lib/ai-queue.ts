import { db } from "./db";
import cache from "./redis";
import type { Prisma } from "@prisma/client";

type JobType = "RPP" | "SOAL" | "PPT";

export async function createJob(
  userId: string,
  type: JobType,
  input: Record<string, unknown>
) {
  const job = await db.aIJob.create({
    data: {
      userId,
      type,
      status: "PENDING",
      input: input as Prisma.InputJsonValue,
    },
  });
  return job;
}

export async function getJob(jobId: string) {
  return db.aIJob.findUnique({ where: { id: jobId } });
}

export async function claimJob(type: JobType) {
  // Atomically claim the oldest PENDING job
  const jobs = await db.aIJob.findMany({
    where: { status: "PENDING", type },
    orderBy: { createdAt: "asc" },
    take: 1,
  });
  if (jobs.length === 0) return null;

  const [job] = await db.$transaction([
    db.aIJob.update({
      where: { id: jobs[0].id },
      data: { status: "PROCESSING" },
    }),
  ]);

  return job;
}

export async function completeJob(jobId: string, output: Record<string, unknown>) {
  await db.aIJob.update({
    where: { id: jobId },
    data: {
      status: "COMPLETED",
      output: output as Prisma.InputJsonValue,
    },
  });
}

export async function failJob(jobId: string, error: string) {
  await db.aIJob.update({
    where: { id: jobId },
    data: { status: "FAILED", error },
  });
}

export async function getJobStatus(jobId: string) {
  return db.aIJob.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, output: true, error: true, type: true },
  });
}

const CACHE_TTL = 300;

export async function invalidateLeagueCache(userId: string) {
  await Promise.all([
    cache.del(`league:peers:${userId}`),
    cache.del(`league:mingguan:top50`),
    cache.del(`league:harian:top50`),
    cache.delPattern(`league:*`),
  ]);
}

export async function invalidateKaryaCache(page?: number) {
  if (page) {
    await cache.del(`karya:feed:page:${page}`);
  } else {
    await cache.delPattern(`karya:*`);
  }
}

export async function invalidateUserKaryaCache(userId: string) {
  await cache.del(`karya:user:${userId}`);
}
