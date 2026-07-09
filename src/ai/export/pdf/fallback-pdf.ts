import PDFDocument from "pdfkit";
import {
  MARGIN, CONTENT_WIDTH, PAGE_HEIGHT, FONT, FONT_BOLD, COLORS,
  sanitizeFilename, addFooter,
} from "./pdf-utils";

function isSectionHeader(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (t.length > 80) return false;
  if (t.startsWith("###") || t.startsWith("##") || t.startsWith("#")) return true;
  if (t === t.toUpperCase() && t.length > 3 && !t.startsWith("•") && !t.startsWith("-") && !/^\d+\./.test(t)) return true;
  if (/^[A-Z]\.\s/.test(t)) return true;
  return false;
}

export async function generateFallbackPdf(
  title: string,
  content: string,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, font: FONT });
  const buffers: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => buffers.push(chunk));
  doc.on("end", () => {});

  // Title
  doc.font(FONT_BOLD).fontSize(16).fillColor(COLORS.DARK);
  doc.text("RENCANA PELAKSANAAN PEMBELAJARAN", { align: "center", width: CONTENT_WIDTH });
  doc.moveDown(0.3);
  doc.font(FONT_BOLD).fontSize(13);
  doc.text(title, { align: "center", width: CONTENT_WIDTH });
  doc.moveDown(0.5);

  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      doc.moveDown(0.25);
      i++;
      continue;
    }

    // Section heading
    if (isSectionHeader(trimmed)) {
      const headerText = trimmed.replace(/^#{1,3}\s*/, "");
      doc.moveDown(0.3);
      doc.font(FONT_BOLD).fontSize(12).fillColor(COLORS.DARK);
      doc.text(headerText, { width: CONTENT_WIDTH });
      doc.moveDown(0.15);
      i++;
      continue;
    }

    // Table detection
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed.split("|").filter(Boolean).map(c => c.trim());
      // Skip separator rows
      if (!cells.every(c => /^-+$/.test(c))) {
        doc.font(FONT_BOLD).fontSize(10);
        const lineText = cells.join("  │  ");
        doc.text(lineText, { width: CONTENT_WIDTH });
      }
      i++;
      continue;
    }

    // Bullet
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      const text = trimmed.replace(/^[-•]\s*/, "");
      doc.font(FONT).fontSize(10).fillColor(COLORS.DARK);
      doc.text(`• ${text}`, { width: CONTENT_WIDTH, indent: 15 });
      i++;
      continue;
    }

    // Numbered
    if (/^\d+\.\s/.test(trimmed)) {
      const [numPart, ...rest] = trimmed.split(/\s(.+)/);
      doc.font(FONT).fontSize(10).fillColor(COLORS.DARK);
      doc.text(`${numPart} ${rest.join(" ")}`, { width: CONTENT_WIDTH, indent: 15 });
      i++;
      continue;
    }

    // Label: value
    if (/^[A-Za-z\s]+:\s/.test(trimmed) && trimmed.length < 100) {
      const colonIdx = trimmed.indexOf(":");
      const label = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();
      doc.font(FONT_BOLD).fontSize(10).fillColor(COLORS.DARK);
      const labelWidth = doc.widthOfString(`${label}: `);
      doc.text(`${label}: `, { continued: true, width: CONTENT_WIDTH });
      doc.font(FONT).fillColor(COLORS.DARK);
      doc.text(value);
      i++;
      continue;
    }

    // Regular text
    doc.font(FONT).fontSize(10).fillColor(COLORS.DARK);
    doc.text(lines[i], { width: CONTENT_WIDTH });

    if (doc.y > PAGE_HEIGHT - 80) {
      doc.addPage();
    }
    i++;
  }

  // Signature area
  doc.moveDown(1.5);
  doc.font(FONT_BOLD).fontSize(10).fillColor(COLORS.DARK);
  doc.text("Mengetahui,", { align: "center", width: CONTENT_WIDTH });
  doc.moveDown(0.5);
  doc.text("Kepala Sekolah,                         Guru Mata Pelajaran,", { align: "center", width: CONTENT_WIDTH });
  doc.moveDown(2);
  doc.text("(....................................)             (....................................)", { align: "center", width: CONTENT_WIDTH });

  // Footer
  doc.moveDown(1);
  addFooter(doc);

  doc.end();
  return Buffer.concat(buffers);
}

export function getFallbackPdfMetadata(title: string): { title: string; filename: string } {
  return { title, filename: `${sanitizeFilename(title)}.pdf` };
}
