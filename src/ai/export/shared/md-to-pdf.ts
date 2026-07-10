import type PDFDocument from "pdfkit";
import {
  MARGIN, CONTENT_WIDTH, PAGE_HEIGHT, FONT, FONT_BOLD, COLORS,
} from "../pdf/pdf-utils";
import { tokenizeMarkdown, splitBold, stripLeadingRppHeader, type MdBlock } from "./markdown";

type Doc = typeof PDFDocument.prototype;

function ensureSpace(doc: Doc, needed: number) {
  if (doc.y + needed > PAGE_HEIGHT - 60) doc.addPage();
}

/** Render a line with inline **bold** segments using pdfkit continued runs. */
function inlineText(doc: Doc, text: string, opts: { size: number; indent?: number; bold?: boolean }) {
  const segments = splitBold(text);
  segments.forEach((seg, i) => {
    const isLast = i === segments.length - 1;
    doc
      .font(seg.bold || opts.bold ? FONT_BOLD : FONT)
      .fontSize(opts.size)
      .fillColor(COLORS.DARK)
      .text(seg.text, { continued: !isLast, indent: i === 0 ? opts.indent : 0 });
  });
}

function drawTable(doc: Doc, rows: string[][]) {
  const colCount = Math.max(...rows.map((r) => r.length), 1);
  const colWidth = CONTENT_WIDTH / colCount;
  const cellPadX = 5;
  const cellPadY = 4;

  for (let r = 0; r < rows.length; r++) {
    const cells = [...rows[r]];
    while (cells.length < colCount) cells.push("");
    const isHeader = r === 0;

    // Measure row height from tallest cell
    doc.font(isHeader ? FONT_BOLD : FONT).fontSize(9);
    let rowHeight = 0;
    for (const c of cells) {
      const h = doc.heightOfString(c || " ", { width: colWidth - cellPadX * 2 });
      if (h > rowHeight) rowHeight = h;
    }
    rowHeight += cellPadY * 2;

    ensureSpace(doc, rowHeight);
    const yStart = doc.y;
    const xStart = MARGIN;

    if (isHeader) {
      doc.save().rect(xStart, yStart, CONTENT_WIDTH, rowHeight).fill(COLORS.GRAY_LIGHT).restore();
    }

    for (let c = 0; c < colCount; c++) {
      const x = xStart + c * colWidth;
      doc
        .font(isHeader ? FONT_BOLD : FONT)
        .fontSize(9)
        .fillColor(COLORS.DARK)
        .text(cells[c] || "", x + cellPadX, yStart + cellPadY, {
          width: colWidth - cellPadX * 2,
          align: "left",
        });
      // Cell border
      doc.save().lineWidth(0.5).strokeColor("#D1D5DB").rect(x, yStart, colWidth, rowHeight).stroke().restore();
    }

    doc.y = yStart + rowHeight;
  }
  doc.moveDown(0.5);
}

/**
 * Render markdown `editableText` into an existing PDFKit document so the
 * exported PDF mirrors the on-screen preview.
 */
export function renderMarkdownToPdf(doc: Doc, text: string): void {
  const blocks = tokenizeMarkdown(stripLeadingRppHeader(text));

  for (const block of blocks as MdBlock[]) {
    switch (block.type) {
      case "blank":
        doc.moveDown(0.4);
        break;
      case "hr":
        ensureSpace(doc, 12);
        doc.moveDown(0.2);
        doc.save().lineWidth(0.5).strokeColor("#CCCCCC")
          .moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y).stroke().restore();
        doc.moveDown(0.4);
        break;
      case "heading": {
        const size = block.level === 1 ? 16 : block.level === 2 ? 13 : 11;
        ensureSpace(doc, size + 14);
        doc.moveDown(block.level === 1 ? 0.4 : 0.3);
        doc.font(FONT_BOLD).fontSize(size)
          .fillColor(block.level >= 3 ? COLORS.DARK : COLORS.PRIMARY_DARK);
        doc.text(block.text, {
          width: CONTENT_WIDTH,
          align: block.level === 1 ? "center" : "left",
        });
        doc.moveDown(0.2);
        break;
      }
      case "table":
        drawTable(doc, block.rows);
        break;
      case "bullet":
        ensureSpace(doc, 16);
        inlineText(doc, `•  ${block.text}`, { size: 10, indent: 12 });
        break;
      case "numbered":
        ensureSpace(doc, 16);
        inlineText(doc, `${block.num}.  ${block.text}`, { size: 10, indent: 12 });
        break;
      case "paragraph":
        ensureSpace(doc, 16);
        inlineText(doc, block.text, { size: 10 });
        break;
    }
  }
}
