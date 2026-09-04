#!/usr/bin/env npx tsx
/**
 * P0.5 — QUESTION INTEGRITY FORENSIC AUDIT (READ-ONLY, DRY-RUN)
 *
 * Menemukan mengapa soal rusak bisa sampai ke murid Tes Awal.
 *
 * Sumber data:
 *  1. SESI NYATA 45 hari terakhir (AdaptivePracticeSession reasonCode=DIAGNOSTIC):
 *     - bank  (source BANK_SOAL): questionIds → konten Soal
 *     - AI    (source AI_DIAGNOSTIC): butir tersimpan di state (item lengkap)
 *  2. POOL live (query identik buildDiagnosticCandidates di route diagnostik).
 *
 * Keluaran: ringkasan kelas kerusakan + daftar butir bermasalah ke stdout dan
 * /tmp/diagnostic-integrity-audit.json. TIDAK mengubah database apa pun.
 *
 * Hard defect = soal tidak bisa dirender/dijawab/dinilai dengan adil.
 * Review flag  = butuh penilaian manusia (kebocoran kunci, tautologi, bahasa).
 */
import { PrismaClient } from "@prisma/client";
import { loadScriptEnv } from "./_env";
import { bankGateIssues } from "../lib/diagnostic-ai/bank-gate";
import type { AiQuestionType } from "../lib/diagnostic-ai/types";

type DefectClass = "STRUCTURAL" | "RENDERING" | "PEDAGOGICAL" | "ANSWER_LOGIC" | "LANGUAGE" | "SOURCE_DATA" | "ADAPTIVE";

interface Issue {
  cls: DefectClass;
  rule: string;
  detail: string;
}

interface AuditedItem {
  id: string;
  provenance: "BANK" | "AI" | "POOL";
  type: string;
  skill: string | null;
  difficulty: string | null;
  text: string;
  options: string[];
  correctAnswer: string;
  template: string | null;
  defects: Issue[]; // keras: render/jawab/nilai tidak adil
  flags: Issue[]; // lunak: perlu review manusia
}

const PLACEHOLDER = [
  /^\s*(lorem ipsum)/i,
  /^[\s.\-_=*#]{4,}$/,
  /^\s*\[?tulis.*(soal|pertanyaan)/i,
  /^\s*(xxx|todo|tbd)$/i,
];

function normText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().toLowerCase() : "";
}

function normalizeType(value: string): "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT" | null {
  const type = String(value ?? "").toUpperCase();
  if (type === "PILIHAN_GANDA") return "PILIHAN_GANDA";
  if (type === "BENAR_SALAH") return "BENAR_SALAH";
  if (type === "ISIAN" || type === "ISIAN_SINGKAT") return "ISIAN_SINGKAT";
  return null;
}

/** Template artefak: "Berikut ini yang termasuk contoh {topik} adalah…" */
function templateFamily(text: string): string | null {
  const t = normText(text);
  const m = t.match(/^(berikut( ini)? yang termasuk (contoh|jenis) |manakah yang termasuk (contoh|jenis) )([^?.]{2,60}?)( adalah|:|…|$)/);
  if (m && m[5]) return `contoh-${m[5].trim().replace(/\s+/g, "-")}`;
  const m2 = t.match(/^contoh ([a-z ]{2,50})( adalah|:|$)/);
  if (m2 && m2[1]) return `contoh-${m2[1].trim().replace(/\s+/g, "-")}`;
  return null;
}

const KEY_INDEX = /^\d+$/;

export function auditItem(raw: {
  id: string;
  text: unknown;
  options: unknown;
  type: string;
  correctAnswer: unknown;
  skill?: string | null;
  difficulty?: string | null;
  provenance?: "BANK" | "AI" | "POOL";
}): AuditedItem {
  const defects: Issue[] = [];
  const flags: Issue[] = [];
  const type = normalizeType(raw.type);
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  const optionsRaw = Array.isArray(raw.options) ? raw.options : null;
  const options = optionsRaw ? optionsRaw.filter((o): o is string => typeof o === "string").map((o) => o.trim()) : [];
  const hasNonString = Array.isArray(raw.options) && raw.options.some((o) => typeof o !== "string");
  const correctAnswer = raw.correctAnswer === null || raw.correctAnswer === undefined ? "" : String(raw.correctAnswer).trim();
  const template = templateFamily(text);
  const templateTopic = template ? template.replace(/^contoh-/, "") : null;
  const addDefect = (cls: DefectClass, rule: string, detail: string) => defects.push({ cls, rule, detail });
  const addFlag = (cls: DefectClass, rule: string, detail: string) => flags.push({ cls, rule, detail });

  if (!type) addDefect("SOURCE_DATA", "TYPE_UNSUPPORTED", `type "${raw.type}" tidak bisa dinilai otomatis`);

  // ── TEKS ────────────────────────────────────────────────────────
  if (!text) addDefect("STRUCTURAL", "TEXT_MISSING", "teks soal kosong");
  if (text && text.length < 10) addDefect("LANGUAGE", "TEXT_TOO_SHORT", `teks hanya ${text.length} karakter`);
  else if (text && text.length < 20) addFlag("LANGUAGE", "TEXT_SHORT", `teks pendek (${text.length} karakter)`);
  for (const pattern of PLACEHOLDER) {
    if (pattern.test(text)) {
      addDefect("SOURCE_DATA", "PLACEHOLDER", `teks seperti placeholder: "${text.slice(0, 60)}"`);
      break;
    }
  }
  if (text.length > 900) addFlag("RENDERING", "TEXT_VERY_LONG", `teks ${text.length} karakter`);
  if (template) addFlag("SOURCE_DATA", "TEMPLATE_STEM", `stem template "contoh …" terdeteksi`);

  // ── OPSI ─────────────────────────────────────────────────────────
  if (hasNonString) addDefect("STRUCTURAL", "OPTIONS_NON_STRING", "ada elemen opsi non-string");
  if (type && type !== "ISIAN_SINGKAT" && !optionsRaw) {
    addDefect("STRUCTURAL", "OPTIONS_MISSING", "options bukan array");
  } else if (type && type !== "ISIAN_SINGKAT") {
    const expected = type === "PILIHAN_GANDA" ? 4 : 2;
    if (options.length < 2) addDefect("STRUCTURAL", "TOO_FEW_OPTIONS", `${type}: hanya ${options.length} opsi`);
    else if (options.length !== expected) addFlag("STRUCTURAL", "OPTION_COUNT", `${type}: ${options.length} opsi (umumnya ${expected})`);
    if (options.some((o) => o.length === 0)) addDefect("STRUCTURAL", "EMPTY_OPTION", "ada opsi kosong");
    const seen = new Map<string, number>();
    options.forEach((o, i) => {
      const k = normText(o);
      if (!k) return;
      if (seen.has(k)) addDefect("STRUCTURAL", "DUPLICATE_OPTION", `opsi "${o}" duplikat dengan indeks ${seen.get(k)}`);
      else seen.set(k, i);
    });
    if (type === "BENAR_SALAH") {
      const shape = options.map(normText);
      if (shape.length === 2 && (shape[0] !== "benar" || shape[1] !== "salah"))
        addDefect("STRUCTURAL", "BS_BAD_SHAPE", `benar-salah tidak persis ["Benar","Salah"]`);
    }
    for (const o of options) {
      const t = o.trim();
      if (/^[A-D][.)]\s*\S/.test(t) && t.length > 3)
        addFlag("LANGUAGE", "OPTION_PREFIXED", `opsi ber-penanda "${t.slice(0, 12)}…"`);
      if (/^[1-4][.)]\s*\S/.test(t))
        addFlag("LANGUAGE", "OPTION_NUMBERED", `opsi bernomor "${t.slice(0, 12)}…"`);
    }
  }
  if (type === "ISIAN_SINGKAT" && options.length > 0) {
    addDefect("STRUCTURAL", "ISIAN_HAS_OPTIONS", `isian singkat menyimpan ${options.length} opsi — klien menampilkan tombol & menilai sebagai indeks`);
  }

  // ── KUNCI ────────────────────────────────────────────────────────
  const stem = normText(text);
  if (type && type !== "ISIAN_SINGKAT") {
    if (!KEY_INDEX.test(correctAnswer)) {
      const matchesOption = options.some((o) => normText(o) === normText(correctAnswer));
      addDefect(
        "ANSWER_LOGIC",
        "ANSWER_NOT_INDEX",
        matchesOption
          ? `kunci "${correctAnswer}" = teks opsi, bukan indeks (murid kirim indeks → selalu dinilai salah)`
          : `kunci "${correctAnswer}" bukan indeks dan tak cocok opsi mana pun`
      );
    } else {
      const idx = Number(correctAnswer);
      if (options.length > 0 && idx >= options.length)
        addDefect("ANSWER_LOGIC", "ANSWER_INDEX_OOB", `indeks kunci ${idx} di luar ${options.length} opsi`);
      const keyOption = options[idx];
      if (keyOption !== undefined) {
        // Kunci bocor di stem: teks kunci muncul di stem (non-bacaan, < 240 krk).
        const ko = normText(keyOption);
        if (ko.length >= 4 && stem.length < 240 && stem.includes(ko) && !template) {
          addFlag("ANSWER_LOGIC", "KEY_IN_STEM", `kunci "${keyOption.slice(0, 50)}" tertulis di stem`);
        }
        // Tautologi template "contoh {X} adalah → {X}".
        if (template && templateTopic && ko === templateTopic) {
          addDefect("ANSWER_LOGIC", "TAUTOLOGY_TEMPLATE", `jawaban "${keyOption.slice(0, 50)}" mengulang topik stem`);
        }
        if (/^[A-D][.)]/.test(keyOption)) addFlag("LANGUAGE", "KEY_PREFIXED", `kunci menunjuk opsi ber-penanda`);
      }
    }
  } else if (type === "ISIAN_SINGKAT" && !correctAnswer) {
    addDefect("ANSWER_LOGIC", "ISIAN_NO_KEY", "isian singkat tanpa kunci jawaban");
  }

  // ── LANJUTAN: cek template lain-lain + jawaban umum ─────────────
  if (template && !type) {
    /* type unsupported sudah tercatat */
  }

  return {
    id: raw.id,
    provenance: raw.provenance ?? "BANK",
    type: type ?? String(raw.type ?? ""),
    skill: raw.skill ?? null,
    difficulty: raw.difficulty ?? null,
    text,
    options,
    correctAnswer,
    template,
    defects,
    flags,
  };
}

function loadEnvOk(): boolean {
  const rawUrl =
    process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "") ?? process.env.DIRECT_URL?.trim().replace(/^["']|["']$/g, "");
  return Boolean(rawUrl && rawUrl !== "[SENSITIVE]" && /^postgres(ql)?:\/\//.test(rawUrl));
}

interface Summary {
  total: number;
  hard: number;
  flagged: number;
  byClass: Record<string, number>;
  byRule: Record<string, number>;
  byTemplate: Record<string, number>;
}

function summarize(items: AuditedItem[], includeFlags: boolean): Summary {
  const byClass: Record<string, number> = {};
  const byRule: Record<string, number> = {};    const byTemplate: Record<string, number> = {};
    let hard = 0;
    let flagged = 0;
    for (const item of items) {
      const issues = item.defects.concat(includeFlags ? item.flags : []);
      if (item.defects.length > 0) hard += 1;
      if (item.flags.length > 0) flagged += 1;
      if (item.template) byTemplate[item.template] = (byTemplate[item.template] ?? 0) + 1;
      for (const i of issues) {
        byClass[i.cls] = (byClass[i.cls] ?? 0) + 1;
        byRule[i.rule] = (byRule[i.rule] ?? 0) + 1;
      }
    }
  return { total: items.length, hard, flagged, byClass, byRule, byTemplate };
}

async function main(): Promise<void> {
  loadScriptEnv();
  if (!loadEnvOk()) {
    console.log("DATABASE READ-ONLY UNAVAILABLE.");
    process.exit(0);
  }
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.log("DATABASE READ-ONLY UNAVAILABLE (koneksi gagal).");
    await prisma.$disconnect();
    process.exit(0);
  }

  // 1. Pool live identik dengan buildDiagnosticCandidates
  const metadataRows = await prisma.questionMetadata.findMany({
    where: { source: "BANK_SOAL", status: "APPROVED", skill: { not: null } },
    orderBy: { questionId: "asc" },
    select: { questionId: true, skill: true, subskill: true, difficulty: true, questionType: true, provenance: true },
  });
  const soalRows = await prisma.soal.findMany({
    where: { kodeSoal: { in: metadataRows.map((row) => row.questionId) } },
    select: { kodeSoal: true, text: true, options: true, type: true, correctAnswer: true },
  });
  const soalById = new Map(soalRows.map((row) => [row.kodeSoal, row]));
  const pool: AuditedItem[] = [];
  for (const metadata of metadataRows) {
    const soal = soalById.get(metadata.questionId);
    if (!soal) continue;
    if (!soal.text.trim() || !Array.isArray(soal.options)) continue;
    const type = normalizeType(soal.type);
    if (!type || type !== metadata.questionType) continue;
    pool.push(
      auditItem({
        id: soal.kodeSoal ?? metadata.questionId,
        text: soal.text,
        options: soal.options,
        type: soal.type,
        correctAnswer: soal.correctAnswer,
        skill: metadata.skill,
        difficulty: metadata.difficulty ?? null,
        provenance: "POOL",
      })
    );
  }

  // 2. Sesi diagnostik nyata
  const since = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
  const sessions = await prisma.adaptivePracticeSession.findMany({
    where: { reasonCode: "DIAGNOSTIC", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { id: true, source: true, createdAt: true, questionIds: true },
    take: 300,
  });
  const bankSessions = sessions.filter((s) => s.source !== "AI_DIAGNOSTIC");
  const aiSessions = sessions.filter((s) => s.source === "AI_DIAGNOSTIC");

  // butir bank yang benar-benar dikirim
  const deliveredBankIds = new Map<string, number>();
  for (const s of bankSessions) {
    const ids = Array.isArray(s.questionIds) ? s.questionIds.filter((x): x is string => typeof x === "string") : [];
    for (const id of Array.from(new Set(ids))) deliveredBankIds.set(id, (deliveredBankIds.get(id) ?? 0) + 1);
  }
  const deliveredBank: AuditedItem[] = [];
  const ids = Array.from(deliveredBankIds.keys());
  for (const id of ids) {
    const soal = soalById.get(id);
    if (!soal) {
      deliveredBank.push({
        id,
        provenance: "BANK",
        type: "?",
        skill: null,
        difficulty: null,
        text: "",
        options: [],
        correctAnswer: "",
        template: null,
        defects: [{ cls: "SOURCE_DATA", rule: "SOAL_MISSING", detail: "kodeSoal di sesi tidak ada di tabel Soal" }],
        flags: [],
      });
      continue;
    }
    const metadata = metadataRows.find((row) => row.questionId === id);
    deliveredBank.push(
      auditItem({
        id,
        text: soal.text,
        options: soal.options,
        type: soal.type,
        correctAnswer: soal.correctAnswer,
        skill: metadata?.skill ?? null,
        difficulty: metadata?.difficulty ?? null,
        provenance: "BANK",
      })
    );
  }

  // butir AI (semua yang tersimpan di state sesi — superset dari yang terkirim)
  const aiItems: AuditedItem[] = [];
  const sessionFallbackCount: Record<string, number> = {};
  const sessionDupStems: Record<string, string[]> = {};
  for (const s of aiSessions) {
    const state = (s.questionIds ?? {}) as { items?: Record<string, Record<string, unknown>> };
    const items = state.items ?? {};
    const stemsInSession = new Map<string, number>();
    const idsOfSession = Object.keys(items);
    const bankLike = idsOfSession.filter((id) => /^[A-Za-z]{2,4}-[A-Z0-9-]+$/.test(id));
    if (bankLike.length > 0) sessionFallbackCount[s.id] = bankLike.length;
    for (const id of idsOfSession) {
      const raw = items[id] as Record<string, unknown>;
      aiItems.push(
        auditItem({
          id,
          text: raw.text,
          options: raw.options,
          type: typeof raw.questionType === "string" ? raw.questionType : "",
          correctAnswer: raw.correctAnswer,
          skill: typeof raw.skill === "string" ? raw.skill : null,
          difficulty: typeof raw.difficulty === "string" ? raw.difficulty : null,
          provenance: "AI",
        })
      );
      const stem = normText(raw.text);
      if (stem) {
        stemsInSession.set(stem, (stemsInSession.get(stem) ?? 0) + 1);
      }
    }
    const dups = Array.from(stemsInSession.entries()).filter((entry) => entry[1] > 1);
    if (dups.length > 0) {
      sessionDupStems[s.id] = dups.map((entry) => `${entry[1]}× ${entry[0].slice(0, 90)}`);
    }
  }

  const summarizeDeliveredBank = summarize(deliveredBank, true);
  const summarizeAi = summarize(aiItems, true);
  const summarizePool = summarize(pool, true);

  const uniq = new Map<string, AuditedItem>();
  for (const item of [...deliveredBank, ...aiItems]) uniq.set(item.id, item);

  console.log("═".repeat(74));
  console.log("P0.5 QUESTION INTEGRITY FORENSIC AUDIT — READ-ONLY (45 hari)");
  console.log("═".repeat(74));
  console.log(`Sesi diagnostik      : ${sessions.length} (bank ${bankSessions.length}, AI ${aiSessions.length})`);
  console.log(`Butir AI tersimpan   : ${aiItems.length} (unik ${uniq.size})`);
  console.log(`Sesi AI memuat fallback bank : ${Object.keys(sessionFallbackCount).length}`);
  console.log(`Sesi AI dengan stem duplikat : ${Object.keys(sessionDupStems).length}`);

  const print = (label: string, sum: Summary, items: AuditedItem[], limit: number) => {
    console.log(`\n── ${label} ──`);
    console.log(`  total     : ${sum.total}`);
    console.log(`  hard      : ${sum.hard}   flagged: ${sum.flagged}`);
    console.log(`  per kelas : ${Object.entries(sum.byClass).map(([k, v]) => `${k}=${v}`).join("  ")}`);
    console.log(`  per aturan: ${Object.entries(sum.byRule).map(([k, v]) => `${k}=${v}`).join("  ")}`);
    if (Object.keys(sum.byTemplate).length > 0)
      console.log(`  template  : ${Object.entries(sum.byTemplate).map(([k, v]) => `${k}=${v}`).join("  ")}`);
    const broken = items.filter((i) => i.defects.length > 0);
    if (broken.length > 0) {
      console.log(`  — butir HARD defect (${broken.length}):`);
      for (const item of broken.slice(0, limit)) {
        console.log(`  ❌ [${item.id}] ${item.provenance} ${item.type} ${item.skill ?? ""}`);
        console.log(`     ${item.text.slice(0, 160)}${item.text.length > 160 ? "…" : ""}`);
        console.log(`     opsi: ${item.options.map((o) => `"${o.slice(0, 55)}"`).join(" | ")}   kunci: ${item.correctAnswer}`);
        for (const d of item.defects) console.log(`     • HARD ${d.cls}/${d.rule}: ${d.detail}`);
      }
    }
  };

  print("POOL LIVE", summarizePool, pool, 40);

  // Gate konten: kandidat yang benar-benar eligible (yang akan dipakai route).
  const gateEligiblePool = pool.filter((item) =>
    bankGateIssues({
      id: item.id,
      text: item.text,
      options: item.options,
      questionType: item.type as AiQuestionType,
      correctAnswer: item.correctAnswer,
    }).length === 0
  );
  const eligibleSummary = summarize(gateEligiblePool, false);
  const rejectedByGate = pool.length - gateEligiblePool.length;
  console.log(`\n── POOL SETELAH BANK GATE (kandidat eligible yang dipakai route) ──`);
  console.log(`  raw candidates      : ${pool.length}`);
  console.log(`  ditolak gate        : ${rejectedByGate}`);
  console.log(`  eligible aman       : ${gateEligiblePool.length}`);
  console.log(`  hard defect tersisa : ${eligibleSummary.hard}`);
  let poolIntegrityOk = true;
  if (eligibleSummary.hard > 0) {
    poolIntegrityOk = false;
    console.log(`  ⚠️ masih ada butir rusak lolos gate:`);
    for (const item of gateEligiblePool.filter((i) => i.defects.length > 0).slice(0, 10)) {
      console.log(`    ❌ [${item.id}] ${item.text.slice(0, 90)}`);
    }
  }
  print("TERKIRIM BANK (sesi)", summarizeDeliveredBank, deliveredBank, 40);
  print("TERKIRIM AI (state sesi)", summarizeAi, aiItems, 40);

  if (Object.keys(sessionDupStems).length > 0) {
    console.log(`\n── Contoh sesi AI dengan stem duplikat dalam 1 sesi ──`);
    for (const [sid, stems] of Object.entries(sessionDupStems).slice(0, 10)) {
      console.log(`  ${sid}: ${stems.join(" ‖ ")}`);
    }
  }

  const uniqValues = Array.from(uniq.values());
  const flaggedUnique = uniqValues.filter((i) => i.flags.length > 0);
  const hardUnique = uniqValues.filter((i) => i.defects.length > 0);

  // contoh butir AI untuk review bahasa (sample acak deterministik)
  console.log(`\n── Contoh butir AI (5) untuk review kualitas bahasa ──`);
  const aiSample = Array.from(aiItems).sort((a, b) => a.id.localeCompare(b.id)).slice(0, 5);
  for (const item of aiSample) {
    console.log(`  [${item.id.slice(0, 8)}] ${item.skill}/${item.difficulty} ${item.type}`);
    console.log(`     ${item.text.slice(0, 240)}`);
    console.log(`     opsi: ${item.options.map((o) => `"${o.slice(0, 70)}"`).join(" | ")}`);
  }

  const fs = require("node:fs");
  const report = {
    generatedAt: new Date().toISOString(),
    sessions: { total: sessions.length, bank: bankSessions.length, ai: aiSessions.length },
    summaries: { pool: summarizePool, deliveredBank: summarizeDeliveredBank, deliveredAi: summarizeAi },
    sessionsWithBankFallback: sessionFallbackCount,
    sessionsWithDupStems: sessionDupStems,
    uniqueDelivered: { total: uniq.size, hard: hardUnique.length, flagged: flaggedUnique.length },
    brokenItems: hardUnique.map((i) => ({ ...i, correctAnswer: i.correctAnswer })),
    poolHardIds: pool.filter((i) => i.defects.length > 0).map((i) => ({ id: i.id, rule: i.defects.map((d) => d.rule) })),
    aiHardIds: hardUnique.filter((i) => i.provenance === "AI").map((i) => ({ id: i.id, rule: i.defects.map((d) => d.rule), text: i.text.slice(0, 160) })),
  };
  fs.writeFileSync("/tmp/diagnostic-integrity-audit.json", JSON.stringify(report, null, 2));
  console.log(`\nLaporan detail: /tmp/diagnostic-integrity-audit.json`);

  await prisma.$disconnect();
  if (!poolIntegrityOk) {
    console.error("POOL INTEGRITY GAGAL: ada butir rusak di pool eligible — 0 invalid wajib di pool delivery.");
    process.exit(1);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error("Audit gagal:", error);
  process.exit(1);
});
