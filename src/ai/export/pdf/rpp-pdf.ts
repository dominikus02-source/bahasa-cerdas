import PDFDocument from "pdfkit";
import {
  MARGIN, CONTENT_WIDTH, PAGE_HEIGHT, FONT, FONT_BOLD, COLORS,
  sanitizeFilename, addFooter, sectionHeading, bodyText, bulletItem,
  numberedItem, infoLine, emptyLine, separator, checkPageSpace,
} from "./pdf-utils";

function getStr(obj: Record<string, unknown>, key: string, fallback = ""): string {
  const val = obj[key];
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.join(", ");
  return fallback;
}

function getArr(obj: Record<string, unknown>, key: string): string[] {
  const val = obj[key];
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === "string");
  return [];
}

function getSubMap(obj: Record<string, unknown>, key: string): Record<string, string[]> {
  const val = obj[key];
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const result: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(val)) {
      if (Array.isArray(v)) result[k] = v.filter((i): i is string => typeof i === "string");
    }
    return result;
  }
  return {};
}

interface RPPInput {
  title: string;
  output: Record<string, unknown>;
  editableText?: string | null;
}

export async function generateRPppdf(input: RPPInput): Promise<Buffer> {
  const out = input.output;
  const identity = (out.identity as Record<string, unknown>) ?? {};
  const learningObjectives = getArr(out, "learningObjectives");
  const steps = getSubMap(out, "learningSteps");
  const assessment = getSubMap(out, "assessmentPlan");
  const differentiation = getSubMap(out, "differentiationStrategy");

  const doc = new PDFDocument({ size: "A4", margin: MARGIN });
  const buffers: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => buffers.push(chunk));
  doc.on("end", () => {});

  doc.font(FONT).fontSize(10).fillColor(COLORS.DARK);

  // === Cover / Header ===
  doc.font(FONT_BOLD).fontSize(18).fillColor(COLORS.PRIMARY_DARK);
  doc.text("RPP / Modul Ajar", { align: "center", width: CONTENT_WIDTH });
  doc.moveDown(0.3);
  doc.font(FONT).fontSize(14).fillColor(COLORS.DARK);
  doc.text(input.title, { align: "center", width: CONTENT_WIDTH });
  doc.moveDown(0.3);
  doc.font(FONT).fontSize(10).fillColor(COLORS.GRAY);
  doc.text(
    `${getStr(identity, "subject", "Bahasa Indonesia")} | ${getStr(identity, "grade", "—")}`,
    { align: "center", width: CONTENT_WIDTH }
  );
  doc.moveDown(0.2);
  doc.font(FONT).fontSize(9).fillColor(COLORS.GRAY);
  doc.text("Dibuat dengan BahasaCerdas AI", { align: "center", width: CONTENT_WIDTH });
  doc.moveDown(0.5);
  separator(doc);

  // 1. Identitas
  sectionHeading(doc, "1. Identitas");
  infoLine(doc, "Mata Pelajaran", getStr(identity, "subject", "Bahasa Indonesia"));
  infoLine(doc, "Kelas / Fase", getStr(identity, "grade", "—"));
  infoLine(doc, "Semester", getStr(identity, "semester", "1 (Ganjil)"));
  infoLine(doc, "Kurikulum", getStr(identity, "curriculum", "Kurikulum Merdeka"));
  infoLine(doc, "Topik", getStr(identity, "topic", "—"));
  infoLine(doc, "Durasi", getStr(identity, "duration", "—"));
  infoLine(doc, "Jumlah Pertemuan", getStr(identity, "meetingCount", "1"));
  emptyLine(doc);

  // 2. Profil Murid
  checkPageSpace(doc, 60);
  sectionHeading(doc, "2. Profil Murid");
  const profil = getArr(out, "studentProfile");
  if (profil.length > 0) {
    profil.forEach((p) => bulletItem(doc, p));
  } else {
    bodyText(doc, "—");
  }

  // 3. Pengetahuan Awal
  checkPageSpace(doc, 60);
  sectionHeading(doc, "3. Pengetahuan Awal");
  const prior = getArr(out, "priorKnowledge");
  if (prior.length > 0) {
    prior.forEach((p) => bulletItem(doc, p));
  } else {
    bodyText(doc, "—");
  }

  // 4. Tujuan Pembelajaran
  checkPageSpace(doc, 60);
  sectionHeading(doc, "4. Tujuan Pembelajaran");
  if (learningObjectives.length > 0) {
    learningObjectives.forEach((lo, i) => numberedItem(doc, i + 1, lo));
  } else {
    bodyText(doc, "—");
  }

  // 5. Kriteria Keberhasilan
  checkPageSpace(doc, 60);
  sectionHeading(doc, "5. Kriteria Keberhasilan");
  const criteria = getArr(out, "successCriteria");
  if (criteria.length > 0) {
    criteria.forEach((c) => bulletItem(doc, c));
  } else {
    bodyText(doc, "—");
  }

  // 6. Materi Pembelajaran
  checkPageSpace(doc, 60);
  sectionHeading(doc, "6. Materi Pembelajaran");
  const materi = getArr(out, "learningMaterials");
  if (materi.length > 0) {
    materi.forEach((m) => bulletItem(doc, m));
  } else {
    bodyText(doc, "—");
  }

  // 7. Sumber Belajar
  checkPageSpace(doc, 60);
  sectionHeading(doc, "7. Sumber Belajar");
  const sumber = getArr(out, "learningResources");
  if (sumber.length > 0) {
    sumber.forEach((s) => bulletItem(doc, s));
  } else {
    bodyText(doc, "—");
  }

  // 8. Model Pembelajaran
  checkPageSpace(doc, 30);
  sectionHeading(doc, "8. Model Pembelajaran");
  bodyText(doc, getStr(out, "learningModel", "—"));

  // 9. Langkah Pembelajaran
  checkPageSpace(doc, 80);
  sectionHeading(doc, "9. Langkah Pembelajaran");
  if (steps.opening?.length) {
    bodyText(doc, "Pendahuluan", { bold: true });
    steps.opening.forEach((s, i) => numberedItem(doc, i + 1, s));
  }
  if (steps.core?.length) {
    checkPageSpace(doc, 40);
    bodyText(doc, "Kegiatan Inti", { bold: true });
    steps.core.forEach((s, i) => numberedItem(doc, i + 1, s));
  }
  if (steps.closing?.length) {
    checkPageSpace(doc, 40);
    bodyText(doc, "Penutup", { bold: true });
    steps.closing.forEach((s, i) => numberedItem(doc, i + 1, s));
  }

  // 10. Asesmen
  checkPageSpace(doc, 60);
  sectionHeading(doc, "10. Asesmen");
  if (assessment.diagnostik?.length) {
    bodyText(doc, "Diagnostik", { bold: true });
    assessment.diagnostik.forEach((a) => bulletItem(doc, a));
  }
  if (assessment.formatif?.length) {
    bodyText(doc, "Formatif", { bold: true });
    assessment.formatif.forEach((a) => bulletItem(doc, a));
  }
  if (assessment.sumatif?.length) {
    bodyText(doc, "Sumatif", { bold: true });
    assessment.sumatif.forEach((a) => bulletItem(doc, a));
  }
  if (Object.keys(assessment).length === 0) {
    bodyText(doc, "—");
  }

  // 11. Diferensiasi
  checkPageSpace(doc, 60);
  sectionHeading(doc, "11. Diferensiasi");
  if (differentiation.konten?.length) {
    bodyText(doc, "Konten", { bold: true });
    differentiation.konten.forEach((d) => bulletItem(doc, d));
  }
  if (differentiation.proses?.length) {
    bodyText(doc, "Proses", { bold: true });
    differentiation.proses.forEach((d) => bulletItem(doc, d));
  }
  if (differentiation.produk?.length) {
    bodyText(doc, "Produk", { bold: true });
    differentiation.produk.forEach((d) => bulletItem(doc, d));
  }
  if (Object.keys(differentiation).length === 0) {
    bodyText(doc, "—");
  }

  // 12. LKPD
  checkPageSpace(doc, 40);
  sectionHeading(doc, "12. LKPD");
  const lkpd = getStr(out, "worksheetDescription") || getStr(out, "lkpd");
  if (lkpd) {
    bodyText(doc, lkpd);
  } else {
    bodyText(doc, "—");
  }

  // 13. Rubrik
  checkPageSpace(doc, 60);
  sectionHeading(doc, "13. Rubrik Penilaian");
  const rubric = out.rubric as Record<string, unknown> | undefined;
  if (rubric?.criteria && Array.isArray(rubric.criteria)) {
    for (const c of rubric.criteria) {
      const cr = c as Record<string, string>;
      bodyText(doc, cr.name || "—", { bold: true });
      if (cr.excellent) doc.text(`Unggul: ${cr.excellent}`, { indent: 15 });
      if (cr.good) doc.text(`Baik: ${cr.good}`, { indent: 15 });
      if (cr.needsImprovement) doc.text(`Perlu Perbaikan: ${cr.needsImprovement}`, { indent: 15 });
      emptyLine(doc);
    }
  } else {
    bodyText(doc, "—");
  }

  // 14. Remedial dan Pengayaan
  checkPageSpace(doc, 60);
  sectionHeading(doc, "14. Remedial dan Pengayaan");
  const remedial = getArr(out, "remedialPlan");
  if (remedial.length > 0) {
    bodyText(doc, "Remedial", { bold: true });
    remedial.forEach((r) => bulletItem(doc, r));
  }
  const enrich = getArr(out, "enrichmentPlan");
  if (enrich.length > 0) {
    bodyText(doc, "Pengayaan", { bold: true });
    enrich.forEach((e) => bulletItem(doc, e));
  }
  if (remedial.length === 0 && enrich.length === 0) {
    bodyText(doc, "—");
  }

  // 15. Refleksi
  checkPageSpace(doc, 60);
  sectionHeading(doc, "15. Refleksi");
  const refleksiGuru = getArr(out, "guruReflection");
  if (refleksiGuru.length > 0) {
    bodyText(doc, "Refleksi Guru", { bold: true });
    refleksiGuru.forEach((r) => bulletItem(doc, r));
  }
  const refleksiMurid = getArr(out, "studentReflection");
  if (refleksiMurid.length > 0) {
    bodyText(doc, "Refleksi Murid", { bold: true });
    refleksiMurid.forEach((r) => bulletItem(doc, r));
  }
  if (refleksiGuru.length === 0 && refleksiMurid.length === 0) {
    bodyText(doc, "—");
  }

  // 16. Catatan Guru
  checkPageSpace(doc, 40);
  sectionHeading(doc, "16. Catatan Guru");
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

export function getRPPMetadata(output: Record<string, unknown>): { title: string; filename: string } {
  const identity = (output.identity as Record<string, unknown>) ?? {};
  const subject = getStr(identity, "subject", "Bahasa Indonesia");
  const topic = getStr(identity, "topic", "RPP");
  const title = `RPP ${subject} — ${topic}`;
  const filename = `${sanitizeFilename(title)}.pdf`;
  return { title, filename };
}
