// Shared markdown normalizer + tokenizer used by DOCX and PDF exporters.
// The AI produces `editableText` as markdown (with occasional stray HTML like
// <br> tags). Both exporters render from this so the downloaded file matches
// the on-screen preview.

export type MdBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "hr" }
  | { type: "table"; rows: string[][] }
  | { type: "bullet"; text: string }
  | { type: "numbered"; num: string; text: string }
  | { type: "paragraph"; text: string; bold?: boolean }
  | { type: "blank" };

/** Convert stray HTML to plain text/newlines and decode common entities. */
export function normalizeExportText(raw: string): string {
  if (!raw) return "";
  let text = raw;
  // Line-breaking tags → newline
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n");
  // Drop all other tags but keep their inner text
  text = text.replace(/<[^>]+>/g, "");
  // Decode a handful of common HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  // Normalise line endings and collapse 3+ blank lines to a single blank line
  text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  return text;
}

const HEADER_LABEL = /^(Nama Sekolah|Mata Pelajaran|Kelas\s*\/?\s*Fase|Kelas|Fase|Tahun Ajaran|Semester|Kota,?\s*Tanggal|Dibuat dengan bantuan)\b/i;

/**
 * Remove a leading identity header block that duplicates the "A. Identitas"
 * table. Only strips lines before the first markdown title (# ...) and only
 * when every non-blank line there is a known header label — so legitimate
 * content is never removed. Covers documents generated before the prompt fix.
 */
export function stripLeadingRppHeader(raw: string): string {
  if (!raw) return raw;
  const lines = raw.split("\n");
  const titleIdx = lines.findIndex((l) => /^#\s/.test(l.trim()));
  if (titleIdx <= 0) return raw;
  for (let i = 0; i < titleIdx; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (!HEADER_LABEL.test(t)) return raw; // not a pure header block — leave as-is
  }
  return lines.slice(titleIdx).join("\n");
}

/** Heuristic: does this text hold enough real content to render as the body? */
export function hasRenderableText(raw?: string | null): boolean {
  if (!raw || typeof raw !== "string") return false;
  const stripped = normalizeExportText(raw)
    .replace(/[#*_|>\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length >= 30;
}

/** Split a line into segments, marking **bold** runs. */
export function splitBold(text: string): { text: string; bold: boolean }[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p.length > 0);
  return parts.map((part) =>
    part.startsWith("**") && part.endsWith("**")
      ? { text: part.slice(2, -2), bold: true }
      : { text: part, bold: false }
  );
}

function parseTableRow(line: string): string[] {
  const cells = line.split("|");
  // Drop the empty strings created by the leading/trailing pipe
  return cells.slice(1, cells.length - 1).map((c) => c.trim());
}

const TABLE_SEPARATOR = /^\|[\s\-:|]+\|$/;

/** Tokenize normalized markdown into renderable blocks. */
export function tokenizeMarkdown(raw: string): MdBlock[] {
  const text = normalizeExportText(raw);
  const lines = text.split("\n");
  const blocks: MdBlock[] = [];
  let tableRows: string[][] | null = null;

  const flushTable = () => {
    if (tableRows && tableRows.length > 0) {
      blocks.push({ type: "table", rows: tableRows });
    }
    tableRows = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Table rows
    if (line.startsWith("|") && line.endsWith("|") && line.length > 1) {
      if (TABLE_SEPARATOR.test(line)) continue; // skip | --- | --- |
      if (tableRows === null) tableRows = [];
      tableRows.push(parseTableRow(line));
      continue;
    }
    if (tableRows !== null) flushTable();

    if (!line) {
      blocks.push({ type: "blank" });
      continue;
    }
    if (/^[-*_]{3,}$/.test(line)) {
      blocks.push({ type: "hr" });
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ type: "heading", level: 3, text: line.slice(4).trim() });
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", level: 2, text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "heading", level: 1, text: line.slice(2).trim() });
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
      blocks.push({ type: "bullet", text: line.slice(2).trim() });
      continue;
    }
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      blocks.push({ type: "numbered", num: numMatch[1], text: numMatch[2].trim() });
      continue;
    }
    blocks.push({ type: "paragraph", text: line });
  }

  flushTable();
  return blocks;
}
