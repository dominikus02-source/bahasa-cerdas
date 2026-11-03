/**
 * Ekspor Word (.docx) naskah AKU SASTRAWAN — HANYA server (pustaka `docx`).
 * Font serif umum (Georgia → Times New Roman), bahasa dokumen id-ID, judul &
 * bab sebagai Heading (muncul di panel navigasi Word), tiap bab di halaman
 * baru, nomor halaman di kaki. Teks Unicode (termasuk emoji) dipertahankan.
 */
import {
  AlignmentType, Document, Footer, HeadingLevel, LevelFormat, Packer, PageNumber, Paragraph, TextRun,
} from "docx";
import { pecahParagraf, type Naskah } from "./naskah";

const FONT = "Georgia";
const BAHASA = { value: "id-ID" } as const;

function prosa(isi: string, babBaru: boolean): Paragraph[] {
  const out: Paragraph[] = [];
  pecahParagraf(isi).forEach((p, i) => {
    if (p.jedaSebelum) {
      out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 }, children: [new TextRun({ text: "*  *  *", color: "78716C" })] }));
    }
    const awal = i === 0 || p.jedaSebelum;
    out.push(new Paragraph({ style: "Prosa", indent: awal ? undefined : { firstLine: 397 }, children: [new TextRun(p.teks)] }));
  });
  if (!out.length) out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: babBaru ? "Bab ini belum berisi tulisan." : "Naskah ini belum berisi tulisan.", italics: true, color: "78716C" })] }));
  return out;
}

export async function buatDocxNaskah(n: Naskah): Promise<Buffer> {
  const kepala: Paragraph[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 160 }, children: [new TextRun({ text: n.jenis, italics: true, color: "57534E", size: 24 })] }),
    new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun(n.judul)] }),
  ];
  if (n.penulis) kepala.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240 }, children: [new TextRun({ text: `oleh ${n.penulis}`, italics: true, size: 28 })] }));

  const rancangan: Paragraph[] = [];
  if (n.sinopsis || n.peta.length) {
    rancangan.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun("Rancangan Cerita")] }));
    if (n.sinopsis) {
      rancangan.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Sinopsis")] }));
      for (const p of pecahParagraf(n.sinopsis)) rancangan.push(new Paragraph({ style: "Rancangan", children: [new TextRun(p.teks)] }));
    }
    if (n.peta.length) {
      rancangan.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Peta Cerita")] }));
      for (const bagian of n.peta) {
        rancangan.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(bagian.judul)] }));
        for (const b of bagian.butir) {
          rancangan.push(new Paragraph({
            style: "Rancangan",
            numbering: bagian.butir.length > 1 || b.label ? { reference: "butir-peta", level: 0 } : undefined,
            children: b.label ? [new TextRun({ text: `${b.label}: `, bold: true }), new TextRun(b.isi)] : [new TextRun(b.isi)],
          }));
        }
      }
    }
  }

  const isi: Paragraph[] = [];
  const adaIsi = Boolean(n.isi) || n.bab.some((b) => b.isi || b.judul);
  if (n.isi || !adaIsi) {
    isi.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    isi.push(...prosa(n.isi, false));
  }
  for (const b of n.bab) {
    // Judul bab kosong → cukup satu judul "Bab N" (tanpa label kecil yang sama).
    if (b.judul) isi.push(new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { before: 720, after: 60 }, children: [new TextRun({ text: `Bab ${b.nomor}`, italics: true, color: "57534E" })] }));
    isi.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: !b.judul, alignment: AlignmentType.CENTER, spacing: { before: b.judul ? 0 : 720, after: 480 }, children: [new TextRun(b.judul || `Bab ${b.nomor}`)] }));
    isi.push(...prosa(b.isi, true));
  }

  const doc = new Document({
    creator: n.penulis || "BahasaCerdas",
    title: n.judul,
    subject: n.jenis,
    description: "Naskah AKU SASTRAWAN · BahasaCerdas",
    styles: {
      default: {
        document: { run: { font: FONT, size: 24, language: BAHASA, color: "1C1917" }, paragraph: { spacing: { line: 312 } } },
        title: { run: { font: FONT, size: 56, bold: true, color: "1C1917" }, paragraph: { spacing: { after: 120 } } },
        heading1: { run: { font: FONT, size: 36, bold: true, color: "1C1917" }, paragraph: { spacing: { before: 240, after: 200 }, keepNext: true } },
        heading2: { run: { font: FONT, size: 28, bold: true, color: "6D28D9" }, paragraph: { spacing: { before: 320, after: 120 }, keepNext: true } },
        heading3: { run: { font: FONT, size: 24, bold: true, color: "1C1917" }, paragraph: { spacing: { before: 200, after: 60 }, keepNext: true } },
      },
      paragraphStyles: [
        { id: "Prosa", name: "Prosa", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 24 }, paragraph: { alignment: AlignmentType.JUSTIFIED, spacing: { line: 360, after: 80 } } },
        { id: "Rancangan", name: "Rancangan", basedOn: "Normal", run: { font: FONT, size: 22 }, paragraph: { spacing: { line: 300, after: 60 } } },
      ],
    },
    numbering: {
      config: [{ reference: "butir-peta", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 240 } } } }] }],
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1531, right: 1531 } } },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "78716C" })] })] }),
      },
      children: [...kepala, ...rancangan, ...isi],
    }],
  });
  return Packer.toBuffer(doc);
}
