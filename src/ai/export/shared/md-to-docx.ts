import {
  AlignmentType, HeadingLevel, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, BorderStyle,
} from "docx";
import { tokenizeMarkdown, splitBold, stripLeadingRppHeader, type MdBlock } from "./markdown";

function inlineRuns(text: string, opts?: { size?: number; bold?: boolean }): TextRun[] {
  return splitBold(text).map(
    (seg) =>
      new TextRun({
        text: seg.text,
        bold: seg.bold || opts?.bold,
        size: opts?.size ?? 22,
      })
  );
}

function cellParagraph(text: string, bold?: boolean): Paragraph {
  return new Paragraph({
    children: inlineRuns(text, { size: 20, bold }),
    spacing: { before: 40, after: 40 },
  });
}

function buildTable(rows: string[][]): Table {
  const colCount = Math.max(...rows.map((r) => r.length), 1);
  const colWidth = Math.floor(100 / colCount);
  const tableRows = rows.map((cells, rowIdx) => {
    const filled = [...cells];
    while (filled.length < colCount) filled.push("");
    return new TableRow({
      tableHeader: rowIdx === 0,
      children: filled.map((c) => new TableCell({
        width: { size: colWidth, type: WidthType.PERCENTAGE },
        children: [cellParagraph(c, rowIdx === 0)],
      })),
    });
  });
  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

/**
 * Render markdown `editableText` into docx paragraphs/tables so the exported
 * document mirrors the on-screen preview.
 */
export function renderMarkdownToDocx(text: string): (Paragraph | Table)[] {
  const blocks = tokenizeMarkdown(stripLeadingRppHeader(text));
  const out: (Paragraph | Table)[] = [];

  for (const block of blocks as MdBlock[]) {
    switch (block.type) {
      case "blank":
        out.push(new Paragraph({ children: [], spacing: { before: 40, after: 40 } }));
        break;
      case "hr":
        out.push(new Paragraph({
          children: [],
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 } },
          spacing: { before: 80, after: 80 },
        }));
        break;
      case "heading": {
        const level = block.level === 1
          ? HeadingLevel.HEADING_1
          : block.level === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3;
        const size = block.level === 1 ? 30 : block.level === 2 ? 26 : 24;
        out.push(new Paragraph({
          children: [new TextRun({ text: block.text, bold: true, size })],
          heading: level,
          alignment: block.level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { before: 200, after: 100 },
        }));
        break;
      }
      case "table":
        out.push(buildTable(block.rows));
        out.push(new Paragraph({ children: [], spacing: { after: 80 } }));
        break;
      case "bullet":
        out.push(new Paragraph({
          children: inlineRuns(block.text),
          bullet: { level: 0 },
          spacing: { before: 30, after: 30 },
        }));
        break;
      case "numbered":
        out.push(new Paragraph({
          children: [new TextRun({ text: `${block.num}. `, size: 22 }), ...inlineRuns(block.text)],
          spacing: { before: 30, after: 30 },
          indent: { left: 360 },
        }));
        break;
      case "paragraph":
        out.push(new Paragraph({
          children: inlineRuns(block.text),
          spacing: { before: 40, after: 40 },
        }));
        break;
    }
  }

  return out;
}
