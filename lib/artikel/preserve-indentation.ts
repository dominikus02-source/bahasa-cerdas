/**
 * Indentasi baris karya (puisi, pantun, syair, cerpen) tetap terlihat tanpa
 * diparse sebagai blok kode Markdown.
 *
 * Masalah: di Markdown (CommonMark), baris yang diawali >= 4 spasi/tab menjadi
 * "indented code block" -> <pre><code> ber-font monospace yang tidak membungkus
 * dan melebarkan halaman di ponsel (bug "Di Pagi Kau Pergi", 2026-10-26).
 * Indentasi 1–3 spasi malah dibuang diam-diam.
 *
 * Solusi: SEBELUM diparse, ganti spasi/tab di awal baris dengan U+00A0
 * (no-break space). Itu karakter teks biasa, jadi:
 *   - parser tidak lagi melihat indentasi -> paragraf biasa, font normal;
 *   - NBSP tidak diciutkan browser -> indentasi penulis tetap terlihat;
 *   - tidak ada HTML yang disuntikkan -> sanitasi/XSS tidak berubah
 *     (ReactMarkdown tetap TANPA rehype-raw).
 *
 * Dikecualikan (agar Markdown sah tidak rusak):
 *   - isi blok kode berpagar ``` / ~~~ (tetap kode);
 *   - baris daftar (-, *, +, 1. 1)), kutipan (>), dan tabel (|) yang menjorok,
 *     karena indentasinya bermakna sebagai sarang daftar / struktur.
 */

const NBSP = "\u00A0";
/** Batas lebar indentasi (kolom) supaya baris tidak didorong keluar layar ponsel. */
export const MAX_INDENT_COLUMNS = 24;
const TAB_WIDTH = 4;

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const STRUCTURAL = /^(?:[-*+][ \t]|\d{1,9}[.)][ \t]|>|\|)/;

function indentColumns(ws: string): number {
  let col = 0;
  for (const ch of ws) col = ch === "\t" ? col + TAB_WIDTH - (col % TAB_WIDTH) : col + 1;
  return col;
}

export function preserveLeadingIndentation(source: string | null | undefined): string {
  if (!source) return "";
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let fence: string | null = null;

  return lines
    .map((line) => {
      if (fence) {
        const close = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
        if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null;
        return line;
      }
      const open = line.match(FENCE_OPEN);
      if (open) {
        fence = open[1];
        return line;
      }

      const lead = line.match(/^[ \t]+/);
      if (!lead) return line;
      const rest = line.slice(lead[0].length);
      if (!rest) return ""; // baris berisi spasi saja = pemisah bait
      if (STRUCTURAL.test(rest)) return line;

      const cols = Math.min(indentColumns(lead[0]), MAX_INDENT_COLUMNS);
      return NBSP.repeat(cols) + rest;
    })
    .join("\n");
}

/** Karya sastra berbaris (perataan kiri, bukan rata kanan-kiri). */
export function isKaryaBerbaris(articleType: string | null | undefined, tags: readonly string[] | null | undefined): boolean {
  if (articleType && /^(PUISI|PANTUN|SYAIR|GURINDAM)$/i.test(articleType)) return true;
  return (tags ?? []).some((t) => /\b(puisi|pantun|syair|gurindam|sajak)\b/i.test(t));
}
