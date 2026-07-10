import PDFDocument from "pdfkit";
import { EMBEDDED_FONT } from "./embedded-font";

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const MARGIN = 50;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
// Use an embedded TTF (registered per-document) instead of pdfkit's built-in
// standard fonts — the standard-font .afm metrics are not reliably present on
// Vercel and cause ENOENT at runtime.
export const FONT = "Body";
export const FONT_BOLD = "Body-Bold";

/**
 * Create an A4 PDFDocument with the embedded font registered as "Body" and
 * "Body-Bold". Call this instead of `new PDFDocument(...)` so no code path ever
 * falls back to a standard font that needs an on-disk .afm file.
 */
export function createPdfDoc(options?: PDFKit.PDFDocumentOptions): typeof PDFDocument.prototype {
  // `font: null` stops pdfkit's constructor from loading its default "Helvetica"
  // standard font (whose .afm metrics are missing on Vercel → ENOENT). We then
  // register and select the embedded TTF instead.
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, font: null, ...options } as PDFKit.PDFDocumentOptions);
  doc.registerFont(FONT, EMBEDDED_FONT);
  doc.registerFont(FONT_BOLD, EMBEDDED_FONT);
  doc.font(FONT);
  return doc;
}

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
    .replace(/[—–]/g, "-") // em/en dash → hyphen (invalid in latin1 HTTP headers)
    .replace(/[^\x20-\x7E]/g, "") // strip any remaining non-ASCII (header-safe)
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
