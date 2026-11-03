/**
 * Susunan naskah untuk ekspor (.txt, PDF, Word): judul, penulis, jenis,
 * sinopsis, Peta Cerita (dibaca dari kolom synopsis — JSON berversi ATAU teks
 * lama, tidak pernah ditampilkan sebagai JSON mentah), isi, dan bab.
 *
 * Modul murni tanpa dependensi server; diuji di scripts/test-aku-sastrawan-ekspor.ts.
 */
import { bacaSinopsis, petaBelumDiisi, petaSebagaiTeks, type PetaCerita } from "@/lib/aku-sastrawan/peta-cerita";
import type { FormatEkspor } from "./format";

export const JUDUL_KOSONG = "Tanpa judul";

export type ButirPeta = { label?: string; isi: string };
export type BagianPeta = { judul: string; butir: ButirPeta[] };
export type Bab = { nomor: number; judul: string; isi: string };

export type Naskah = {
  judul: string;
  penulis: string;
  jenis: "Cerpen" | "Novel";
  sinopsis: string;
  peta: BagianPeta[];
  /** Isi utama (cerpen, atau pengantar/isi lama sebuah novel). */
  isi: string;
  bab: Bab[];
  /** Teks rancangan untuk .txt — sama persis dengan format lama. */
  rancanganTeks: string;
};

export type ProyekEkspor = {
  title: string;
  genre: string;
  synopsis: string | null;
  content: string;
  chapters: { title: string; content: string; orderIndex: number }[];
};

const rapi = (s: string | null | undefined) => (s ?? "").replace(/\r\n?/g, "\n").trim();

function bagianPeta(peta: PetaCerita): BagianPeta[] {
  if (petaBelumDiisi(peta)) return [];
  const out: BagianPeta[] = [];
  const tambah = (judul: string, butir: ButirPeta[]) => {
    const isi = butir.map((b) => ({ ...b, isi: rapi(b.isi) })).filter((b) => b.isi);
    if (isi.length) out.push({ judul, butir: isi });
  };
  tambah("Genre", [{ isi: peta.genre }]);
  const tokoh = peta.tokoh.filter((t) => rapi(t.nama) || rapi(t.watak) || rapi(t.keinginan));
  if (tokoh.length) {
    out.push({
      judul: "Tokoh",
      butir: tokoh.map((t) => ({
        label: rapi(t.nama) || "Tanpa nama",
        isi: [rapi(t.watak) && `Watak: ${rapi(t.watak)}`, rapi(t.keinginan) && `Keinginan: ${rapi(t.keinginan)}`].filter(Boolean).join(" · ") || "—",
      })),
    });
  }
  tambah("Latar", [
    { label: "Tempat", isi: peta.latar.tempat },
    { label: "Waktu", isi: peta.latar.waktu },
    { label: "Suasana", isi: peta.latar.suasana },
  ]);
  tambah("Konflik", [{ isi: peta.konflik }]);
  tambah("Alur", [
    { label: "Awal", isi: peta.alur.awal },
    { label: "Tengah", isi: peta.alur.tengah },
    { label: "Akhir", isi: peta.alur.akhir },
  ]);
  tambah("Sudut pandang", [{ isi: peta.sudutPandang }]);
  tambah("Amanat/tema", [{ isi: peta.amanat }]);
  return out;
}

export function susunNaskah(proyek: ProyekEkspor, penulis: string): Naskah {
  const { sinopsis, peta } = bacaSinopsis(proyek.synopsis);
  return {
    judul: rapi(proyek.title) || JUDUL_KOSONG,
    penulis: rapi(penulis),
    jenis: proyek.genre === "NOVEL" ? "Novel" : "Cerpen",
    sinopsis: rapi(sinopsis),
    peta: bagianPeta(peta),
    isi: rapi(proyek.content),
    bab: [...proyek.chapters]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      // Nomor = urutan tampil (1, 2, 3 …) agar tidak bolong setelah bab dihapus;
      // judul bawaan "Bab N" tidak diulang di bawah nomor bab.
      .map((c, i) => ({ nomor: i + 1, judul: /^bab\s*\d+$/i.test(rapi(c.title)) ? "" : rapi(c.title), isi: rapi(c.content) })),
    rancanganTeks: petaSebagaiTeks(sinopsis, peta),
  };
}

export const judulBab = (b: Bab) => (b.judul ? `Bab ${b.nomor}: ${b.judul}` : `Bab ${b.nomor}`);

/** Paragraf dari teks bebas: satu baris = satu paragraf; baris kosong = jeda adegan. */
export function pecahParagraf(isi: string): { teks: string; jedaSebelum: boolean }[] {
  const out: { teks: string; jedaSebelum: boolean }[] = [];
  let jeda = false;
  for (const baris of rapi(isi).split("\n")) {
    const t = baris.trim();
    if (!t) { jeda = out.length > 0; continue; }
    out.push({ teks: t, jedaSebelum: jeda });
    jeda = false;
  }
  return out;
}

/** Ekspor .txt — format lama dipertahankan, ditambah baris penulis. */
export function naskahSebagaiTeks(n: Naskah): string {
  const parts = [n.judul];
  if (n.penulis) parts.push(`oleh ${n.penulis}`);
  parts.push("");
  if (n.rancanganTeks) parts.push(n.rancanganTeks, "", "———", "");
  if (n.isi) parts.push(n.isi, "");
  for (const b of n.bab) parts.push(judulBab(b), "", b.isi, "");
  return parts.join("\n");
}

const EKSTENSI: Record<FormatEkspor, string> = { txt: ".txt", pdf: ".pdf", docx: ".docx" };
export const MIME_EKSPOR: Record<FormatEkspor, string> = {
  txt: "text/plain; charset=utf-8",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * Nama berkas: versi Unicode (judul asli, mis. "Senja di Pelabuhan — Bab Ganjil.pdf")
 * lewat filename*=UTF-8'' (RFC 5987/6266) + cadangan ASCII untuk peramban lama.
 */
export function namaBerkas(judul: string, format: FormatEkspor): { unicode: string; ascii: string } {
  const bersih = (judul || "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 120)
    .trim();
  const ascii = bersih.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
  const ext = EKSTENSI[format];
  return { unicode: (bersih || "Naskah") + ext, ascii: (ascii || "naskah") + ext };
}

export function contentDisposition(judul: string, format: FormatEkspor): string {
  const { unicode, ascii } = namaBerkas(judul, format);
  const enc = encodeURIComponent(unicode).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${enc}`;
}
