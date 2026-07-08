/**
 * RPP Pipeline Test — normalizer, renderer, fallback, dan jalur runner.
 *
 * Menguji skenario dari brief perbaikan "Gagal memproses":
 *  S1  input lengkap → dokumen memuat identitas + pengesahan
 *  S2  input minimal → field kosong jadi titik-titik, tidak gagal
 *  S3  provider gagal total → fallback template sukses (stream & non-stream)
 *  S4  provider mengembalikan object {displayText/editableText}
 *  S5  provider mengembalikan nested {result:{...}} / {data:{...}}
 *  S6  save history tidak memblokir (structural check)
 *  S7  export tidak dipanggil otomatis (structural check)
 *  S8  agent lain tetap terdaftar
 *
 * Jalankan: npx tsx scripts/test-rpp-pipeline.ts
 */

// Matikan provider agar jalur fallback teruji; dummy DB agar Prisma tidak crash
process.env.DEEPSEEK_API_KEY = "";
process.env.GROQ_API_KEY = "";
process.env.GEMINI_API_KEY = "";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://x:x@127.0.0.1:5/x";
process.env.DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

import { readFileSync } from "fs";
import {
  normalizeRppResult,
  renderRppDocument,
  pickTextDeep,
} from "../src/ai/core/rpp-normalizer";
import { generateRPPFallback } from "../src/ai/core/rpp-fallback-template";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const inputLengkap = {
  subject: "Bahasa Indonesia",
  grade: "VII",
  semester: "I",
  curriculum: "Kurikulum Merdeka",
  topic: "Teks Deskripsi",
  duration: "2 JP",
  schoolName: "SMP Negeri 1 Contoh",
  teacherName: "Bu Sari",
  principalName: "Pak Budi",
  academicYear: "2026/2027",
  learningObjectives: ["Memahami struktur teks deskripsi"],
  meetingCount: 1,
};

const inputMinimal = {
  subject: "Bahasa Indonesia",
  grade: "VII",
  curriculum: "Kurikulum Merdeka",
  topic: "Teks Deskripsi",
  duration: "2 JP",
  learningObjectives: ["Memahami teks deskripsi"],
  meetingCount: 1,
};

const DOC_500 = "MODUL AJAR TEKS DESKRIPSI\n" + "Isi dokumen pembelajaran lengkap. ".repeat(30);

console.log("\n── Normalizer & bentuk respons (S4/S5) ──");
check("string panjang dipakai apa adanya", normalizeRppResult(DOC_500, inputMinimal)?.doc === DOC_500.trim());
check("object.displayText", normalizeRppResult({ displayText: DOC_500 }, inputMinimal)?.doc === DOC_500.trim());
check("object.editableText", normalizeRppResult({ editableText: DOC_500 }, inputMinimal)?.doc === DOC_500.trim());
check("object.content", normalizeRppResult({ content: DOC_500 }, inputMinimal)?.doc === DOC_500.trim());
check("object.markdown", pickTextDeep({ markdown: DOC_500 }) === DOC_500.trim());
check("nested result.displayText (S5)", normalizeRppResult({ result: { displayText: DOC_500 } }, inputMinimal)?.doc === DOC_500.trim());
check("nested data.editableText (S5)", normalizeRppResult({ data: { editableText: DOC_500 } }, inputMinimal)?.doc === DOC_500.trim());
check("nested output.text", normalizeRppResult({ output: { text: DOC_500 } }, inputMinimal)?.doc === DOC_500.trim());
check("garbage → null (bukan [object Object])", normalizeRppResult({ foo: 1 }, inputMinimal) === null);
check("JSON mentah tidak pernah lolos sebagai doc", !(normalizeRppResult({ foo: 1 }, inputMinimal)?.doc ?? "").includes("[object Object]"));

console.log("\n── Renderer objek terstruktur → dokumen ──");
const structured = {
  title: "Modul Ajar Teks Deskripsi",
  identity: { subject: "Bahasa Indonesia", grade: "VII", curriculum: "Kurikulum Merdeka", topic: "Teks Deskripsi", duration: "2 JP" },
  learningObjectives: ["Tujuan 1", "Tujuan 2"],
  capaianPembelajaran: "Peserta didik mampu memahami teks deskripsi.",
  pemahamanBermakna: "Deskripsi membantu menggambarkan dunia.",
  pertanyaanPemantik: ["Apa itu deskripsi?"],
  learningSteps: { opening: ["Salam"], core: ["Diskusi"], closing: ["Refleksi"] },
  assessmentPlan: { diagnostic: ["Tanya jawab"], formative: ["Observasi"], summative: ["Tes tulis"] },
  reflection: { teacherReflection: ["Apakah efektif?"], studentReflection: ["Apa yang menarik?"] },
};
const rendered = normalizeRppResult(structured, inputLengkap);
check("objek RPP dirender jadi dokumen", !!rendered && rendered.usedFallbackRender);
const doc = rendered?.doc ?? "";
check("ada Identitas Dokumen", doc.includes("Identitas Dokumen"));
check("ada nama sekolah dari input (S1)", doc.includes("SMP Negeri 1 Contoh"));
check("ada nama guru (S1)", doc.includes("Bu Sari"));
check("ada Lembar Pengesahan (S1)", doc.includes("Lembar Pengesahan"));
check("ada Langkah Pembelajaran", doc.includes("Langkah Pembelajaran"));
check("ada Asesmen", doc.includes("Asesmen"));
check("ada footer BahasaCerdas", doc.includes("Dibuat dengan BahasaCerdas.com"));

console.log("\n── Input minimal → titik-titik, tidak gagal (S2) ──");
const docMin = renderRppDocument(structured, inputMinimal);
check("sekolah kosong jadi titik-titik", docMin.includes("........................................"));
check("dokumen tetap lengkap", docMin.includes("Lembar Pengesahan") && docMin.includes("Dibuat dengan BahasaCerdas.com"));

console.log("\n── Fallback template (S3 konten) ──");
const fb = generateRPPFallback(inputMinimal as never);
check("fallback berisi tujuan pembelajaran", /Tujuan Pembelajaran/i.test(fb));
check("fallback berisi langkah/kegiatan", /Kegiatan|Langkah/i.test(fb));
check("fallback berisi asesmen", /Asesmen|Penilaian/i.test(fb));
check("fallback berisi refleksi", /Refleksi/i.test(fb));
check("fallback berisi footer BahasaCerdas", /BahasaCerdas/i.test(fb));
check("fallback cukup panjang (dokumen layak)", fb.length > 1500, `len=${fb.length}`);

console.log("\n── S3: provider gagal total → runner tetap sukses dengan fallback ──");
async function testRunners() {
  const { runAgentStream } = await import("../src/ai/core/agent-stream-runner");
  const { runAgent } = await import("../src/ai/core/agent-runner");
  await import("../src/ai");

  const context = {
    userId: "test-user",
    userRole: "guru",
    isPremium: true,
    requestId: "req_test",
    timestamp: new Date(),
    db: null,
  } as never;

  // Stream path
  const events: { type: string; [k: string]: unknown }[] = [];
  await runAgentStream(
    { agentId: "rpp", input: inputLengkap as never, context },
    (e) => events.push(e as never)
  );
  const finalEv = events.find((e) => e.type === "final_result") as { result?: { success?: boolean; text?: string; warnings?: string[]; provider?: string } } | undefined;
  const errorEv = events.find((e) => e.type === "error");
  check("stream: tidak ada event error", !errorEv, JSON.stringify(errorEv ?? {}));
  check("stream: final_result sukses", finalEv?.result?.success === true);
  check("stream: hasil = dokumen fallback (bukan kosong)", (finalEv?.result?.text ?? "").length > 1500);
  check("stream: ada warning fallback", (finalEv?.result?.warnings ?? []).some((w: string) => /fallback/i.test(w)));
  check("stream: provider = fallback-template", finalEv?.result?.provider === "fallback-template");
  check("stream: bukan JSON mentah", !(finalEv?.result?.text ?? "").trim().startsWith("{"));

  // Non-stream path
  const { getAgent } = await import("../src/ai/core/agent-registry");
  const agent = getAgent("rpp" as never)!;
  const res = await runAgent({ agent, input: inputLengkap as never, context });
  check("non-stream: sukses dengan fallback", res.success === true);
  check("non-stream: teks = dokumen", (res.text ?? "").length > 1500 && !(res.text ?? "").trim().startsWith("{"));
  check("non-stream: warning fallback ada", res.warnings.some((w) => /fallback/i.test(w)));

  // S8: agent lain tetap terdaftar
  const { agentCount, getAgent: ga } = await import("../src/ai/core/agent-registry");
  check("S8: 9 agent terdaftar", agentCount() >= 9, `count=${agentCount()}`);
  for (const id of ["soal", "ppt", "eyd", "feedback", "grading", "text-analysis", "review", "bc-assistant"]) {
    check(`S8: agent '${id}' ada`, !!ga(id as never));
  }
}

console.log("\n── S6/S7: structural checks ──");
const clientSrc = readFileSync("app/(dashboard)/guru/ai-tools/_components/alat-ai-client.tsx", "utf8");
check("S7: export tidak dipanggil otomatis saat generate", !/handleGenerate[\s\S]{0,400}downloadDocxExport/.test(clientSrc));
check("client fallback non-stream saat stream mati di tengah", clientSrc.includes("if (!streamingResolved && !isCancelled) {"));
const streamRunnerSrc = readFileSync("src/ai/core/agent-stream-runner.ts", "utf8");
check("S6: logUsage non-blocking (.catch)", /logUsage\([\s\S]*?\)\.catch\(\(\) => \{\}\)/.test(streamRunnerSrc));
const runnerSrc = readFileSync("src/ai/core/agent-runner.ts", "utf8");
check("S6: logUsage non-blocking di runner", /logUsage\(\{[\s\S]*?\}\)\.catch\(\(\) => \{\}\)/.test(runnerSrc));
const providerSrc = readFileSync("src/ai/core/provider.ts", "utf8");
check("provider: tidak ada AbortSignal.timeout di streaming", !/streamDeepSeek[\s\S]*AbortSignal\.timeout/.test(providerSrc.split("// ─── Streaming support")[1] ?? ""));
check("provider: interrupted error membawa teks parsial", providerSrc.includes("ProviderStreamInterruptedError"));
check("provider: groq streaming tanpa response_format json", /JANGAN kirim response_format json_object saat streaming/.test(providerSrc));

testRunners()
  .then(() => {
    console.log(`\n════════════════════════════════`);
    console.log(`Hasil: ${pass} lulus, ${fail} gagal`);
    process.exit(fail > 0 ? 1 : 0);
  })
  .catch((e) => {
    console.error("Test crash:", e);
    process.exit(1);
  });
