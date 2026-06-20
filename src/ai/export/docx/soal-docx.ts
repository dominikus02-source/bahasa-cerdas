import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table,
} from "docx";
import {
  sectionHeading, bodyText, emptyLine, footerNote, createInfoTable,
  buildBulletList, indentedText, sanitizeFilename,
} from "./docx-utils";

interface SoalInput {
  title: string;
  output: Record<string, unknown>;
  editableText?: string | null;
}

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

export async function generateSoalDocx(input: SoalInput): Promise<Buffer> {
  const out = input.output;
  const questions = (out.questions as Record<string, unknown>[]) ?? [];

  const sections: (Paragraph | Table)[] = [];

  // Title
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: "PAKET SOAL", bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: input.title, size: 24, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // 1. Informasi Soal
  sections.push(sectionHeading("1. Informasi Soal"));
  const infoRows = [
    { label: "Mata Pelajaran", value: getStr(out, "subject", "Bahasa Indonesia") },
    { label: "Kelas", value: getStr(out, "grade", "—") },
    { label: "Topik", value: getStr(out, "topic", "—") },
    { label: "Tingkat Kesulitan", value: getStr(out, "difficulty", "—") },
    { label: "Jumlah Soal", value: String(questions.length) },
  ];
  sections.push(createInfoTable(infoRows));
  sections.push(emptyLine());

  // 2. Stimulus
  const stimulus = out.stimulus as Record<string, unknown> | undefined;
  if (stimulus) {
    sections.push(sectionHeading("2. Stimulus"));
    const stimTitle = getStr(stimulus, "title");
    if (stimTitle) sections.push(bodyText(stimTitle, { bold: true }));
    const stimText = getStr(stimulus, "text");
    if (stimText) sections.push(bodyText(stimText, { italic: true }));
    const stimSource = getStr(stimulus, "source");
    if (stimSource) sections.push(bodyText(`Sumber: ${stimSource}`, { italic: true }));
    sections.push(emptyLine());
  }

  // 3. Daftar Soal
  sections.push(sectionHeading("3. Daftar Soal"));

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

    // Question header
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${qNumber}. `, bold: true, size: 22 }),
          new TextRun({ text: qText, size: 22 }),
        ],
        spacing: { before: 160, after: 60 },
      })
    );

    // Meta badges
    const metaParts = [qType];
    if (qDifficulty) metaParts.push(qDifficulty);
    if (qBloom) metaParts.push(qBloom);
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `[${metaParts.join(" · ")}]`, size: 18, italics: true, color: "666666" })],
        spacing: { after: 60 },
      })
    );

    // Options (for PG, PG Kompleks, dll)
    if (options.length > 0) {
      const letters = ["A", "B", "C", "D", "E", "F"];
      for (let j = 0; j < options.length; j++) {
        const letter = letters[j] || String.fromCharCode(65 + j);
        const isCorrect = options[j] === answer;
        sections.push(
          indentedText(`${letter}. ${options[j]}`, { bold: isCorrect })
        );
      }
    }

    // Answer space for isian/uraian
    if (qType.includes("Uraian") || qType.includes("Isian") || qType.includes("Essay")) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: "Jawaban: .........................................................................", size: 22, color: "999999" })],
          spacing: { before: 60, after: 60 },
        })
      );
    }

    if (explanation) {
      sections.push(bodyText(`Pembahasan: ${explanation}`, { italic: true }));
    }

    sections.push(emptyLine());
  }

  // 4. Kunci Jawaban
  sections.push(sectionHeading("4. Kunci Jawaban"));

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qNumber = i + 1;
    const qAnswer = getStr(q, "answer", "—");
    const qExplanation = getStr(q, "explanation", "");

    const answerLine = `${qNumber}. ${qAnswer}`;
    if (qExplanation) {
      sections.push(bodyText(`${answerLine} — ${qExplanation}`));
    } else {
      sections.push(bodyText(answerLine));
    }
  }

  // 5. Rubrik (if available)
  const rubric = out.rubric as Record<string, unknown> | undefined;
  if (rubric) {
    sections.push(sectionHeading("5. Rubrik Penilaian"));
    const criteria = rubric.criteria as Record<string, string>[] | undefined;
    if (criteria && criteria.length > 0) {
      for (const c of criteria) {
        sections.push(bodyText(c.name || "—", { bold: true }));
        if (c.excellent) sections.push(indentedText(`Unggul: ${c.excellent}`));
        if (c.good) sections.push(indentedText(`Baik: ${c.good}`));
        if (c.needsImprovement) sections.push(indentedText(`Perlu Perbaikan: ${c.needsImprovement}`));
        sections.push(emptyLine());
      }
    }
  }

  // 6. Catatan Guru
  sections.push(sectionHeading("6. Catatan Guru"));
  sections.push(bodyText(getStr(out, "teacherNotes", "—")));

  // Footer
  sections.push(emptyLine());
  sections.push(footerNote());

  const doc = new Document({
    title: input.title,
    description: "Soal generated by BahasaCerdas AI",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
          paragraph: { spacing: { after: 80 } },
        },
      },
    },
    sections: [{ children: sections }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

export function getSoalMetadata(output: Record<string, unknown>): { title: string; filename: string } {
  const subject = getStr(output, "subject", "Bahasa Indonesia");
  const topic = getStr(output, "topic", "Soal");
  const title = `Soal ${subject} — ${topic}`;
  return { title, filename: `${sanitizeFilename(title)}.docx` };
}
