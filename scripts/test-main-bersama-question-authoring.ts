import assert from "node:assert/strict";
import { Document, Packer, Paragraph } from "docx";
import PDFDocument from "pdfkit";
import {
  parseQuestionText,
  packageDraftSchema,
} from "../lib/main-bersama/question-authoring";
import { importQuestionDocument } from "../lib/main-bersama/import-question-document";
import { adaptQuestion } from "../src/main-bersama/adapters/bank-soal/adapt-question";
const source =
  "1. Kata baku yang tepat?\nA. Aktivitas\nB. Aktifitas\nJawaban: A\nPembahasan: Aktivitas adalah kata baku.\n2. Lawan kata besar?\nA. Tinggi\nB. Kecil\nJawaban: B";
async function main() {
  const result = parseQuestionText(source);
  assert.equal(result.questions.length, 2);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.questions[1].correctIndex, 1);
  assert.equal(
    parseQuestionText("7. Soal?\nA. Aaa\nB. Bbb\nKunci Jawaban\n7. B")
      .questions[0].correctIndex,
    1,
  );
  assert.equal(
    parseQuestionText("1. Soal?\nA. Aaa\nB. Bbb").questions[0].correctIndex,
    null,
  );
  assert.equal(
    parseQuestionText("Tidak ada soal bernomor").questions.length,
    0,
  );
  const input = {
    title: "Guru sendiri",
    kelas: "VII",
    reviewed: true,
    questions: result.questions,
  };
  assert(packageDraftSchema.safeParse(input).success);
  for (const bad of [
    { ...input, reviewed: false },
    { ...input, questions: [] },
    { ...input, questions: [{ ...result.questions[0], correctIndex: 4 }] },
    {
      ...input,
      questions: [{ ...result.questions[0], options: ["Sama", "sama"] }],
    },
  ])
    assert(!packageDraftSchema.safeParse(bad).success);
  for (const q of result.questions)
    assert(
      adaptQuestion({
        sourceQuestionId: "test",
        type: "PILIHAN_GANDA",
        prompt: q.prompt,
        options: q.options,
        correctAnswer: String(q.correctIndex),
        explanation: q.explanation,
      }).ok,
    );
  const docx = await Packer.toBuffer(
    new Document({
      sections: [{ children: source.split("\n").map((t) => new Paragraph(t)) }],
    }),
  );
  const imported = await importQuestionDocument("soal.docx", docx);
  assert.equal(imported.questions.length, 2);
  assert.equal(imported.questions[1].correctIndex, 1);
  const pdf = new PDFDocument({ compress: false, pdfVersion: "1.4" });
  const chunks: Buffer[] = [];
  const bytes = new Promise<Buffer>((resolve, reject) => {
    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
  });
  pdf.text(source);
  pdf.end();
  const importedPdf = await importQuestionDocument("soal.pdf", await bytes);
  assert.equal(importedPdf.questions.length, 2);
  assert.equal(importedPdf.questions[0].correctIndex, 0);
  await assert.rejects(
    importQuestionDocument("fake.pdf", Buffer.from("fake pdf")),
    /Format file/,
  );
  await assert.rejects(
    importQuestionDocument("soal.docx", Buffer.alloc(4 * 1024 * 1024)),
    /3 MB/,
  );
  console.log(
    "Question authoring: parser, validation, PDF, DOCX, and game adapter passed.",
  );
}
void main();
