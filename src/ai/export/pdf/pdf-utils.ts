import PDFDocument from "pdfkit";

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const MARGIN = 50;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
export const FONT = "Helvetica";
export const FONT_BOLD = "Helvetica-Bold";

export const COLORS = {
  PRIMARY: "#10B981",
  PRIMARY_DARK: "#047857",
  DARK: "#1F2937",
  GRAY: "#6B7280",
  GRAY_LIGHT: "#F3F4F6",
  WHITE: "#FFFFFF",
} as const;

export function sanitizeFilename(title: string): string {
  const safe = title
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return safe.length > 150 ? safe.slice(0, 150) : safe;
}

export function addPageNumber(doc: typeof PDFDocument.prototype): void {
  const pageNum = doc.bufferedPageRange().count;
  doc.fontSize(8).fillColor(COLORS.GRAY);
  doc.text(
    `— ${pageNum} —`,
    MARGIN,
    PAGE_HEIGHT - 30,
    { align: "center", width: CONTENT_WIDTH }
  );
}

export function addFooter(doc: typeof PDFDocument.prototype): void {
  doc.fontSize(8).fillColor(COLORS.GRAY);
  doc.text(
    "Dibuat dengan BahasaCerdas AI",
    MARGIN,
    PAGE_HEIGHT - 20,
    { align: "center", width: CONTENT_WIDTH }
  );
}

export function sectionHeading(doc: typeof PDFDocument.prototype, text: string): void {
  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(12).fillColor(COLORS.PRIMARY_DARK);
  doc.text(text, { underline: false });
  doc.moveDown(0.3);
  doc.font(FONT).fillColor(COLORS.DARK);
  doc.fontSize(10);
}

export function bodyText(doc: typeof PDFDocument.prototype, text: string, options?: { bold?: boolean; italic?: boolean }): void {
  const fontName = options?.bold ? FONT_BOLD : FONT;
  doc.font(fontName).fontSize(10).fillColor(COLORS.DARK);
  if (options?.italic) {
    doc.text(text, { oblique: true });
  } else {
    doc.text(text);
  }
}

export function bulletItem(doc: typeof PDFDocument.prototype, text: string): void {
  doc.font(FONT).fontSize(10).fillColor(COLORS.DARK);
  doc.text(`• ${text}`, { indent: 15 });
}

export function numberedItem(doc: typeof PDFDocument.prototype, number: number, text: string): void {
  doc.font(FONT).fontSize(10).fillColor(COLORS.DARK);
  doc.text(`${number}. ${text}`, { indent: 15 });
}

export function infoLine(doc: typeof PDFDocument.prototype, label: string, value: string): void {
  doc.font(FONT_BOLD).fontSize(10).fillColor(COLORS.DARK);
  doc.text(`${label}: `, { continued: true });
  doc.font(FONT).fillColor(COLORS.DARK);
  doc.text(value);
}

export function emptyLine(doc: typeof PDFDocument.prototype): void {
  doc.moveDown(0.3);
}

export function separator(doc: typeof PDFDocument.prototype): void {
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor(COLORS.GRAY);
  doc.text("─".repeat(80), { align: "center" });
  doc.moveDown(0.3);
}

export function checkPageSpace(doc: typeof PDFDocument.prototype, neededHeight: number): void {
  const yPos = doc.y;
  if (yPos + neededHeight > PAGE_HEIGHT - 60) {
    doc.addPage();
  }
}
