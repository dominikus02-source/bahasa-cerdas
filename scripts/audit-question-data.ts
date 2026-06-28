import { db } from "../lib/db";

async function main() {
  console.log("\n📋 QUESTION / EXAM DATA AUDIT");
  console.log("=".repeat(60));

  // ── Soal Stats ──────────────────────────────────────
  console.log("\n📝 SOAL (Bank Soal)");
  const totalSoal = await db.soal.count();
  const soalPG = await db.soal.count({ where: { type: "PILIHAN_GANDA" } });
  const soalEsai = await db.soal.count({ where: { type: "ESAI" } });
  const soalNoOptions = await db.soal.count({ where: { options: { equals: [] } } });
  const soalNoCorrectAnswer = await db.soal.count({ where: { correctAnswer: "" } });
  const soalEmptyText = await db.soal.count({ where: { text: "" } });
  console.log(`   Total Soal:              ${totalSoal}`);
  console.log(`   PG:                      ${soalPG}`);
  console.log(`   Esai:                    ${soalEsai}`);
  console.log(`   Without options:         ${soalNoOptions}`);
  console.log(`   Without correctAnswer:   ${soalNoCorrectAnswer}`);
  console.log(`   Empty text:              ${soalEmptyText}`);

  // Soal by difficulty
  const difficulties = ["MUDAH", "MEDIUM", "SULIT", "HOTS"];
  for (const d of difficulties) {
    const c = await db.soal.count({ where: { difficulty: d } });
    if (c > 0) console.log(`   ${d}: ${c}`);
  }

  // Soal by source
  const sources = await db.soal.groupBy({ by: ["source"], _count: true });
  for (const s of sources) {
    console.log(`   Source "${s.source}": ${s._count}`);
  }

  // Soal terbaru
  const soalNewest = await db.soal.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, text: true, type: true, difficulty: true, createdAt: true },
  });
  console.log(`\n   ── 10 Soal Terbaru ──`);
  for (const s of soalNewest) {
    const preview = s.text.length > 80 ? s.text.slice(0, 80) + "..." : s.text;
    console.log(`   [${s.createdAt.toISOString().slice(0, 10)}] [${s.difficulty}] ${preview}`);
  }

  // ── SoalSet Stats ──────────────────────────────────
  console.log("\n📚 SOAL SET");
  const totalSoalSet = await db.soalSet.count();
  const soalSetPublic = await db.soalSet.count({ where: { isPublic: true } });
  const soalSetNoTitle = await db.soalSet.count({ where: { title: "" } });
  console.log(`   Total SoalSet:           ${totalSoalSet}`);
  console.log(`   Public:                  ${soalSetPublic}`);
  console.log(`   No title:                ${soalSetNoTitle}`);

  // SoalSet with question counts
  const soalSets = await db.soalSet.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });
  console.log(`\n   ── SoalSets with question counts ──`);
  for (const ss of soalSets) {
    console.log(`   ${ss.title} (kelas: ${ss.kelas}) → ${ss._count.questions} soal`);
  }

  // ── BankSoal Stats ─────────────────────────────────
  console.log("\n📁 BANK SOAL");
  const totalBankSoal = await db.bankSoal.count();
  const bankSoalPublished = await db.bankSoal.count({ where: { isPublished: true } });
  console.log(`   Total BankSoal:          ${totalBankSoal}`);
  console.log(`   Published:               ${bankSoalPublished}`);

  // ── UKBIQuestion Stats ─────────────────────────────
  console.log("\n🎯 UKBI QUESTION");
  const totalUKBI = await db.uKBIQuestion.count();
  const ukbiVerified = await db.uKBIQuestion.count({ where: { isVerified: true } });
  const ukbiNoOptions = await db.uKBIQuestion.count({ where: { options: { equals: [] } } });
  const ukbiNoCorrect = await db.uKBIQuestion.count({ where: { correctAnswer: "" } });
  const ukbiNoText = await db.uKBIQuestion.count({ where: { text: "" } });
  console.log(`   Total UKBIQuestion:      ${totalUKBI}`);
  console.log(`   Verified:                ${ukbiVerified}`);
  console.log(`   Without options:         ${ukbiNoOptions}`);
  console.log(`   Without correctAnswer:   ${ukbiNoCorrect}`);
  console.log(`   Empty text:              ${ukbiNoText}`);

  // By seksi
  const seksiValues = ["MENDENGARKAN", "MERESPONS_KAIDAH", "MEMBACA", "MENULIS", "BERBICARA"];
  for (const s of seksiValues) {
    const c = await db.uKBIQuestion.count({ where: { seksi: s as any } });
    if (c > 0) console.log(`   ${s}: ${c}`);
  }

  // By difficulty
  const ukbiDifficulties = await db.uKBIQuestion.groupBy({ by: ["difficulty"], _count: true });
  for (const d of ukbiDifficulties) {
    console.log(`   difficulty ${d.difficulty}: ${d._count}`);
  }

  const ukbiNewest = await db.uKBIQuestion.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, text: true, seksi: true, difficulty: true, createdAt: true },
  });
  console.log(`\n   ── 10 UKBI Terbaru ──`);
  for (const q of ukbiNewest) {
    const preview = q.text.length > 80 ? q.text.slice(0, 80) + "..." : q.text;
    console.log(`   [${q.createdAt.toISOString().slice(0, 10)}] [${q.seksi}] [${q.difficulty}] ${preview}`);
  }

  // ── TKAQuestion Stats ──────────────────────────────
  console.log("\n📋 TKA QUESTION");
  const totalTKA = await db.tKAQuestion.count();
  const tkaVerified = await db.tKAQuestion.count({ where: { isVerified: true } });
  const tkaNoOptions = await db.tKAQuestion.count({ where: { options: { equals: [] } } });
  const tkaNoCorrect = await db.tKAQuestion.count({ where: { correctAnswer: "" } });
  const tkaNoText = await db.tKAQuestion.count({ where: { text: "" } });
  console.log(`   Total TKAQuestion:       ${totalTKA}`);
  console.log(`   Verified:                ${tkaVerified}`);
  console.log(`   Without options:         ${tkaNoOptions}`);
  console.log(`   Without correctAnswer:   ${tkaNoCorrect}`);
  console.log(`   Empty text:              ${tkaNoText}`);

  // By kompetensi
  const tkaKompetensi = await db.tKAQuestion.groupBy({ by: ["kompetensi"], _count: true });
  for (const k of tkaKompetensi) {
    console.log(`   ${k.kompetensi}: ${k._count}`);
  }

  const tkaNewest = await db.tKAQuestion.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, text: true, kompetensi: true, difficulty: true, createdAt: true },
  });
  console.log(`\n   ── 10 TKA Terbaru ──`);
  for (const q of tkaNewest) {
    const preview = q.text.length > 80 ? q.text.slice(0, 80) + "..." : q.text;
    console.log(`   [${q.createdAt.toISOString().slice(0, 10)}] [${q.kompetensi}] [${q.difficulty}] ${preview}`);
  }

  // ── PaketKompetensi Stats ──────────────────────────
  console.log("\n📦 PAKET KOMPETENSI");
  const totalPaket = await db.paketKompetensi.count();
  console.log(`   Total Paket:             ${totalPaket}`);
  if (totalPaket > 0) {
    const pakets = await db.paketKompetensi.findMany({
      select: { id: true, title: true, type: true, totalQuestions: true, duration: true, isActive: true },
    });
    for (const p of pakets) {
      const ukbiTingkat = p.type === "UKBI" ? "SMA" : p.type === "TKA" ? "SMP" : undefined;
      const ukbiCount = ukbiTingkat ? await db.uKBIQuestion.count({ where: { tingkat: ukbiTingkat as any } }) : 0;
      const tkaCount = ukbiTingkat ? await db.tKAQuestion.count({ where: { tingkat: ukbiTingkat as any } }) : 0;
      console.log(`   ${p.title} (${p.type}) | target:${p.totalQuestions} soal | durasi:${p.duration} menit | UKBI:${ukbiCount} TKA:${tkaCount} | ${p.isActive ? "✅" : "🔒"}`);
    }
  }


  // ── TestSession Stats ──────────────────────────────
  console.log("\n🧪 TEST SESSION");
  const totalSession = await db.testSession.count();
  const sessionActive = await db.testSession.count({ where: { status: "IN_PROGRESS" as any } });
  const sessionCompleted = await db.testSession.count({ where: { status: "COMPLETED" as any } });
  const sessionExpired = await db.testSession.count({ where: { status: "EXPIRED" as any } });
  console.log(`   Total TestSession:       ${totalSession}`);
  console.log(`   In Progress:             ${sessionActive}`);
  console.log(`   Completed:               ${sessionCompleted}`);
  console.log(`   Expired:                 ${sessionExpired}`);

  // Recent sessions
  const recentSessions = await db.testSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, status: true, createdAt: true, finishedAt: true },
  });
  console.log(`\n   ── 10 Sesi Terbaru ──`);
  for (const s of recentSessions) {
    console.log(`   [${s.createdAt.toISOString().slice(0, 10)}] status: ${s.status} finished: ${s.finishedAt?.toISOString().slice(0, 10) || "-"}`);
  }

  // ── TestAnswer Stats ───────────────────────────────
  console.log("\n📄 TEST ANSWER");
  const totalAnswer = await db.testAnswer.count();
  const answerCorrect = await db.testAnswer.count({ where: { isCorrect: true } });
  const answerWrong = await db.testAnswer.count({ where: { isCorrect: false } });
  const answerNull = await db.testAnswer.count({ where: { isCorrect: null } });
  console.log(`   Total TestAnswer:        ${totalAnswer}`);
  console.log(`   Correct:                 ${answerCorrect}`);
  console.log(`   Wrong:                   ${answerWrong}`);
  console.log(`   Null/ungraded:           ${answerNull}`);

  // ── ProgresKompetensi Stats ────────────────────────
  console.log("\n📈 PROGRES KOMPETENSI");
  const totalProgres = await db.progresKompetensi.count();
  const progresCompleted = await db.progresKompetensi.count({ where: { status: "COMPLETED" as any } });
  const progresInProgress = await db.progresKompetensi.count({ where: { status: "IN_PROGRESS" as any } });
  console.log(`   Total Progres:           ${totalProgres}`);
  console.log(`   Completed:               ${progresCompleted}`);
  console.log(`   In Progress:             ${progresInProgress}`);

  // ── KompetensiCertificate Stats ────────────────────
  console.log("\n📜 SERTIFIKAT");
  const totalCert = await db.kompetensiCertificate.count();
  console.log(`   Total:                   ${totalCert}`);

  // ── Risk Assessment: API endpoints with correctAnswer exposure ──
  console.log("\n⚠️  RISK ASSESSMENT");
  console.log(`   Soal with correctAnswer exposed: ${totalSoal > 0 ? "POTENTIAL RISK" : "N/A"}`);
  console.log(`   UKBI with correctAnswer exposed: ${totalUKBI > 0 ? "POTENTIAL RISK" : "N/A"}`);
  console.log(`   TKA with correctAnswer exposed:  ${totalTKA > 0 ? "POTENTIAL RISK" : "N/A"}`);

  // Check all UKBI questions for correctAnswer field
  const ukbiSample = await db.uKBIQuestion.findFirst({
    select: { correctAnswer: true },
  });
  if (ukbiSample) {
    console.log(`   UKBI sample correctAnswer exists: ${ukbiSample.correctAnswer ? "YES ⚠️" : "NO ✅"}`);
  }

  const tkaSample = await db.tKAQuestion.findFirst({
    select: { correctAnswer: true },
  });
  if (tkaSample) {
    console.log(`   TKA sample correctAnswer exists: ${tkaSample.correctAnswer ? "YES ⚠️" : "NO ✅"}`);
  }

  // ── Summary ─────────────────────────────────────────
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 QUESTION AUDIT SUMMARY");
  console.log(`   Soal:            ${totalSoal}`);
  console.log(`   SoalSet:         ${totalSoalSet}`);
  console.log(`   UKBIQuestion:    ${totalUKBI}`);
  console.log(`   TKAQuestion:     ${totalTKA}`);
  console.log(`   PaketKompetensi: ${totalPaket}`);
  console.log(`   TestSession:     ${totalSession}`);
  console.log(`   TestAnswer:      ${totalAnswer}`);
  console.log(`   ProgresKompet:   ${totalProgres}`);
  console.log(`   Sertifikat:      ${totalCert}`);

  await db.$disconnect();
  console.log("\n✅ Audit complete\n");
}

main().catch((e) => {
  console.error("❌ Audit failed:", e.message);
  process.exit(1);
});
