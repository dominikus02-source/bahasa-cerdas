import PDFDocument from "pdfkit";
import {
  MARGIN, CONTENT_WIDTH, PAGE_HEIGHT, FONT, FONT_BOLD, COLORS,
  sanitizeFilename, addFooter,
} from "./pdf-utils";

export async function generateFallbackPdf(
  title: string,
  content: string,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: MARGIN });
  const buffers: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => buffers.push(chunk));
  doc.on("end", () => {});

  doc.font(FONT).fontSize(10).fillColor(COLORS.DARK);

  doc.font(FONT_BOLD).fontSize(18).fillColor(COLORS.PRIMARY_DARK);
  doc.text(title, { align: "center", width: CONTENT_WIDTH });
  doc.moveDown(0.5);

  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      doc.moveDown(0.3);
      continue;
    }
    if (trimmed.startsWith("### ")) {
      doc.moveDown(0.3);
      doc.font(FONT_BOLD).fontSize(12).fillColor(COLORS.DARK);
      doc.text(trimmed.replace("### ", ""), { width: CONTENT_WIDTH });
    } else if (trimmed.startsWith("## ")) {
      doc.moveDown(0.4);
      doc.font(FONT_BOLD).fontSize(14).fillColor(COLORS.PRIMARY_DARK);
      doc.text(trimmed.replace("## ", ""), { width: CONTENT_WIDTH });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      doc.font(FONT).fontSize(10).fillColor(COLORS.DARK);
      doc.text(`  • ${trimmed.substring(2)}`, { width: CONTENT_WIDTH, indent: 10 });
    } else if (/^\d+\.\s/.test(trimmed)) {
      doc.font(FONT).fontSize(10).fillColor(COLORS.DARK);
      doc.text(`  ${trimmed}`, { width: CONTENT_WIDTH, indent: 10 });
    } else {
      doc.font(FONT).fontSize(10).fillColor(COLORS.DARK);
      doc.text(line, { width: CONTENT_WIDTH });
    }

    if (doc.y > PAGE_HEIGHT - 80) {
      doc.addPage();
    }
  }

  doc.moveDown(1);
  addFooter(doc);

  doc.end();
  return Buffer.concat(buffers);
}

export function getFallbackPdfMetadata(title: string): { title: string; filename: string } {
  return { title, filename: `${sanitizeFilename(title)}.pdf` };
}