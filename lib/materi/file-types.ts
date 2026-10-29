/**
 * Satu sumber kebenaran untuk tipe berkas Materi Ajar guru.
 *
 * Dipakai bersama oleh:
 *   - app/(dashboard)/guru/materi-ajar/page.tsx  (pemilih berkas + unggah)
 *   - app/api/guru/materi/route.ts               (validasi + filter folder)
 *   - components/materi/MateriViewer.tsx         (pratinjau)
 *
 * Tipe yang didukung: PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx).
 * Catatan: ekstensi `.doc`/`.ppt` (format lama) sering dikirim browser dengan
 * MIME kosong atau `application/octet-stream`, jadi Content-Type selalu
 * diturunkan dari ekstensi — bukan dari `File.type`.
 */

export const MATERI_ALLOWED_EXTENSIONS = ["pdf", "ppt", "pptx", "doc", "docx"] as const;

export type MateriExtension = (typeof MATERI_ALLOWED_EXTENSIONS)[number];
export type MateriFileType = "PDF" | "PPT" | "PPTX" | "DOC" | "DOCX";

/** Nilai atribut `accept` pada <input type="file">. */
export const MATERI_ACCEPT = ".pdf,.ppt,.pptx,.doc,.docx";

export const MATERI_MAX_BYTES: Record<MateriFileType, number> = {
  PDF: 20 * 1024 * 1024,
  PPT: 50 * 1024 * 1024,
  PPTX: 50 * 1024 * 1024,
  DOC: 20 * 1024 * 1024,
  DOCX: 20 * 1024 * 1024,
};

export const MATERI_TYPE_LABEL: Record<MateriFileType, string> = {
  PDF: "PDF",
  PPT: "PowerPoint (.ppt)",
  PPTX: "PowerPoint (.pptx)",
  DOC: "Word (.doc)",
  DOCX: "Word (.docx)",
};

export const MATERI_CONTENT_TYPE: Record<MateriFileType, string> = {
  PDF: "application/pdf",
  PPT: "application/vnd.ms-powerpoint",
  PPTX: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  DOC: "application/msword",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Semua nilai `Materi.fileType` yang sah — dipakai filter Prisma. */
export const MATERI_SEMUA_TIPE: MateriFileType[] = ["PDF", "PPT", "PPTX", "DOC", "DOCX"];

/** Folder tampilan guru → tipe berkas di dalamnya. */
export const MATERI_FOLDER_TYPES: Record<string, MateriFileType[]> = {
  PPT: ["PPT", "PPTX"],
  DOC: ["DOC", "DOCX"],
  PDF: ["PDF"],
};

export function materiExtFromName(name: string): MateriExtension | null {
  const ext = (name.split(".").pop() || "").trim().toLowerCase();
  return (MATERI_ALLOWED_EXTENSIONS as readonly string[]).includes(ext)
    ? (ext as MateriExtension)
    : null;
}

export function materiFileTypeFromExt(ext: string): MateriFileType | null {
  const normal = ext.trim().toLowerCase();
  const found = MATERI_ALLOWED_EXTENSIONS.find((item) => item === normal);
  return found ? (found.toUpperCase() as MateriFileType) : null;
}

export function isMateriFileNameAllowed(name: string): boolean {
  return materiExtFromName(name) !== null;
}

/** Pesan galat tunggal supaya UI dan API tidak pernah berbeda. */
export const MATERI_TYPE_ERROR =
  "File harus PDF, Word (DOC/DOCX), atau PowerPoint (PPT/PPTX)";
