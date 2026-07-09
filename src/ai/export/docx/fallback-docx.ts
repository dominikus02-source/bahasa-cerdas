import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
} from "docx";
import { sanitizeFilename } from "./docx-utils";

export async function generateFallbackDocx(
  title: string,
  content: string,
): Promise<Buffer> {
  const lines = content.split("\n");
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 26 })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  );

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ spacing: { after: 60 } }));
      continue;
    }
    if (trimmed.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.replace("### ", ""), bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 80 },
        }),
      );
    } else if (trimmed.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.replace("## ", ""), bold: true, size: 26 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 100 },
        }),
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.substring(2), size: 22 })],
          bullet: { level: 0 },
          spacing: { after: 40 },
        }),
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.replace(/^\d+\.\s/, ""), size: 22 })],
          numbering: { reference: "default", level: 0 },
          spacing: { after: 40 },
        }),
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
          spacing: { after: 60 },
        }),
      );
    }
  }

  paragraphs.push(new Paragraph({ spacing: { before: 300, after: 100 } }));
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: "Dibuat dengan BahasaCerdas.com", size: 18, italics: true, color: "888888" })],
      alignment: AlignmentType.CENTER,
    }),
  );

  const doc = new Document({
    title,
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
          paragraph: { spacing: { after: 60 } },
        },
      },
    },
    sections: [{ children: paragraphs }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

export function getFallbackDocxMetadata(title: string): { title: string; filename: string } {
  return { title, filename: `${sanitizeFilename(title)}.docx` };
}