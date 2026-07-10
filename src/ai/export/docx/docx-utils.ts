import {
  AlignmentType, BorderStyle, HeadingLevel, Paragraph, TabStopPosition,
  TabStopType, Table, TableBorders, TableCell, TableRow, TextRun, WidthType,
} from "docx";

export function sanitizeFilename(title: string): string {
  const safe = title
    .replace(/[—–]/g, "-") // em/en dash → hyphen (invalid in latin1 HTTP headers)
    .replace(/[^\x20-\x7E]/g, "") // strip any remaining non-ASCII (header-safe)
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return safe.length > 150 ? safe.slice(0, 150) : safe;
}

export function createHeaderCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 20 })],
        spacing: { before: 40, after: 40 },
      }),
    ],
  });
}

export function createCell(text: string, width: number, options?: { bold?: boolean; italic?: boolean }): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: options?.bold, italics: options?.italic, size: 20 })],
        spacing: { before: 40, after: 40 },
      }),
    ],
  });
}

export function sectionHeading(text: string, level: string = HeadingLevel.HEADING_2): Paragraph {
  return new Paragraph({
    text,
    heading: level as never,
    spacing: { before: 240, after: 120 },
  });
}

export function bodyText(text: string, options?: { bold?: boolean; italic?: boolean; bullet?: boolean }): Paragraph {
  const children = [new TextRun({ text, bold: options?.bold, italics: options?.italic, size: 22 })];
  if (options?.bullet) {
    return new Paragraph({
      children,
      bullet: { level: 0 },
      spacing: { before: 40, after: 40 },
    });
  }
  return new Paragraph({
    children,
    spacing: { before: 40, after: 40 },
  });
}

export function numberedItem(number: number, text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `${number}. ${text}`, size: 22 })],
    spacing: { before: 40, after: 40 },
  });
}

export function emptyLine(): Paragraph {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [] });
}

export function indentedText(text: string, options?: { bold?: boolean }): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: options?.bold, size: 22 })],
    indent: { left: 720 },
    spacing: { before: 40, after: 40 },
  });
}

export function createSimpleTable(headers: string[], rows: string[][]): Table {
  const totalWidth = headers.length;
  const colWidth = Math.floor(100 / totalWidth);

  const headerRow = new TableRow({
    children: headers.map((h) => createHeaderCell(h, colWidth)),
    tableHeader: true,
  });

  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((cell) => createCell(cell, colWidth)),
      })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

export function createInfoTable(data: { label: string; value: string }[]): Table {
  const rows = data.map(
    (d) =>
      new TableRow({
        children: [createHeaderCell(d.label, 30), createCell(d.value, 70)],
      })
  );

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

export function footerNote(): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: "Dibuat dengan BahasaCerdas AI",
        size: 18,
        italics: true,
        color: "888888",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 480, after: 120 },
  });
}

export function buildBulletList(items: string[]): Paragraph[] {
  return items.map(
    (item) =>
      new Paragraph({
        children: [new TextRun({ text: item, size: 22 })],
        bullet: { level: 0 },
        spacing: { before: 30, after: 30 },
      })
  );
}

export function buildNumberedList(items: string[]): Paragraph[] {
  return items.map(
    (item, i) =>
      new Paragraph({
        children: [new TextRun({ text: `${i + 1}. ${item}`, size: 22 })],
        spacing: { before: 30, after: 30 },
      })
  );
}
