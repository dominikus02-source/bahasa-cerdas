/**
 * Minimal XLSX writer (no extra dependency). Produces a real Office Open XML
 * workbook with store-compressed ZIP parts.
 */
import { deflateRawSync } from "node:zlib";

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c ^= data[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\r?\n/g, " ");
}

function colLetter(index: number): string {
  let n = index;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

type Cell = { t: "s" | "n"; v: string | number };

function sheetXml(rows: Cell[][]): string {
  const body = rows.map((row, r) => {
    const cells = row.map((cell, c) => {
      const ref = `${colLetter(c)}${r + 1}`;
      if (cell.t === "n") return `<c r="${ref}"><v>${cell.v}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(String(cell.v))}</t></is></c>`;
    }).join("");
    return `<row r="${r + 1}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function zipStore(files: { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const compressed = deflateRawSync(file.data, { level: 9 });
    const crc = crc32(file.data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    locals.push(local, compressed);
    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);
    offset += local.length + compressed.length;
  }
  const localBuf = Buffer.concat(locals);
  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(localBuf.length, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([localBuf, centralBuf, eocd]);
}

export type LedgerExportRow = {
  entryDate: string;
  type: string;
  amount: number;
  description: string;
  category: string | null;
  createdByEmail: string;
  updatedByEmail?: string | null;
  createdAt: string;
};

export function buildLedgerWorkbook(opts: {
  from: string;
  to: string;
  entries: LedgerExportRow[];
  totals: { pemasukan: number; pengeluaran: number; saldo: number };
}): Buffer {
  const header: Cell[] = [
    { t: "s", v: "Tanggal" },
    { t: "s", v: "Tipe" },
    { t: "s", v: "Nominal (Rp)" },
    { t: "s", v: "Keterangan" },
    { t: "s", v: "Kategori" },
    { t: "s", v: "Dibuat oleh" },
    { t: "s", v: "Diubah oleh" },
    { t: "s", v: "Dicatat pada" },
  ];
  const entryRows: Cell[][] = [
    header,
    ...opts.entries.map((row) => [
      { t: "s" as const, v: row.entryDate },
      { t: "s" as const, v: row.type === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran" },
      { t: "n" as const, v: row.amount },
      { t: "s" as const, v: row.description },
      { t: "s" as const, v: row.category || "" },
      { t: "s" as const, v: row.createdByEmail },
      { t: "s" as const, v: row.updatedByEmail || "" },
      { t: "s" as const, v: row.createdAt },
    ]),
  ];
  const summaryRows: Cell[][] = [
    [{ t: "s", v: "Buku Kas BahasaCerdas" }, { t: "s", v: "" }],
    [{ t: "s", v: "Periode dari" }, { t: "s", v: opts.from }],
    [{ t: "s", v: "Periode sampai" }, { t: "s", v: opts.to }],
    [{ t: "s", v: "Jumlah entri" }, { t: "n", v: opts.entries.length }],
    [{ t: "s", v: "Total pemasukan (Rp)" }, { t: "n", v: opts.totals.pemasukan }],
    [{ t: "s", v: "Total pengeluaran (Rp)" }, { t: "n", v: opts.totals.pengeluaran }],
    [{ t: "s", v: "Saldo (Rp)" }, { t: "n", v: opts.totals.saldo }],
  ];

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="Entri" sheetId="1" r:id="rId1"/>
<sheet name="Ringkasan" sheetId="2" r:id="rId2"/>
</sheets>
</workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`;

  const enc = (s: string) => Buffer.from(s, "utf8");
  return zipStore([
    { name: "[Content_Types].xml", data: enc(contentTypes) },
    { name: "_rels/.rels", data: enc(rels) },
    { name: "xl/workbook.xml", data: enc(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: enc(workbookRels) },
    { name: "xl/worksheets/sheet1.xml", data: enc(sheetXml(entryRows)) },
    { name: "xl/worksheets/sheet2.xml", data: enc(sheetXml(summaryRows)) },
  ]);
}

export function isZipXlsx(buf: Buffer): boolean {
  return buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf.includes(Buffer.from("xl/workbook.xml"));
}
