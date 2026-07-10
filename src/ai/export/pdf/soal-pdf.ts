import {
  CONTENT_WIDTH, PAGE_HEIGHT, FONT, FONT_BOLD, COLORS,
  sanitizeFilename, addFooter, sectionHeading, bodyText, bulletItem,
  numberedItem, infoLine, emptyLine, separator, checkPageSpace, createPdfDoc,
} from "./pdf-utils";

function getStr(obj: Record<string, unknown>, key: string, fallback = ""): string {
  const val = obj[key];
  if (typeof val === "string") return val;
  return fallback;
}

function getArr(obj: Record<string, unknown>, key: string): string[] {
  const val = obj[key];
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === "string");
  return [];
}

interface SoalInput {
  title: string;
  output: Record<string, unknown>;
  editableText?: string | null;
}

export async function generateSoalPdf(input: SoalInput): Promise<Buffer> {
  const out = input.output;
  const questions = (out.questions as Record<string, unknown>[]) ?? [];

  const doc = createPdfDoc();
  const buffers: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => buffers.push(chunk));

  doc.font(FONT).fontSize(10).fillColor(COLORS.DARK);

  // === Header ===
  doc.font(FONT_BOLD).fontSize(18).fillColor(COLORS.PRIMARY_DARK);
  doc.text("Paket Soal", { align: "center", width: CONTENT_WIDTH });
  doc.moveDown(0.3);
  doc.font(FONT).fontSize(14).fillColor(COLORS.DARK);
  doc.text(input.title, { align: "center", width: CONTENT_WIDTH });
  doc.moveDown(0.3);
  doc.font(FONT).fontSize(10).fillColor(COLORS.GRAY);
  doc.text(
    `${getStr(out, "subject", "Bahasa Indonesia")} | ${getStr(out, "grade", "—")}`,
    { align: "center", width: CONTENT_WIDTH }
  );
  doc.moveDown(0.2);
  doc.font(FONT).fontSize(9).fillColor(COLORS.GRAY);
  doc.text("Dibuat dengan BahasaCerdas AI", { align: "center", width: CONTENT_WIDTH });
  doc.moveDown(0.5);
  separator(doc);

  // 1. Informasi Soal
  sectionHeading(doc, "1. Informasi Soal");
  infoLine(doc, "Mata Pelajaran", getStr(out, "subject", "Bahasa Indonesia"));
  infoLine(doc, "Kelas", getStr(out, "grade", "—"));
  infoLine(doc, "Topik", getStr(out, "topic", "—"));
  infoLine(doc, "Tingkat Kesulitan", getStr(out, "difficulty", "—"));
  infoLine(doc, "Jumlah Soal", String(questions.length));
  emptyLine(doc);

  // 2. Stimulus
  const stimulus = out.stimulus as Record<string, unknown> | undefined;
  if (stimulus) {
    checkPageSpace(doc, 60);
    sectionHeading(doc, "2. Stimulus");
    const stimTitle = getStr(stimulus, "title");
    if (stimTitle) bodyText(doc, stimTitle, { bold: true });
    const stimText = getStr(stimulus, "text");
    if (stimText) bodyText(doc, stimText, { italic: true });
    const stimSource = getStr(stimulus, "source");
    if (stimSource) bodyText(doc, `Sumber: ${stimSource}`, { italic: true });
    emptyLine(doc);
  }

  // 3. Daftar Soal
  checkPageSpace(doc, 40);
  sectionHeading(doc, "3. Daftar Soal");

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qNumber = i + 1;
    const qType = getStr(q, "type", "PILIHAN_GANDA").replace(/_/g, " ");
    const qText = getStr(q, "question", "");
    const qDifficulty = getStr(q, "difficulty", "");
    const qBloom = getStr(q, "bloomLevel", "");
    const options = getArr(q, "options");
    const answer = getStr(q, "answer", "");
    const explanation = getStr(q, "explanation", "");

    checkPageSpace(doc, 50);

    // Question number + text
    doc.font(FONT_BOLD).fontSize(10).fillColor(COLORS.DARK);
    doc.text(`${qNumber}. `, { continued: true });
    doc.font(FONT).fillColor(COLORS.DARK);
    doc.text(qText);

    // Meta info
    const metaParts = [qType];
    if (qDifficulty) metaParts.push(qDifficulty);
    if (qBloom) metaParts.push(qBloom);
    doc.font(FONT).fontSize(8).fillColor(COLORS.GRAY);
    doc.text(`[${metaParts.join(" · ")}]`);
    doc.fillColor(COLORS.DARK).fontSize(10);

    // Options
    if (options.length > 0) {
      const letters = ["A", "B", "C", "D", "E", "F"];
      for (let j = 0; j < options.length; j++) {
        const letter = letters[j] || String.fromCharCode(65 + j);
        const isCorrect = options[j] === answer;
        doc.font(isCorrect ? FONT_BOLD : FONT).fontSize(10).fillColor(COLORS.DARK);
        doc.text(`${letter}. ${options[j]}`, { indent: 20 });
      }
    }

    // Answer space for essays
    if (qType.includes("Uraian") || qType.includes("Isian") || qType.includes("Essay")) {
      doc.moveDown(0.3);
      doc.font(FONT).fontSize(10).fillColor(COLORS.GRAY);
      doc.text("Jawaban: ".padEnd(60, "."), { indent: 15 });
      doc.fillColor(COLORS.DARK);
    }

    // Explanation
    if (explanation) {
      doc.moveDown(0.2);
      doc.font(FONT).fontSize(9).fillColor(COLORS.GRAY);
      doc.text(`Pembahasan: ${explanation}`, { indent: 15 });
      doc.fillColor(COLORS.DARK);
    }

    emptyLine(doc);
  }

  // 4. Kunci Jawaban
  checkPageSpace(doc, 40);
  separator(doc);
  doc.font(FONT_BOLD).fontSize(14).fillColor(COLORS.PRIMARY_DARK);
  doc.text("Kunci Jawaban", { align: "center", width: CONTENT_WIDTH });
  doc.moveDown(0.3);
  doc.font(FONT).fontSize(10).fillColor(COLORS.DARK);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const answer = getStr(q, "answer", "—");
    const qType = getStr(q, "type", "PILIHAN_GANDA");
    const explanation = getStr(q, "explanation", "");

    checkPageSpace(doc, 20);
    doc.font(FONT_BOLD).fontSize(10);
    doc.text(`${i + 1}. `, { continued: true });
    doc.font(FONT);

    if (qType.includes("Uraian") || qType.includes("Isian") || qType.includes("Essay")) {
      doc.text(answer);
    } else {
      doc.text(answer);
    }

    if (explanation) {
      doc.font(FONT).fontSize(9).fillColor(COLORS.GRAY);
      doc.text(`  ${explanation}`, { indent: 15 });
      doc.fillColor(COLORS.DARK).fontSize(10);
    }
  }

  // 5. Rubrik
  const rubric = out.rubric as Record<string, unknown> | undefined;
  if (rubric?.criteria && Array.isArray(rubric.criteria)) {
    checkPageSpace(doc, 40);
    separator(doc);
    sectionHeading(doc, "5. Rubrik Penilaian");
    for (const c of rubric.criteria) {
      const cr = c as Record<string, string>;
      bodyText(doc, cr.name || "—", { bold: true });
      if (cr.excellent) doc.text(`Unggul: ${cr.excellent}`, { indent: 15 });
      if (cr.good) doc.text(`Baik: ${cr.good}`, { indent: 15 });
      if (cr.needsImprovement) doc.text(`Perlu Perbaikan: ${cr.needsImprovement}`, { indent: 15 });
      emptyLine(doc);
    }
  }

  // 6. Catatan Guru
  checkPageSpace(doc, 30);
  separator(doc);
  sectionHeading(doc, "Catatan Guru");
  bodyText(doc, getStr(out, "teacherNotes", "—"));

  // Footer
  separator(doc);
  addFooter(doc);

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });
  });
}

export function getSoalMetadata(output: Record<string, unknown>): { title: string; filename: string } {
  const subject = getStr(output, "subject", "Bahasa Indonesia");
  const topic = getStr(output, "topic", "Soal");
  const title = `Soal ${subject} — ${topic}`;
  const filename = `${sanitizeFilename(title)}.pdf`;
  return { title, filename };
}
