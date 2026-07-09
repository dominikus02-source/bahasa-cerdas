import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} from "docx";
import { sanitizeFilename } from "./docx-utils";

const FONT = "Times New Roman";
const BODY_SIZE = 22; // 11pt
const HEADING_SIZE = 26; // 13pt
const TITLE_SIZE = 32; // 16pt

function bodyText(text: string, opts: { bold?: boolean; italic?: boolean; size?: number } = {}): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text,
      font: FONT,
      size: opts.size ?? BODY_SIZE,
      bold: opts.bold,
      italics: opts.italic,
    })],
    spacing: { after: 80, line: 312 },
  });
}

function signatureLine(label: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: label, font: FONT, size: BODY_SIZE, bold: true })],
    spacing: { after: 200 },
    alignment: AlignmentType.CENTER,
  });
}

/** Parse content text into structured sections for DOCX rendering */
function parseSections(text: string): { type: "title" | "heading" | "subheading" | "bullet" | "numbered" | "empty" | "text"; text: string }[] {
  const lines = text.split("\n");
  return lines.map((line) => {
    const t = line.trim();
    if (!t) return { type: "empty", text: "" };

    // Detect table rows | ... |
    if (t.startsWith("|") && t.endsWith("|")) return { type: "text", text: line };

    if (t.startsWith("### ")) return { type: "subheading", text: t.replace("### ", "") };
    if (t.startsWith("## ")) return { type: "heading", text: t.replace("## ", "") };
    if (t.startsWith("# ")) return { type: "title", text: t.replace("# ", "") };

    // All-caps short lines are likely section headings
    if (t.length < 80 && t === t.toUpperCase() && !t.startsWith("•") && !t.startsWith("-") && !/^\d+\./.test(t) && t.length > 3) {
      return { type: "heading", text: t };
    }

    if (t.startsWith("- ") || t.startsWith("• ")) return { type: "bullet", text: t.replace(/^[-•]\s*/, "") };
    if (/^\d+\.\s/.test(t)) return { type: "numbered", text: t.replace(/^\d+\.\s*/, "") };

    return { type: "text", text: line };
  });
}

function isSectionHeader(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  // Section headers are short, all-caps or numbered (A., B., etc.)
  if (t.length > 80) return false;
  if (t.startsWith("###") || t.startsWith("##") || t.startsWith("#")) return true;
  if ((t === t.toUpperCase() && t.length > 3 && !t.startsWith("•") && !t.startsWith("-"))) return true;
  if (/^[A-Z]\.\s/.test(t)) return true;
  return false;
}

export async function generateFallbackDocx(
  title: string,
  content: string,
): Promise<Buffer> {
  const paragraphs: (Paragraph | Table)[] = [];

  // Title block
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: "RENCANA PELAKSANAAN PEMBELAJARAN", font: FONT, size: TITLE_SIZE, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: title, font: FONT, size: HEADING_SIZE, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  );

  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      paragraphs.push(new Paragraph({ spacing: { after: 60 } }));
      i++;
      continue;
    }

    // Section heading (all caps short lines → proper heading)
    if (isSectionHeader(trimmed)) {
      const headerText = trimmed.replace(/^#{1,3}\s*/, "");
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: headerText, font: FONT, size: HEADING_SIZE, bold: true })],
          spacing: { before: 200, after: 100 },
        }),
      );
      i++;
      continue;
    }

    // Table detection: consecutive | ... | lines
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().split("|").filter(Boolean).map(c => c.trim());
        // Skip separator rows (|---|---|)
        if (!cells.every(c => /^-+$/.test(c))) {
          rows.push(cells);
        }
        i++;
      }
      if (rows.length > 0) {
        const isHeader = rows[0].length > 0;
        const tableRows = rows.map((row, ri) => {
          const isFirst = ri === 0;
          return new TableRow({
            children: row.map(cell => new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: cell, font: FONT, size: BODY_SIZE, bold: isFirst })],
                spacing: { after: 40 },
              })],
            })),
          });
        });
        paragraphs.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        );
        paragraphs.push(new Paragraph({ spacing: { after: 80 } }));
      }
      continue;
    }

    // Bullet
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      const text = trimmed.replace(/^[-•]\s*/, "");
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text, font: FONT, size: BODY_SIZE })],
          bullet: { level: 0 },
          spacing: { after: 40 },
        }),
      );
      i++;
      continue;
    }

    // Numbered
    if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s*/, "");
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text, font: FONT, size: BODY_SIZE })],
          numbering: { reference: "default", level: 0 },
          spacing: { after: 40 },
        }),
      );
      i++;
      continue;
    }

    // Label: value detection for identity section
    if (/^[A-Za-z\s]+:\s/.test(trimmed) && trimmed.length < 100) {
      const colonIdx = trimmed.indexOf(":");
      const label = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${label}: `, font: FONT, size: BODY_SIZE, bold: true }),
            new TextRun({ text: value, font: FONT, size: BODY_SIZE }),
          ],
          spacing: { after: 40 },
        }),
      );
      i++;
      continue;
    }

    // Regular text
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: line, font: FONT, size: BODY_SIZE })],
        spacing: { after: 60, line: 312 },
      }),
    );
    i++;
  }

  // Signature area
  paragraphs.push(new Paragraph({ spacing: { before: 400, after: 100 } }));
  paragraphs.push(signatureLine("Mengetahui,"));
  paragraphs.push(signatureLine("Kepala Sekolah,                         Guru Mata Pelajaran,"));
  paragraphs.push(new Paragraph({ spacing: { before: 300, after: 60 } }));
  paragraphs.push(signatureLine("(....................................)             (....................................)"));
  paragraphs.push(new Paragraph({ spacing: { after: 40 } }));

  // Footer
  paragraphs.push(new Paragraph({ spacing: { before: 200 } }));
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: "Dibuat dengan BahasaCerdas.com", font: FONT, size: 18, italics: true, color: "888888" })],
      alignment: AlignmentType.CENTER,
    }),
  );

  const doc = new Document({
    title,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: BODY_SIZE },
          paragraph: { spacing: { after: 60, line: 312 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1 inch
        },
      },
      children: paragraphs,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

export function getFallbackDocxMetadata(title: string): { title: string; filename: string } {
  return { title, filename: `${sanitizeFilename(title)}.docx` };
}
