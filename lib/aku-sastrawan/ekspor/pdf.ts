/**
 * Ekspor PDF naskah AKU SASTRAWAN — HANYA server (pdfkit + font tersemat).
 *
 * Tipografi: PT Serif (OFL) disematkan dari base64, tidak memakai font standar
 * pdfkit (berkas .afm tidak ada di server produksi → ENOENT). A4, margin lega,
 * paragraf rata kiri-kanan dengan inden baris pertama, tiap bab di halaman baru,
 * nomor halaman di kaki. Karakter yang tidak ada di font (mis. emoji) dibuang
 * agar tidak muncul sebagai kotak kosong; ekspor Word/.txt tetap memuatnya.
 */
import PDFDocument from "pdfkit";
import { PT_SERIF_MIRING_BASE64, PT_SERIF_REGULAR_BASE64, PT_SERIF_TEBAL_BASE64 } from "./font-pt-serif";
import { judulBab, pecahParagraf, type Naskah } from "./naskah";

const F = { biasa: "SerifBiasa", tebal: "SerifTebal", miring: "SerifMiring" } as const;
const WARNA = { teks: "#1c1917", redup: "#57534e", garis: "#d6d3d1", aksen: "#6d28d9" } as const; // warna-izin: warna cetak di dalam berkas PDF (bukan UI; token CSS tidak berlaku)
const A4 = { lebar: 595.28, tinggi: 841.89 };
const M = { atas: 72, bawah: 72, kiri: 76, kanan: 76 };
const LEBAR = A4.lebar - M.kiri - M.kanan;

let fontCache: { biasa: Buffer; tebal: Buffer; miring: Buffer } | null = null;
function font() {
  fontCache ??= {
    biasa: Buffer.from(PT_SERIF_REGULAR_BASE64, "base64"),
    tebal: Buffer.from(PT_SERIF_TEBAL_BASE64, "base64"),
    miring: Buffer.from(PT_SERIF_MIRING_BASE64, "base64"),
  };
  return fontCache;
}

type Doc = InstanceType<typeof PDFDocument>;
type FontKit = { hasGlyphForCodePoint?: (cp: number) => boolean };

/** Buang karakter yang tidak punya glyph di font aktif (emoji, simbol langka). */
function saring(doc: Doc, teks: string): string {
  const fk = (doc as unknown as { _font?: { font?: FontKit } })._font?.font;
  const ada = fk?.hasGlyphForCodePoint?.bind(fk);
  if (!ada) return teks;
  let out = "";
  for (const ch of teks) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp === 0x200d || (cp >= 0xfe00 && cp <= 0xfe0f)) continue; // ZWJ, pemilih varian emoji
    if (cp < 0x20 && ch !== "\n") continue;
    out += cp === 0x20 || ch === "\n" || ada(cp) ? ch : "";
  }
  return out.replace(/[ \t]{2,}/g, " ");
}

function tulis(doc: Doc, f: keyof typeof F, ukuran: number, warna: string, teks: string, opsi: PDFKit.Mixins.TextOptions = {}) {
  doc.font(F[f]).fontSize(ukuran).fillColor(warna);
  doc.text(saring(doc, teks), { width: LEBAR, ...opsi });
}

function garis(doc: Doc, lebar = 64) {
  const x = M.kiri + (LEBAR - lebar) / 2;
  const y = doc.y;
  doc.save().moveTo(x, y).lineTo(x + lebar, y).lineWidth(0.8).strokeColor(WARNA.garis).stroke().restore();
  doc.y = y + 1;
}

function judulBagian(doc: Doc, teks: string) {
  doc.moveDown(1.1);
  tulis(doc, "tebal", 13, WARNA.aksen, teks);
  doc.moveDown(0.35);
}

function prosa(doc: Doc, isi: string) {
  const paragraf = pecahParagraf(isi);
  paragraf.forEach((p, i) => {
    if (p.jedaSebelum) {
      doc.moveDown(0.5);
      tulis(doc, "biasa", 11, WARNA.redup, "*  *  *", { align: "center" });
      doc.moveDown(0.5);
    }
    const awal = i === 0 || p.jedaSebelum;
    tulis(doc, "biasa", 11.5, WARNA.teks, p.teks, { align: "justify", indent: awal ? 0 : 22, lineGap: 4.2, paragraphGap: 3 });
  });
}

function halamanJudul(doc: Doc, n: Naskah) {
  doc.y = M.atas + 150;
  tulis(doc, "miring", 12, WARNA.redup, n.jenis, { align: "center", characterSpacing: 1.2 });
  doc.moveDown(0.8);
  tulis(doc, "tebal", 28, WARNA.teks, n.judul, { align: "center", lineGap: 4 });
  doc.moveDown(0.9);
  garis(doc);
  doc.moveDown(0.9);
  if (n.penulis) tulis(doc, "miring", 14, WARNA.teks, `oleh ${n.penulis}`, { align: "center" });

  if (n.sinopsis || n.peta.length) {
    doc.addPage();
    tulis(doc, "tebal", 18, WARNA.teks, "Rancangan Cerita", { align: "left" });
    if (n.sinopsis) {
      judulBagian(doc, "Sinopsis");
      tulis(doc, "biasa", 11, WARNA.teks, n.sinopsis, { align: "justify", lineGap: 3.5 });
    }
    if (n.peta.length) {
      judulBagian(doc, "Peta Cerita");
      for (const bagian of n.peta) {
        doc.moveDown(0.45);
        tulis(doc, "tebal", 11, WARNA.teks, bagian.judul);
        doc.moveDown(0.15);
        for (const b of bagian.butir) {
          doc.font(F.biasa).fontSize(11).fillColor(WARNA.teks);
          if (b.label) {
            doc.font(F.tebal).text(saring(doc, `${b.label}: `), M.kiri + 14, doc.y, { width: LEBAR - 14, continued: true, lineGap: 3 });
            doc.font(F.biasa).text(saring(doc, b.isi), { lineGap: 3 });
          } else {
            doc.text(saring(doc, b.isi), M.kiri + 14, doc.y, { width: LEBAR - 14, lineGap: 3 });
          }
          doc.x = M.kiri;
          doc.moveDown(0.15);
        }
      }
    }
  }
}

function kakiHalaman(doc: Doc, n: Naskah) {
  const rentang = doc.bufferedPageRange();
  for (let i = rentang.start; i < rentang.start + rentang.count; i++) {
    if (i === rentang.start) continue; // halaman judul tanpa nomor
    doc.switchToPage(i);
    const bawah = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // menulis di area margin tanpa memicu halaman baru
    doc.font(F.miring).fontSize(9).fillColor(WARNA.redup);
    const kepala = saring(doc, n.penulis ? `${n.judul} · ${n.penulis}` : n.judul);
    doc.text(kepala, M.kiri, A4.tinggi - 44, { width: LEBAR * 0.8, align: "left", lineBreak: false, ellipsis: true });
    doc.font(F.biasa).fontSize(9);
    doc.text(String(i + 1 - rentang.start), M.kiri, A4.tinggi - 44, { width: LEBAR, align: "right", lineBreak: false });
    doc.page.margins.bottom = bawah;
  }
}

export async function buatPdfNaskah(n: Naskah): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: M.atas, bottom: M.bawah, left: M.kiri, right: M.kanan },
    font: null,
    bufferPages: true,
    lang: "id-ID",
    displayTitle: true,
    info: { Title: n.judul, Author: n.penulis || undefined, Subject: n.jenis, Creator: "BahasaCerdas · AKU SASTRAWAN", Producer: "BahasaCerdas" },
  } as unknown as PDFKit.PDFDocumentOptions);
  const f = font();
  doc.registerFont(F.biasa, f.biasa);
  doc.registerFont(F.tebal, f.tebal);
  doc.registerFont(F.miring, f.miring);
  doc.font(F.biasa);

  const selesai = new Promise<Buffer>((resolve, reject) => {
    const potongan: Buffer[] = [];
    doc.on("data", (c: Buffer) => potongan.push(c));
    doc.on("end", () => resolve(Buffer.concat(potongan)));
    doc.on("error", reject);
  });

  halamanJudul(doc, n);

  const adaIsi = Boolean(n.isi) || n.bab.some((b) => b.isi || b.judul);
  if (n.isi || !adaIsi) {
    doc.addPage();
    if (n.isi) prosa(doc, n.isi);
    else tulis(doc, "miring", 11.5, WARNA.redup, "Naskah ini belum berisi tulisan.", { align: "center" });
  }
  for (const b of n.bab) {
    doc.addPage();
    doc.y = M.atas + 40;
    if (b.judul) {
      tulis(doc, "miring", 11, WARNA.redup, `Bab ${b.nomor}`, { align: "center", characterSpacing: 1 });
      doc.moveDown(0.3);
    }
    tulis(doc, "tebal", 19, WARNA.teks, b.judul || judulBab(b), { align: "center", lineGap: 3 });
    doc.moveDown(0.6);
    garis(doc, 40);
    doc.moveDown(1.4);
    if (b.isi) prosa(doc, b.isi);
    else tulis(doc, "miring", 11.5, WARNA.redup, "Bab ini belum berisi tulisan.", { align: "center" });
  }

  kakiHalaman(doc, n);
  doc.end();
  return selesai;
}
