import { db } from "../lib/db";

interface OptionItem {
  id: string;
  text: string;
}

interface AuditMetric {
  metric: string;
  value: number | string;
  status: "good" | "warning" | "info";
  recommendation?: string;
}

async function main() {
  console.log("📊 UKBI/TKA QUESTION QUALITY AUDIT");
  console.log("=".repeat(60));
  console.log("Read-only. No database mutations.\n");

  const metrics: AuditMetric[] = [];

  // ── UKBI Counts ──
  const ukbiTotal = await db.uKBIQuestion.count();
  metrics.push({ metric: "UKBI total questions", value: ukbiTotal, status: ukbiTotal >= 50 ? "good" : "warning",
    recommendation: ukbiTotal < 50 ? "Need at least 50 for production readiness" : undefined });

  const ukbiSeksi = await db.uKBIQuestion.groupBy({ by: ["seksi"], _count: true });
  const seksiMap = Object.fromEntries(ukbiSeksi.map((s) => [s.seksi, s._count]));
  for (const seksi of ["MENDENGARKAN", "MERESPONS_KAIDAH", "MEMBACA", "MENULIS", "BERBICARA"] as const) {
    const count = seksiMap[seksi] || 0;
    metrics.push({
      metric: `UKBI seksi ${seksi}`,
      value: count,
      status: count >= 8 ? "good" : count > 0 ? "warning" : "warning",
      recommendation: count < 5 ? `Low count — target ≥8 for balanced section` : undefined,
    });
  }

  const ukbiDifficulty = await db.uKBIQuestion.groupBy({ by: ["difficulty"], _count: true });
  const diffMap = Object.fromEntries(ukbiDifficulty.map((d) => [d.difficulty, d._count]));
  for (const diff of ["EASY", "MEDIUM", "HARD", "VERY_HARD"] as const) {
    const count = diffMap[diff] || 0;
    metrics.push({
      metric: `UKBI difficulty ${diff}`,
      value: count,
      status: count >= 5 ? "good" : count > 0 ? "warning" : "warning",
      recommendation: count < 5 ? `Low count — target ≥5 per difficulty level` : undefined,
    });
  }

  // ── TKA Counts ──
  const tkaTotal = await db.tKAQuestion.count();
  metrics.push({ metric: "TKA total questions", value: tkaTotal, status: tkaTotal >= 50 ? "good" : "warning",
    recommendation: tkaTotal < 50 ? "Need at least 50 for production readiness" : undefined });

  const tkaKompetensi = await db.tKAQuestion.groupBy({ by: ["kompetensi"], _count: true });
  const kompetensiMap = Object.fromEntries(tkaKompetensi.map((k) => [k.kompetensi, k._count]));
  for (const kompetensi of ["PEDAGOGIK", "PROFESIONAL", "SOSIAL", "KEPRIBADIAN", "LITERASI_MEMBACA", "TATA_BAHASA", "SASTRA", "MENULIS"] as const) {
    const count = kompetensiMap[kompetensi] || 0;
    metrics.push({
      metric: `TKA kompetensi ${kompetensi}`,
      value: count,
      status: count >= 5 ? "good" : count > 0 ? "warning" : "warning",
      recommendation: count < 5 ? `Low count — target ≥5 per kompetensi` : undefined,
    });
  }

  const tkaDifficulty = await db.tKAQuestion.groupBy({ by: ["difficulty"], _count: true });
  const tkaDiffMap = Object.fromEntries(tkaDifficulty.map((d) => [d.difficulty, d._count]));
  for (const diff of ["EASY", "MEDIUM", "HARD", "VERY_HARD"] as const) {
    const count = tkaDiffMap[diff] || 0;
    metrics.push({
      metric: `TKA difficulty ${diff}`,
      value: count,
      status: count >= 5 ? "good" : count > 0 ? "warning" : "warning",
      recommendation: count < 5 ? `Low count — target ≥5 per difficulty level` : undefined,
    });
  }

  // ── TKA Weight Distribution ──
  const tkaWeights = await db.tKAQuestion.findMany({ select: { weight: true } });
  const weightDist = new Map<number, number>();
  for (const q of tkaWeights) {
    weightDist.set(q.weight, (weightDist.get(q.weight) || 0) + 1);
  }
  const weightEntries = [...weightDist.entries()].sort((a, b) => a[0] - b[0]);
  for (const [w, c] of weightEntries) {
    metrics.push({
      metric: `TKA weight ${w}`,
      value: c,
      status: c >= 3 ? "good" : "warning",
      recommendation: c < 3 ? `Low count for weight ${w}` : undefined,
    });
  }

  // ── PaketKompetensi ──
  const pakets = await db.paketKompetensi.findMany({
    select: { id: true, title: true, totalQuestions: true, duration: true, isActive: true, type: true },
  });
  metrics.push({ metric: "PaketKompetensi total", value: pakets.length, status: "info" });
  const activePakets = pakets.filter((p) => p.isActive).length;
  metrics.push({ metric: "Active pakets", value: activePakets, status: activePakets > 0 ? "good" : "warning",
    recommendation: activePakets === 0 ? "No active pakets — students cannot take tests" : undefined });

  for (const p of pakets) {
    if (p.totalQuestions > 0 && p.duration > 0) continue;
    metrics.push({
      metric: `Paket ${p.title} config`,
      value: `questions=${p.totalQuestions}, duration=${p.duration}`,
      status: "warning",
      recommendation: "All pakets should have totalQuestions > 0 and duration > 0",
    });
  }

  // ── Verification Rate ──
  const ukbiVerified = await db.uKBIQuestion.count({ where: { isVerified: true } });
  metrics.push({
    metric: "UKBI verified rate",
    value: `${ukbiVerified}/${ukbiTotal} (${ukbiTotal > 0 ? ((ukbiVerified / ukbiTotal) * 100).toFixed(1) : 0}%)`,
    status: ukbiVerified === ukbiTotal ? "good" : "warning",
    recommendation: ukbiVerified < ukbiTotal ? `${ukbiTotal - ukbiVerified} questions not verified` : undefined,
  });

  const tkaVerified = await db.tKAQuestion.count({ where: { isVerified: true } });
  metrics.push({
    metric: "TKA verified rate",
    value: `${tkaVerified}/${tkaTotal} (${tkaTotal > 0 ? ((tkaVerified / tkaTotal) * 100).toFixed(1) : 0}%)`,
    status: tkaVerified === tkaTotal ? "good" : "warning",
    recommendation: tkaVerified < tkaTotal ? `${tkaTotal - tkaVerified} questions not verified` : undefined,
  });

  // ── Print Results ──
  let goodCount = 0, warningCount = 0, infoCount = 0;
  for (const m of metrics) {
    const icon = m.status === "good" ? "✅" : m.status === "warning" ? "⚠️" : "ℹ️";
    if (m.status === "good") goodCount++;
    else if (m.status === "warning") warningCount++;
    else infoCount++;
    console.log(`   ${icon} ${m.metric}: ${m.value}`);
    if (m.recommendation) console.log(`      → ${m.recommendation}`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`SUMMARY: ${goodCount} good, ${warningCount} warnings, ${infoCount} info`);
  if (warningCount > 0) {
    console.log("⚠️  Warnings found — review recommendations above.");
    console.log("   These are NOT fatal but should be addressed before production.");
  }
  console.log(`✅ Quality audit complete\n`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Audit failed:", e.message);
  process.exit(1);
});
