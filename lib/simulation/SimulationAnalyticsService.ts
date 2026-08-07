/**
 * SimulationAnalyticsService — SINGLE SOURCE OF TRUTH (SSOT) untuk Pusat
 * Evaluasi Pembelajaran (UKBI/TKA).
 *
 * Semua halaman guru — /guru/hasil-simulasi (dashboard evaluasi),
 * /guru/tinjau-simulasi (AI Review Center), /guru/dokumen-latihan
 * (Repository Pembelajaran) — WAJIB membaca data dari layanan ini agar
 * statistik, status pipeline, dan AI Summary konsisten di semua permukaan.
 *
 * Prinsip:
 * 1. Reuse WAJIB: TeacherStudentService (lib/teacher/students.ts),
 *    gradeConstructed() (lib/penilaian/ai-grade.ts), acquireAiSlot
 *    (lib/ai-concurrency.ts), awardGuruXp/notifyGuruMurid
 *    (lib/gamification/teacher-xp.ts), logUsage (src/ai/core/usage-logger.ts),
 *    Redis cache (lib/redis.ts). TIDAK ada engine AI baru.
 * 2. Additive-only: tidak menghapus/memodifikasi route/API lama.
 * 3. Best-effort: AI Summary/Insight gagal → fallback rule-based, tidak
 *    menggagalkan halaman.
 */
import { db } from "@/lib/db";
import cache from "@/lib/redis";
import { getTeacherGroups, getTeacherStudents, getTeacherStudentIds } from "@/lib/teacher/students";
import { isTeacherOrStudent } from "@/lib/teacher/students";
import { gradeConstructed } from "@/lib/penilaian/ai-grade";
import { acquireAiSlot } from "@/lib/ai-concurrency";
import { awardGuruXp, notifyGuruMurid } from "@/lib/gamification/teacher-xp";
import { logLegacyUsage } from "@/src/ai/core/usage-logger";
import { getDefaultModel, callWithFallback } from "@/src/ai/core/provider";

export { isTeacherOrStudent };

// ────────────────────────────────────────────────────────────
// Tipe & Konstanta
// ────────────────────────────────────────────────────────────

export type SimJenis = "SEMUA" | "UKBI" | "TKA";

export type SimStatus =
  | "BELUM_DIKERJAKAN"
  | "SEDANG_DIKERJAKAN"
  | "MENUNGGU_PENILAIAN_AI"
  | "AI_SELESAI_MENILAI"
  | "MENUNGGU_PERSETUJUAN_GURU"
  | "SELESAI";

export const SIM_STATUS_META: Record<SimStatus, { label: string; color: string; icon: string }> = {
  BELUM_DIKERJAKAN: { label: "Belum Dikerjakan", color: "bg-slate-100 text-slate-600", icon: "⏳" },
  SEDANG_DIKERJAKAN: { label: "Sedang Dikerjakan", color: "bg-blue-100 text-blue-700", icon: "✍️" },
  MENUNGGU_PENILAIAN_AI: { label: "Menunggu Penilaian AI", color: "bg-amber-100 text-amber-700", icon: "🤖" },
  AI_SELESAI_MENILAI: { label: "AI Selesai Menilai", color: "bg-cyan-100 text-cyan-700", icon: "✅" },
  MENUNGGU_PERSETUJUAN_GURU: { label: "Menunggu Persetujuan Guru", color: "bg-violet-100 text-violet-700", icon: "🖋️" },
  SELESAI: { label: "Selesai", color: "bg-emerald-100 text-emerald-700", icon: "🏁" },
};

export const SIM_STATUS_ORDER: SimStatus[] = [
  "BELUM_DIKERJAKAN",
  "SEDANG_DIKERJAKAN",
  "MENUNGGU_PENILAIAN_AI",
  "AI_SELESAI_MENILAI",
  "MENUNGGU_PERSETUJUAN_GURU",
  "SELESAI",
];

export const WRITING_DIMENSIONS = [
  "struktur",
  "tataBahasa",
  "ejaan",
  "koherensi",
  "kohesi",
  "pilihanKata",
  "orisinalitas",
] as const;

export const SPEAKING_DIMENSIONS = [
  "kelancaran",
  "pelafalan",
  "kosakata",
  "kejelasan",
  "grammar",
] as const;

/** Confidence: ≥90 hijau, 70–89 kuning, <70 merah. */
export function confidenceLevel(c?: number | null): "tinggi" | "sedang" | "rendah" {
  if (c == null) return "rendah";
  if (c >= 90) return "tinggi";
  if (c >= 70) return "sedang";
  return "rendah";
}

export function confidenceColor(c?: number | null): string {
  const lvl = confidenceLevel(c);
  if (lvl === "tinggi") return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (lvl === "sedang") return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-rose-600 bg-rose-50 border-rose-200";
}

export interface SimulationFilter {
  groupId?: string;
  /** Filter seksi (untuk review center): "MENULIS" | "BERBICARA" */
  seksi?: "MENULIS" | "BERBICARA";
  /** YYYY-MM-DD (dibandingkan terhadap finishedAt/startedAt, zona WIB +07:00) */
  from?: string;
  to?: string;
  jenis?: SimJenis;
  status?: SimStatus;
  search?: string;
  page?: number;
  limit?: number;
}

interface Pkg { id: string; title: string; type: string; [k: string]: unknown }

// ────────────────────────────────────────────────────────────
// Helper waktu (WIB = UTC+7)
// ────────────────────────────────────────────────────────────

export function startOfTodayWIB(): Date {
  const now = new Date();
  const offset = now.getTimezoneOffset(); // menit (local = server)
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

export function toWIBStart(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  const d = new Date(`${dateStr}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export function toWIBEnd(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  const d = new Date(`${dateStr}T23:59:59.999+07:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function isInRange(dt: Date | null | undefined, from?: string, to?: string): boolean {
  if (!dt) return false;
  const t = dt.getTime();
  const f = toWIBStart(from);
  const e = toWIBEnd(to);
  if (f && t < f.getTime()) return false;
  if (e && t > e.getTime()) return false;
  return true;
}

function matchesJenis(pkgType: string, jenis?: SimJenis): boolean {
  if (!jenis || jenis === "SEMUA") return true;
  const upper = pkgType.toUpperCase();
  if (jenis === "UKBI") return upper.includes("UKBI");
  return upper.includes("TKA");
}

function normalizeSearch(s?: string): string {
  return (s || "").trim().toLowerCase();
}

// ────────────────────────────────────────────────────────────
// Status pipeline per attempt
// ────────────────────────────────────────────────────────────

interface AttemptLike {
  status: string;
  sectionScores: unknown;
  startedAt: Date | null;
  finishedAt: Date | null;
}

/**
 * Resolve status pipeline satu attempt (ProgresKompetensi + TestAnswer rows).
 * - BELUM_DIKERJAKAN  : session NOT_STARTED (tidak ada progres COMPLETED/IN_PROGRESS)
 * - SEDANG_DIKERJAKAN : session IN_PROGRESS
 * - MENUNGGU_PENILAIAN_AI : COMPLETED, ada pendingReview > 0 (jawaban konstruktif
 *   belum dinilai AI)
 * - AI_SELESAI_MENILAI : COMPLETED, konstruktif sudah dinilai AI (tak ada pending),
 *   tapi belum ada persetujuan guru
 * - MENUNGGU_PERSETUJUAN_GURU : sebagian konstruktif sudah disetujui, belum semua
 * - SELESAI : tidak ada jawaban konstruktif ATAU semua sudah disetujui guru
 */
export function resolveAttemptStatus(
  attempt: AttemptLike | null | undefined,
  constructedAnswers: Array<{ reviewStatus?: string | null; aiReviewedAt?: Date | null; isCorrect?: boolean | null }>
): SimStatus {
  if (!attempt || attempt.status === "NOT_STARTED") return "BELUM_DIKERJAKAN";
  if (attempt.status === "IN_PROGRESS") return "SEDANG_DIKERJAKAN";

  const pending = getPendingReviewCount(attempt.sectionScores);
  if (pending > 0) return "MENUNGGU_PENILAIAN_AI";

  const cons = constructedAnswers || [];
  if (cons.length === 0) return "SELESAI";

  const approved = cons.filter((a) => a.reviewStatus === "APPROVED").length;
  if (approved === cons.length) return "SELESAI";
  if (approved > 0) return "MENUNGGU_PERSETUJUAN_GURU";
  return "AI_SELESAI_MENILAI";
}

export function getPendingReviewCount(sectionScores: unknown): number {
  try {
    const ss = sectionScores as Record<string, { pendingReview?: number }>;
    if (!ss) return 0;
    let n = 0;
    for (const v of Object.values(ss)) n += Number(v?.pendingReview || 0);
    return n;
  } catch {
    return 0;
  }
}

// ────────────────────────────────────────────────────────────
// Statistik per seksi (untuk AI temuan & insight)
// ────────────────────────────────────────────────────────────

export interface SeksiStat { seksi: string; avg: number; count: number }

export function aggregateSeksiStats(attempts: Array<{ sectionScores: unknown }>): SeksiStat[] {
  const agg: Record<string, { sum: number; n: number }> = {};
  for (const a of attempts) {
    try {
      const ss = a.sectionScores as Record<string, { score?: number }>;
      if (!ss) continue;
      for (const [k, v] of Object.entries(ss)) {
        const sc = Number(v?.score);
        if (!Number.isNaN(sc)) {
          agg[k] ??= { sum: 0, n: 0 };
          agg[k].sum += sc;
          agg[k].n += 1;
        }
      }
    } catch { /* skip */ }
  }
  return Object.entries(agg)
    .map(([seksi, v]) => ({ seksi, avg: v.n > 0 ? Math.round(v.sum / v.n) : 0, count: v.n }))
    .sort((a, b) => a.avg - b.avg);
}

// ────────────────────────────────────────────────────────────
// Layanan inti
// ────────────────────────────────────────────────────────────

export interface SimRow {
  userId: string;
  userName: string;
  groupId: string;
  groupName: string;
  paketId: string;
  paketTitle: string;
  paketType: string;
  attemptNumber: number;
  status: SimStatus;
  score: number;
  percentage: number;
  predikat: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  pendingReview: number;
  constructedCount: number;
  approvedCount: number;
  aiSummary: string | null;
  hasCert: boolean;
}

export interface SimStats {
  hariIni: { mengikuti: number; selesai: number; belumSelesai: number };
  rataRata: number;
  selesaiCount: number;
  totalAttempts: number;
  aiTemuan: { jumlah: number; seksi: string } | null;
  siapUKBI: number;
  perluPendampingan: number;
  statusCounts: Record<SimStatus, number>;
  seksiStats: SeksiStat[];
}

export interface SimRekapResult {
  stats: SimStats;
  rows: SimRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  groups: Array<{ id: string; name: string; memberCount: number }>;
}

/**
 * Data dashboard Pusat Evaluasi + tabel hasil (SSOT).
 * Semua filter: Kelas → Tanggal → Jenis → Status → Cari Murid (server-side).
 */
export async function getSimulationRekap(teacherId: string, filter: SimulationFilter = {}): Promise<SimRekapResult> {
  const { groupId, jenis, status, search, from, to } = filter;
  const page = Math.max(1, filter.page || 1);
  const limit = Math.min(100, Math.max(1, filter.limit || 20));
  const q = normalizeSearch(search);

  const groups = await getTeacherGroups(teacherId);
  const memberIdsByGroup = new Map<string, string[]>();
  const allStudentIds = new Set<string>();
  for (const g of groups) {
    const ids = g.members.map((m) => m.userId);
    memberIdsByGroup.set(g.id, ids);
    ids.forEach((id) => allStudentIds.add(id));
  }

  let studentIds = [...allStudentIds];
  if (groupId) {
    const ids = memberIdsByGroup.get(groupId) || [];
    studentIds = ids;
  }
  if (studentIds.length === 0) return emptyRekap(groups, page, limit);
  if (q) {
    const users = await db.user.findMany({ where: { id: { in: studentIds } }, select: { id: true, fullName: true } });
    studentIds = users.filter((u) => (u.fullName || "").toLowerCase().includes(q)).map((u) => u.id);
    if (studentIds.length === 0) return emptyRekap(groups, page, limit);
  }

  // latest attempt per (user, paket)
  const progres = await db.progresKompetensi.findMany({
    where: {
      userId: { in: studentIds },
      status: { in: ["IN_PROGRESS", "COMPLETED"] },
      ...(from || to ? {} : {}),
    },
    include: {
      paket: { select: { id: true, title: true, type: true } },
      user: { select: { id: true, fullName: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  const latest = new Map<string, (typeof progres)[number]>();
  for (const p of progres) {
    const key = `${p.userId}|${p.paketId}`;
    const cur = latest.get(key);
    if (!cur || !cur.startedAt || (p.startedAt && p.startedAt > cur.startedAt)) latest.set(key, p);
  }

  let attempts = [...latest.values()];
  attempts = attempts.filter((p) => matchesJenis(p.paket.type, jenis));
  attempts = attempts.filter((p) => {
    if (from || to) {
      const dt = p.finishedAt || p.startedAt;
      return isInRange(dt, from, to);
    }
    return true;
  });

  // status pipeline (perlu constructed answers per attempt)
  const answerIds = attempts.map((p) => p.id);
  const consRows = await db.testAnswer.findMany({
    where: { paketId: { in: [...new Set(attempts.map((p) => p.paketId))] }, userId: { in: studentIds } },
    select: { id: true, userId: true, paketId: true, reviewStatus: true, aiReviewedAt: true, isCorrect: true },
  });
  const consByKey = new Map<string, typeof consRows>();
  for (const a of consRows) {
    const key = `${a.userId}|${a.paketId}`;
    consByKey.set(key, [...(consByKey.get(key) || []), a]);
  }

  const certs = await db.kompetensiCertificate.findMany({
    where: { userId: { in: studentIds } },
    select: { userId: true, paketId: true, progresId: true },
  });
  const certKey = new Set(certs.map((c) => `${c.userId}|${c.paketId}`));

  const userIdToGroup = new Map<string, { id: string; name: string }>();
  for (const g of groups) {
    for (const m of g.members) {
      if (!userIdToGroup.has(m.userId)) userIdToGroup.set(m.userId, { id: g.id, name: g.name });
    }
  }

  let rows: SimRow[] = attempts.map((p) => {
    const cons = consByKey.get(`${p.userId}|${p.paketId}`) || [];
    const pending = getPendingReviewCount(p.sectionScores);
    const approvedCount = cons.filter((a) => a.reviewStatus === "APPROVED").length;
    const st = resolveAttemptStatus(p, cons);
    const g = userIdToGroup.get(p.userId) || { id: "", name: "-" };
    return {
      userId: p.userId,
      userName: p.user.fullName,
      groupId: g.id,
      groupName: g.name,
      paketId: p.paketId,
      paketTitle: p.paket.title,
      paketType: p.paket.type,
      attemptNumber: p.attemptNumber,
      status: st,
      score: p.totalScore ?? 0,
      percentage: p.percentage ?? 0,
      predikat: p.predikat,
      startedAt: p.startedAt?.toISOString() || null,
      finishedAt: p.finishedAt?.toISOString() || null,
      pendingReview: pending,
      constructedCount: cons.length,
      approvedCount,
      aiSummary: null,
      hasCert: certKey.has(`${p.userId}|${p.paketId}`),
    };
  });

  if (status) rows = rows.filter((r) => r.status === status);
  rows.sort((a, b) => (b.finishedAt || b.startedAt || "").localeCompare(a.finishedAt || a.startedAt || ""));

  // stats
  const statusCounts: Record<SimStatus, number> = {
    BELUM_DIKERJAKAN: 0, SEDANG_DIKERJAKAN: 0, MENUNGGU_PENILAIAN_AI: 0,
    AI_SELESAI_MENILAI: 0, MENUNGGU_PERSETUJUAN_GURU: 0, SELESAI: 0,
  };
  for (const r of rows) statusCounts[r.status] += 1;

  const completed = attempts.filter((p) => p.status === "COMPLETED");
  const selesaiAvg = completed.length > 0
    ? Math.round(completed.reduce((s, p) => s + (p.percentage || 0), 0) / completed.length)
    : 0;

  const today = startOfTodayWIB();
  const todayAttempts = attempts.filter((p) => {
    const dt = p.finishedAt || p.startedAt;
    return dt && dt >= today;
  });
  const todaySelesai = todayAttempts.filter((p) => p.status === "COMPLETED").length;
  const todayMengikuti = todayAttempts.filter((p) => p.status !== "NOT_STARTED").length;

  const seksiStats = aggregateSeksiStats(completed);
  const aiTemuan = seksiStats.find((s) => s.count >= 1 && s.avg < 70) || null;
  const weakStudents = new Set<string>();
  if (aiTemuan) {
    for (const p of completed) {
      try {
        const ss = p.sectionScores as Record<string, { score?: number }>;
        const sc = Number(ss?.[aiTemuan.seksi]?.score);
        if (!Number.isNaN(sc) && sc < 70) weakStudents.add(p.userId);
      } catch { /* skip */ }
    }
  }
  const siapUKBI = completed.filter((p) => (p.percentage || 0) >= 80 && matchesJenis(p.paket.type, "UKBI")).length;
  const perluPendampingan = completed.filter((p) => (p.percentage || 0) < 60).length;

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paged = rows.slice((page - 1) * limit, page * limit);

  return {
    stats: {
      hariIni: { mengikuti: todayMengikuti, selesai: todaySelesai, belumSelesai: Math.max(0, todayMengikuti - todaySelesai) },
      rataRata: selesaiAvg,
      selesaiCount: completed.length,
      totalAttempts: attempts.length,
      aiTemuan: aiTemuan ? { jumlah: weakStudents.size, seksi: aiTemuan.seksi } : null,
      siapUKBI,
      perluPendampingan,
      statusCounts,
      seksiStats,
    },
    rows: paged,
    page, limit, total, totalPages,
    groups: groups.map((g) => ({ id: g.id, name: g.name, memberCount: g.memberCount })),
  };
}

function emptyRekap(groups: Awaited<ReturnType<typeof getTeacherGroups>>, page: number, limit: number): SimRekapResult {
  return {
    stats: {
      hariIni: { mengikuti: 0, selesai: 0, belumSelesai: 0 },
      rataRata: 0, selesaiCount: 0, totalAttempts: 0, aiTemuan: null,
      siapUKBI: 0, perluPendampingan: 0,
      statusCounts: { BELUM_DIKERJAKAN: 0, SEDANG_DIKERJAKAN: 0, MENUNGGU_PENILAIAN_AI: 0, AI_SELESAI_MENILAI: 0, MENUNGGU_PERSETUJUAN_GURU: 0, SELESAI: 0 },
      seksiStats: [],
    },
    rows: [], page, limit, total: 0, totalPages: 1,
    groups: groups.map((g) => ({ id: g.id, name: g.name, memberCount: g.memberCount })),
  };
}

// ────────────────────────────────────────────────────────────
// AI Class Summary (cached Redis 10 menit)
// ────────────────────────────────────────────────────────────

export interface ClassSummary {
  summary: string;
  ai: boolean;
  generatedAt: string;
  data: {
    groupName: string;
    totalMurid: number;
    selesai: number;
    rataRata: number;
    seksiTersulit: string | null;
    jumlahLemah: number;
    seksiTerbaik: string | null;
    rekomendasi: string;
  };
}

/** Summary AI per kelas (fallback rule-based bila AI gagal / belum diatur). */
export async function getClassSummary(teacherId: string, groupId: string): Promise<ClassSummary | null> {
  const group = await db.group.findFirst({ where: { id: groupId, teacherId, isActive: true }, select: { id: true, name: true } });
  if (!group) return null;

  const cacheKey = `simulasi:summary:${teacherId}:${groupId}`;
  const cached = await cache.get<ClassSummary>(cacheKey);
  if (cached) return cached;

  const memberIds = await db.groupMember.findMany({ where: { groupId }, select: { userId: true } });
  const ids = memberIds.map((m) => m.userId);
  const completed = await db.progresKompetensi.findMany({
    where: { userId: { in: ids }, status: "COMPLETED" },
    select: { userId: true, paketId: true, percentage: true, sectionScores: true, finishedAt: true },
  });
  const latest = new Map<string, (typeof completed)[number]>();
  for (const p of completed) {
    const key = `${p.userId}|${p.paketId}`;
    const cur = latest.get(key);
    if (!cur || (p.finishedAt && cur.finishedAt && p.finishedAt > cur.finishedAt)) latest.set(key, p);
  }
  const attempts = [...latest.values()];
  const selesai = attempts.length;
  const totalMurid = ids.length;
  const rataRata = attempts.length > 0
    ? Math.round(attempts.reduce((s, p) => s + (p.percentage || 0), 0) / attempts.length)
    : 0;
  const seksiStats = aggregateSeksiStats(attempts);
  const terbaik = seksiStats.filter((s) => s.count >= 1).pop() || null;
  const tersulit = seksiStats.find((s) => s.count >= 1) || null;
  const jumlahLemah = tersulit
    ? attempts.filter((p) => {
        try {
          const ss = p.sectionScores as Record<string, { score?: number }>;
          const sc = Number(ss?.[tersulit.seksi]?.score);
          return !Number.isNaN(sc) && sc < 70;
        } catch { return false; }
      }).length
    : 0;

  let summary: string;
  let ai = false;
  try {
    const text = await buildClassSummaryText({
      groupName: group.name, totalMurid, selesai, rataRata,
      tersulit: tersulit ? { seksi: tersulit.seksi, jumlahLemah } : null,
      terbaik: terbaik ? { seksi: terbaik.seksi } : null,
    });
    summary = text;
    ai = true;
  } catch {
    const t = tersulit ? `Materi tersulit adalah ${tersulit.seksi} — ${jumlahLemah} murid belum menguasai. ` : "";
    const b = terbaik ? `Materi terbaik: ${terbaik.seksi}. ` : "";
    summary =
      `Kelas ${group.name}, ${totalMurid} murid, ${selesai} mengikuti simulasi, rata-rata ${rataRata}. ` +
      `${t}${b}Saran AI: ulangi materi tersulit dengan latihan bertahap.`;
  }

  const rekomendasi = tersulit
    ? `Ulangi materi ${tersulit.seksi} (halaman latihan terkait) untuk ${jumlahLemah} murid yang belum menguasai.`
    : "Ajak murid mengikuti simulasi berikutnya untuk melihat perkembangan.";

  const result: ClassSummary = {
    summary,
    ai,
    generatedAt: new Date().toISOString(),
    data: {
      groupName: group.name,
      totalMurid,
      selesai,
      rataRata,
      seksiTersulit: tersulit?.seksi || null,
      jumlahLemah,
      seksiTerbaik: terbaik?.seksi || null,
      rekomendasi,
    },
  };
  await cache.set(cacheKey, result, 600);
  return result;
}

async function buildClassSummaryText(input: {
  groupName: string; totalMurid: number; selesai: number; rataRata: number;
  tersulit: { seksi: string; jumlahLemah: number } | null;
  terbaik: { seksi: string } | null;
}): Promise<string> {
  const sys = `Anda asisten guru BahasaCerdas. Ringkas evaluasi kelas dalam 2-3 kalimat Bahasa Indonesia, ramah dan actionable. Balas HANYA teks.`;
  const usr = `Data kelas ${input.groupName}: ${input.selesai} dari ${input.totalMurid} murid mengikuti simulasi, rata-rata nilai ${input.rataRata}.` +
    (input.tersulit ? ` Materi tersulit: ${input.tersulit.seksi} (${input.tersulit.jumlahLemah} murid belum menguasai).` : "") +
    (input.terbaik ? ` Materi terbaik: ${input.terbaik.seksi}.` : "") +
    ` Berikan ringkasan dan saran pembelajaran singkat.`;
  const res = await callWithFallback({
    model: getDefaultModel(),
    messages: [
      { role: "system", content: sys },
      { role: "user", content: usr },
    ],
    temperature: 0.4,
    maxTokens: 300,
    timeoutMs: 30000,
  } as any);
  const text = (res.content || "").trim();
  if (!text) throw new Error("empty");
  return text.slice(0, 600);
}

// ────────────────────────────────────────────────────────────
// AI Insight (cached Redis 15 menit)
// ────────────────────────────────────────────────────────────

export interface AIInsight {
  topikTersulitMingguIni: string | null;
  topikTerbaik: string | null;
  kompetensiNaik: string | null;
  kompetensiTurun: string | null;
  kelasTerbaik: { id: string; name: string; rataRata: number } | null;
  muridPalingBerkembang: { id: string; name: string; delta: number } | null;
  muridPerluPerhatian: Array<{ id: string; name: string; percentage: number }>;
  rekomendasi: string;
  ai: boolean;
  generatedAt: string;
}

/** Insight AI lintas kelas guru (7 hari terakhir + minggu ini vs minggu lalu). */
export async function getAIInsights(teacherId: string): Promise<AIInsight> {
  const cacheKey = `simulasi:insight:${teacherId}`;
  const cached = await cache.get<AIInsight>(cacheKey);
  if (cached) return cached;

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000);

  const studentIds = await getTeacherStudentIds(teacherId);
  const groups = await getTeacherGroups(teacherId);
  const groupNameOf = new Map<string, string>();
  for (const g of groups) for (const m of g.members) groupNameOf.set(m.userId, g.name);

  const completed = await db.progresKompetensi.findMany({
    where: { userId: { in: studentIds }, status: "COMPLETED", finishedAt: { gte: twoWeeksAgo } },
    include: {
      paket: { select: { id: true, type: true } },
      user: { select: { id: true, fullName: true } },
    },
  });

  const thisWeek = completed.filter((p) => p.finishedAt && p.finishedAt >= weekAgo);
  const lastWeek = completed.filter((p) => p.finishedAt && p.finishedAt < weekAgo && p.finishedAt >= twoWeeksAgo);

  const seksiThis = aggregateSeksiStats(thisWeek);
  const seksiLast = aggregateSeksiStats(lastWeek);
  const tersulit = seksiThis.find((s) => s.count >= 1) || null;
  const terbaik = seksiThis.filter((s) => s.count >= 1).pop() || null;

  const bySeksi = (list: typeof seksiThis, name: string) => list.find((s) => s.seksi === name)?.avg ?? null;
  const kompetensiTurun = seksiThis
    .filter((s) => bySeksi(seksiLast, s.seksi) != null && s.avg < bySeksi(seksiLast, s.seksi)! - 5)
    .sort((a, b) => a.avg - b.avg)[0] || null;
  const kompetensiNaik = seksiThis
    .filter((s) => bySeksi(seksiLast, s.seksi) != null && s.avg > bySeksi(seksiLast, s.seksi)! + 5)
    .sort((a, b) => b.avg - a.avg)[0] || null;

  // kelas terbaik (minggu ini)
  const classAvg = new Map<string, { sum: number; n: number; name: string }>();
  for (const p of thisWeek) {
    const gName = groupNameOf.get(p.userId) || "-";
    if (!classAvg.has(gName)) classAvg.set(gName, { sum: 0, n: 0, name: gName });
    const e = classAvg.get(gName)!;
    e.sum += p.percentage || 0; e.n += 1;
  }
  let kelasTerbaik: AIInsight["kelasTerbaik"] = null;
  for (const [name, v] of classAvg) {
    if (v.n < 2) continue;
    const avg = Math.round(v.sum / v.n);
    if (!kelasTerbaik || avg > kelasTerbaik.rataRata) {
      kelasTerbaik = { id: name, name, rataRata: avg };
    }
  }

  // murid paling berkembang: rata-rata minggu ini - minggu lalu (min 2 attempts)
  const avgOf = (list: typeof completed, userId: string) => {
    const arr = list.filter((p) => p.userId === userId);
    if (arr.length === 0) return null;
    return arr.reduce((s, p) => s + (p.percentage || 0), 0) / arr.length;
  };
  let muridPalingBerkembang: AIInsight["muridPalingBerkembang"] = null;
  for (const p of completed) {
    const prev = avgOf(lastWeek, p.userId);
    const cur = avgOf(thisWeek, p.userId);
    if (prev == null || cur == null) continue;
    const delta = cur - prev;
    if (delta > 3 && (!muridPalingBerkembang || delta > muridPalingBerkembang.delta)) {
      muridPalingBerkembang = { id: p.userId, name: p.user.fullName, delta: Math.round(delta) };
    }
  }

  const perlu = thisWeek
    .filter((p) => (p.percentage || 0) < 60)
    .map((p) => ({ id: p.userId, name: p.user.fullName, percentage: p.percentage || 0 }))
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 5);

  const rekomendasi = tersulit
    ? `Fokus minggu ini: ${tersulit.seksi} (rata-rata ${tersulit.avg}). Beri latihan bertahap dan pantau ${perlu.length} murid yang masih di bawah 60.`
    : "Belum ada data cukup minggu ini — ajak murid mengikuti simulasi untuk insight yang lebih akurat.";

  const result: AIInsight = {
    topikTersulitMingguIni: tersulit?.seksi || null,
    topikTerbaik: terbaik?.seksi || null,
    kompetensiNaik: kompetensiNaik?.seksi || null,
    kompetensiTurun: kompetensiTurun?.seksi || null,
    kelasTerbaik,
    muridPalingBerkembang,
    muridPerluPerhatian: perlu,
    rekomendasi,
    ai: false,
    generatedAt: new Date().toISOString(),
  };
  await cache.set(cacheKey, result, 900);
  return result;
}

// ────────────────────────────────────────────────────────────
// AI Review Center (tinjau-simulasi)
// ────────────────────────────────────────────────────────────

export interface ReviewItem {
  id: string;
  studentId: string;
  student: string;
  groupId: string;
  groupName: string;
  seksi: string;
  questionText: string;
  answer: string;
  transcript: string | null;
  isAudio: boolean;
  score: number;
  aiConfidence: number | null;
  aiReviewedAt: string | null;
  reviewStatus: string | null;
  aiFeedback: Record<string, unknown> | null;
  rubric: unknown;
  wordLimit: { min?: number; max?: number } | null;
  createdAt: string;
}

/** Daftar jawaban konstruktif (Menulis/Berbicara) kelas guru — filter + pagination server-side. */
export async function getReviewQueue(teacherId: string, filter: SimulationFilter = {}): Promise<{
  items: ReviewItem[]; page: number; limit: number; total: number; totalPages: number;
}> {
  const { groupId, search, status, seksi } = filter;
  const page = Math.max(1, filter.page || 1);
  const limit = Math.min(100, Math.max(1, filter.limit || 20));
  const q = normalizeSearch(search);

  const groups = await getTeacherGroups(teacherId);
  const memberIdsByGroup = new Map<string, string[]>();
  const allIds = new Set<string>();
  for (const g of groups) {
    const ids = g.members.map((m) => m.userId);
    memberIdsByGroup.set(g.id, ids);
    ids.forEach((id) => allIds.add(id));
  }
  let studentIds = [...allIds];
  if (groupId) studentIds = memberIdsByGroup.get(groupId) || [];
  if (studentIds.length === 0) return { items: [], page, limit, total: 0, totalPages: 1 };

  const where: Record<string, unknown> = {
    userId: { in: studentIds },
    OR: [{ questionType: "CONSTRUCTED" }, { seksi: { in: ["MENULIS", "BERBICARA"] } }],
    answer: { not: "" },
  };
  if (seksi) where.seksi = seksi;
  if (status === "AI_SELESAI_MENILAI" || status === "MENUNGGU_PERSETUJUAN_GURU" || status === "SELESAI") {
    if (status === "SELESAI") where.reviewStatus = "APPROVED";
    else if (status === "MENUNGGU_PERSETUJUAN_GURU") where.reviewStatus = { not: "APPROVED" };
    else where.reviewStatus = null;
  }
  if (status === "MENUNGGU_PENILAIAN_AI") where.aiReviewedAt = null;

  const [total, rows] = await Promise.all([
    db.testAnswer.count({ where }),
    db.testAnswer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  if (rows.length === 0) return { items: [], page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };

  const qIds = [...new Set(rows.map((r) => r.questionId).filter(Boolean))] as string[];
  const uIds = [...new Set(rows.map((r) => r.userId))];
  const [questions, users] = await Promise.all([
    db.uKBIQuestion.findMany({ where: { id: { in: qIds } }, select: { id: true, text: true, seksi: true, options: true } }),
    db.user.findMany({ where: { id: { in: uIds } }, select: { id: true, fullName: true } }),
  ]);
  const qMap = new Map(questions.map((x) => [x.id, x]));
  const uMap = new Map(users.map((x) => [x.id, x.fullName]));
  const userIdToGroup = new Map<string, { id: string; name: string }>();
  for (const g of groups) for (const m of g.members) {
    if (!userIdToGroup.has(m.userId)) userIdToGroup.set(m.userId, { id: g.id, name: g.name });
  }

  const items: ReviewItem[] = rows
    .filter((r) => !q || (uMap.get(r.userId) || "").toLowerCase().includes(q))
    .map((r) => {
      const q = qMap.get(r.questionId || "");
      const meta = q?.options && typeof q.options === "object" && !Array.isArray(q.options)
        ? (q.options as Record<string, unknown>)
        : {};
      const seksi = (r.seksi || q?.seksi || "MENULIS").toUpperCase();
      const isAudio = seksi === "BERBICARA" && !!r.answer && /^https?:\/\//.test(r.answer);
      const g = userIdToGroup.get(r.userId) || { id: "", name: "-" };
      return {
        id: r.id,
        studentId: r.userId,
        student: uMap.get(r.userId) || "Murid",
        groupId: g.id,
        groupName: g.name,
        seksi,
        questionText: q?.text || "",
        answer: r.answer || "",
        transcript: null,
        isAudio,
        score: r.score ?? 0,
        aiConfidence: r.aiConfidence,
        aiReviewedAt: r.aiReviewedAt?.toISOString() || null,
        reviewStatus: r.reviewStatus || null,
        aiFeedback: (r.aiFeedback as Record<string, unknown> | null) || null,
        rubric: (meta as any)?.rubric || null,
        wordLimit: ((meta as any)?.wordLimit as { min?: number; max?: number } | null) || null,
        createdAt: r.createdAt.toISOString(),
      };
    });

  const filteredTotal = items.length;
  const paged = items.slice(0, limit);

  return {
    items: paged,
    page, limit,
    total: filteredTotal,
    totalPages: Math.max(1, Math.ceil(filteredTotal / limit)),
  };
}

/**
 * AI Review satu jawaban konstruktif (reuse gradeConstructed — Writing/Speaking
 * engine). Menghasilkan ringkasan, dimensi (Menulis 7 / Berbicara 5), rubrik,
 * kelebihan, kelemahan, kesalahan terbesar, kompetensi belum dikuasai,
 * rekomendasi, komentar untuk guru, komentar siap kirim murid, confidence.
 * Fail-safe: bila AI gagal, kembalikan rule-based minimal.
 */
export async function aiReviewAnswer(answerId: string): Promise<{ ok: boolean; error?: string; item?: ReviewItem }> {
  const row = await db.testAnswer.findUnique({ where: { id: answerId } });
  if (!row) return { ok: false, error: "Jawaban tidak ditemukan" };

  const q = row.questionId
    ? await db.uKBIQuestion.findUnique({ where: { id: row.questionId }, select: { id: true, text: true, seksi: true, options: true } })
    : null;
  const meta = q?.options && typeof q.options === "object" && !Array.isArray(q.options)
    ? (q.options as Record<string, unknown>)
    : {};
  const seksi = (row.seksi || q?.seksi || "MENULIS").toUpperCase() as "MENULIS" | "BERBICARA";
  const rubric = (meta as any)?.rubric || null;

  const slot = await acquireAiSlot({ pool: "simulasi-review" });
  if (!slot) return { ok: false, error: "Sistem AI sedang sibuk — coba lagi sebentar." };
  try {
    const res = await gradeConstructed({
      seksi,
      prompt: q?.text || "",
      rubric,
      answer: row.answer || "",
    });

    const score = res.graded ? res.score : row.score;
    const feedback = res.feedback || "";

    let feedbackJson: Record<string, unknown> | null = null;
    let confidence = res.graded ? 85 : 55;
    try {
      const detail = await buildAiReviewDetail({ seksi, prompt: q?.text || "", rubric, answer: row.answer || "", score });
      feedbackJson = detail.feedback;
      confidence = detail.confidence ?? confidence;
    } catch {
      feedbackJson = { ringkasan: feedback, komentarMurid: feedback, komentarGuru: "Periksa jawaban ini secara manual." };
    }

    await db.testAnswer.update({
      where: { id: answerId },
      data: {
        score,
        isCorrect: score >= 60,
        aiFeedback: feedbackJson as object,
        aiConfidence: confidence,
        aiReviewedAt: new Date(),
        reviewStatus: "MENUNGGU_PERSETUJUAN_GURU",
      },
    });

    // Log usage (best-effort) — pakai feature simulasi tanpa membuat engine baru
    logLegacyUsage({
      userId: row.userId,
      feature: "simulasi:review",
      provider: "fallback",
      model: getDefaultModel(),
      tokens: 0,
      costUSD: 0,
      latencyMs: 0,
      success: true,
      error: null,
    }).catch(() => {});

    // Notifikasi guru dari murid ini (best-effort)
    notifyGuruMurid(await getMuridGuruIdsOf(row.userId), {
      title: "Jawaban Menulis/Berbicara dinilai AI",
      body: `${seksi === "MENULIS" ? "Menulis" : "Berbicara"} selesai dinilai AI — tinjau & setujui di Pusat Evaluasi.`,
      type: "SIMULASI_REVIEW",
      data: { answerId },
    }).catch(() => {});

    const updated = await db.testAnswer.findUnique({ where: { id: answerId } });
    return { ok: true, item: serializeReviewItem(updated!, row.userId) };
  } finally {
    await slot.release();
  }
}

async function getMuridGuruIdsOf(muridId: string): Promise<string[]> {
  const memberships = await db.groupMember.findMany({ where: { userId: muridId }, select: { groupId: true } });
  if (memberships.length === 0) return [];
  const groups = await db.group.findMany({ where: { id: { in: memberships.map((m) => m.groupId) } }, select: { teacherId: true } });
  return [...new Set(groups.map((g) => g.teacherId))];
}

interface AiReviewDetail {
  feedback: Record<string, unknown>;
  confidence: number;
}

async function buildAiReviewDetail(params: {
  seksi: "MENULIS" | "BERBICARA";
  prompt: string;
  rubric: unknown;
  answer: string;
  score: number;
}): Promise<AiReviewDetail> {
  const { seksi, prompt, rubric, answer, score } = params;
  const dims = seksi === "MENULIS" ? WRITING_DIMENSIONS : SPEAKING_DIMENSIONS;
  const dimsText = dims.join(", ");

  const sys =
    `Anda penilai ahli UKBI seksi ${seksi === "MENULIS" ? "Menulis" : "Berbicara"}. ` +
    `Analisis jawaban peserta dan berikan penilaian terstruktur. ` +
    `Balas HANYA JSON valid tanpa teks lain: {"ringkasan":"1-2 kalimat","nilai":<0-100>,"rubrik":[{"kriteria":"...","skor":<0-100>,"catatan":"..."}],"kelebihan":["..."],"kelemahan":["..."],"kesalahanTerbesar":["..."],"kompetensiBelum":["..."],"rekomendasi":"latihan yang disarankan","komentarGuru":"catatan untuk guru","komentarMurid":"pesan ramah siap kirim ke murid","dimensi":{"${dimsText}":{"skor":<0-100>,"komentar":"..."}},"confidence":<0-100>}`;

  const usr =
    `PERINTAH SOAL:\n${prompt}\n\nRUBRIK:\n${typeof rubric === "string" ? rubric : JSON.stringify(rubric || {})}\n\n` +
    `SKOR SEMENTARA: ${score}\n\nJAWABAN PESERTA:\n${answer}`;

  const res = await callWithFallback({
    model: getDefaultModel(),
    messages: [
      { role: "system", content: sys },
      { role: "user", content: usr },
    ],
    temperature: 0.2,
    maxTokens: 1500,
    responseFormat: "json",
    timeoutMs: 45000,
  } as any);

  const m = res.content.match(/\{[\s\S]*\}/);
  const obj = JSON.parse(m ? m[0] : res.content);
  const confidence = Math.max(0, Math.min(100, Math.round(Number(obj.confidence ?? 85) || 85)));
  const dimsOut: Record<string, unknown> = {};
  for (const d of dims) {
    const dd = obj.dimensi?.[d];
    dimsOut[d] = dd && typeof dd === "object" ? dd : { skor: 0, komentar: "" };
  }
  const feedback: Record<string, unknown> = {
    ringkasan: String(obj.ringkasan || "").slice(0, 500),
    nilai: Number(obj.nilai ?? score) || score,
    rubrik: Array.isArray(obj.rubrik) ? obj.rubrik : [],
    kelebihan: Array.isArray(obj.kelebihan) ? obj.kelebihan.slice(0, 5) : [],
    kelemahan: Array.isArray(obj.kelemahan) ? obj.kelemahan.slice(0, 5) : [],
    kesalahanTerbesar: Array.isArray(obj.kesalahanTerbesar) ? obj.kesalahanTerbesar.slice(0, 3) : [],
    kompetensiBelum: Array.isArray(obj.kompetensiBelum) ? obj.kompetensiBelum.slice(0, 5) : [],
    rekomendasi: String(obj.rekomendasi || "").slice(0, 400),
    komentarGuru: String(obj.komentarGuru || "").slice(0, 500),
    komentarMurid: String(obj.komentarMurid || "").slice(0, 500),
    dimensi: dimsOut,
  };
  return { feedback, confidence };
}

function serializeReviewItem(r: any, userId: string): ReviewItem {
  const seksi = (r.seksi || "MENULIS").toUpperCase();
  return {
    id: r.id,
    studentId: userId,
    student: "Murid",
    groupId: "",
    groupName: "-",
    seksi,
    questionText: "",
    answer: r.answer || "",
    transcript: null,
    isAudio: seksi === "BERBICARA" && !!r.answer && /^https?:\/\//.test(r.answer),
    score: r.score ?? 0,
    aiConfidence: r.aiConfidence,
    aiReviewedAt: r.aiReviewedAt?.toISOString() || null,
    reviewStatus: r.reviewStatus || null,
    aiFeedback: (r.aiFeedback as Record<string, unknown> | null) || null,
    rubric: null,
    wordLimit: null,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Approve massal jawaban konstruktif (batch review). */
export async function approveAnswers(answerIds: string[], guruId: string, komentar?: string): Promise<{ ok: number; failed: number }> {
  let ok = 0, failed = 0;
  for (const id of answerIds) {
    try {
      const row = await db.testAnswer.findUnique({ where: { id } });
      if (!row) { failed += 1; continue; }
      await db.testAnswer.update({
        where: { id },
        data: {
          reviewStatus: "APPROVED",
          reviewedBy: guruId,
          reviewedAt: new Date(),
          ...(komentar && row.aiFeedback
            ? { aiFeedback: { ...(row.aiFeedback as object), komentarGuruDisetujui: komentar } as object }
            : {}),
        },
      });
      ok += 1;
      awardGuruXp({ guruId, sumber: "GURU_TUGAS", reference: `simulasi-approve-${id}`, metadata: { answerId: id } }).catch(() => {});
    } catch { failed += 1; }
  }
  if (ok > 0) await cache.delPattern(`simulasi:*`);
  return { ok, failed };
}

/** Simpan nilai manual guru (edit skor). */
export async function saveManualScore(answerId: string, guruId: string, score: number, komentar?: string): Promise<{ ok: boolean; error?: string }> {
  const row = await db.testAnswer.findUnique({ where: { id: answerId } });
  if (!row) return { ok: false, error: "Jawaban tidak ditemukan" };
  const sc = Math.max(0, Math.min(100, Math.round(score)));
  await db.testAnswer.update({
    where: { id: answerId },
    data: {
      score: sc,
      isCorrect: sc >= 60,
      reviewStatus: "APPROVED",
      reviewedBy: guruId,
      reviewedAt: new Date(),
      ...(komentar && row.aiFeedback
        ? { aiFeedback: { ...(row.aiFeedback as object), komentarGuruDisetujui: komentar } as object }
        : {}),
    },
  });
  awardGuruXp({ guruId, sumber: "GURU_TUGAS", reference: `simulasi-manual-${answerId}`, metadata: { answerId } }).catch(() => {});
  await cache.delPattern(`simulasi:*`);
  return { ok: true };
}

/** Kirim feedback AI/komentar ke murid (notifikasi). */
export async function sendFeedbackToStudent(answerId: string, komentar: string): Promise<{ ok: boolean; error?: string }> {
  const row = await db.testAnswer.findUnique({ where: { id: answerId }, select: { userId: true, seksi: true } });
  if (!row) return { ok: false, error: "Jawaban tidak ditemukan" };
  const seksi = (row.seksi || "MENULIS").toUpperCase() === "BERBICARA" ? "Berbicara" : "Menulis";
  try {
    await db.notifikasi.create({
      data: {
        userId: row.userId,
        title: `Feedback ${seksi} dari gurumu`,
        body: komentar.slice(0, 300),
        type: "SIMULASI_FEEDBACK",
        data: { answerId } as object,
      },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal mengirim notifikasi" };
  }
}

// ────────────────────────────────────────────────────────────
// Repository Pembelajaran (dokumen-latihan)
// ────────────────────────────────────────────────────────────

export interface RepoItem {
  id: string;
  nama: string;
  jenis: string;
  tanggal: string | null;
  kelas: string;
  paketTitle: string;
  jumlahMurid: number;
  nilaiRataRata: number;
  aiSummary: string | null;
  isCertificate: boolean;
  score: number;
  percentage: number;
  predikat: string | null;
}

/** Repository Pembelajaran — setiap item: Nama, Jenis, Tanggal, Kelas, Jumlah Murid, Nilai rata-rata, AI Summary. */
export async function getRepositoryDocs(teacherId: string, filter: SimulationFilter = {}): Promise<{
  items: RepoItem[]; page: number; limit: number; total: number; totalPages: number;
}> {
  const { groupId, jenis, search } = filter;
  const page = Math.max(1, filter.page || 1);
  const limit = Math.min(100, Math.max(1, filter.limit || 20));
  const q = normalizeSearch(search);

  const groups = await getTeacherGroups(teacherId);
  const memberIdsByGroup = new Map<string, string[]>();
  const allIds = new Set<string>();
  const userGroup = new Map<string, { id: string; name: string }>();
  for (const g of groups) {
    const ids = g.members.map((m) => m.userId);
    memberIdsByGroup.set(g.id, ids);
    ids.forEach((id) => allIds.add(id));
    for (const m of g.members) if (!userGroup.has(m.userId)) userGroup.set(m.userId, { id: g.id, name: g.name });
  }
  let studentIds = [...allIds];
  if (groupId) studentIds = memberIdsByGroup.get(groupId) || [];
  if (studentIds.length === 0) return { items: [], page, limit, total: 0, totalPages: 1 };

  const [certs, progres] = await Promise.all([
    db.kompetensiCertificate.findMany({
      where: { userId: { in: studentIds } },
      include: {
        paket: { select: { title: true, type: true } },
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { issuedAt: "desc" },
      take: 500,
    }),
    db.progresKompetensi.findMany({
      where: { userId: { in: studentIds }, status: "COMPLETED" },
      select: {
        id: true, paketId: true, attemptNumber: true, totalScore: true, percentage: true,
        predikat: true, finishedAt: true, startedAt: true, sectionScores: true,
        paket: { select: { title: true, type: true } },
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { finishedAt: "desc" },
      take: 1000,
    }),
  ]);

  const certified = new Set(certs.map((c) => c.progresId));
  const latestPerKey = new Map<string, (typeof progres)[number]>();
  for (const p of progres) {
    if (certified.has(p.id)) continue;
    const key = `${p.user.id}|${p.paketId}`;
    const cur = latestPerKey.get(key);
    if (!cur || p.attemptNumber > cur.attemptNumber) latestPerKey.set(key, p);
  }

  const docs = [
    ...certs.map((c) => ({
      key: `cert-${c.id}`,
      nama: c.user.fullName,
      jenis: c.paket.type,
      tanggal: c.issuedAt,
      kelas: userGroup.get(c.user.id)?.name || "-",
      paketTitle: c.paket.title,
      isCertificate: true,
      score: c.score,
      percentage: c.percentage,
      predikat: c.predikat,
    })),
    ...[...latestPerKey.values()].map((p) => ({
      key: `hasil-${p.id}`,
      nama: p.user.fullName,
      jenis: p.paket.type,
      tanggal: p.finishedAt ?? p.startedAt,
      kelas: userGroup.get(p.user.id)?.name || "-",
      paketTitle: p.paket.title,
      isCertificate: false,
      score: p.totalScore ?? 0,
      percentage: p.percentage ?? 0,
      predikat: p.predikat || "-",
    })),
  ];

  const grouped = new Map<string, typeof docs>();
  for (const d of docs) {
    const key = `${d.jenis}|${d.kelas}|${d.paketTitle}`;
    grouped.set(key, [...(grouped.get(key) || []), d]);
  }

  let items: RepoItem[] = [...grouped.entries()].map(([key, list]) => {
    const first = list[0];
    const jenis = (first.jenis || "").toUpperCase();
    const avg = Math.round(list.reduce((s, d) => s + d.percentage, 0) / list.length);
    const sortedDates = list.map((d) => d.tanggal?.getTime() || 0).sort((a, b) => b - a);
    return {
      id: key,
      nama: first.nama,
      jenis,
      tanggal: sortedDates[0] ? new Date(sortedDates[0]).toISOString() : null,
      kelas: first.kelas,
      paketTitle: first.paketTitle,
      jumlahMurid: list.length,
      nilaiRataRata: avg,
      aiSummary: null,
      isCertificate: list.some((d) => d.isCertificate),
      score: first.score,
      percentage: first.percentage,
      predikat: first.predikat,
    };
  });

  items = items.filter((i) => matchesJenis(i.jenis, jenis));
  if (q) items = items.filter((i) => i.nama.toLowerCase().includes(q) || i.paketTitle.toLowerCase().includes(q));
  items.sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { items: items.slice((page - 1) * limit, page * limit), page, limit, total, totalPages };
}

// ────────────────────────────────────────────────────────────
// Ekspor (CSV / DOCX) — aman: hanya skor & nama, tanpa jawaban/answer key
// ────────────────────────────────────────────────────────────

export function exportRekapCSV(rows: SimRow[]): string {
  const header = "Murid,Kelas,Paket,Jenis,Percobaan,Status,Skor,Persentase,Predikat,Tanggal";
  const lines = rows.map((r) =>
    [
      `"${r.userName}"`, `"${r.groupName}"`, `"${r.paketTitle}"`, r.paketType,
      r.attemptNumber, SIM_STATUS_META[r.status].label, r.score,
      `${(r.percentage || 0).toFixed(1)}%`, `"${r.predikat || "-"}"`,
      r.finishedAt ? new Date(r.finishedAt).toLocaleDateString("id-ID") : "-",
    ].join(",")
  );
  return [header, ...lines].join("\n");
}

export function exportRekapDocxHTML(rows: SimRow[]): string {
  const trs = rows.map((r) =>
    `<tr><td>${r.userName}</td><td>${r.groupName}</td><td>${r.paketTitle}</td><td>${SIM_STATUS_META[r.status].label}</td><td>${r.score}</td><td>${(r.percentage || 0).toFixed(1)}%</td><td>${r.predikat || "-"}</td></tr>`
  ).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rekap Simulasi</title></head><body><h2>Rekap Simulasi Murid</h2><table border="1" cellpadding="6"><thead><tr><th>Murid</th><th>Kelas</th><th>Paket</th><th>Status</th><th>Skor</th><th>%</th><th>Predikat</th></tr></thead><tbody>${trs}</tbody></table></body></html>`;
}

export { getTeacherStudents, getTeacherStudentIds };
