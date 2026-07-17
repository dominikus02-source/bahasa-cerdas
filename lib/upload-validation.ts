/**
 * Server-side upload validation: MIME allowlist + extension match + size cap +
 * MAGIC-BYTE (file signature) check. The magic-byte check is the important part —
 * it defends against a client lying about `file.type`/extension to smuggle an
 * executable or mismatched file past a MIME-only allowlist.
 */

type Rule = {
  ext: string[];
  maxBytes: number;
  // Signature(s): each is a list of {offset, bytes}. A file matches the rule if
  // ANY signature fully matches. Empty = skip magic check (not used here).
  sig: { offset: number; bytes: number[] }[];
};

const MB = 1024 * 1024;

// Zip-based OOXML/EPUB all start with the ZIP local-file header "PK\x03\x04".
const ZIP: Rule["sig"] = [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }];
// Legacy MS Office (doc/xls/ppt) are OLE compound files.
const OLE: Rule["sig"] = [{ offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }];

export const UPLOAD_RULES: Record<string, Rule> = {
  "image/jpeg": { ext: ["jpg", "jpeg"], maxBytes: 10 * MB, sig: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }] },
  "image/png": { ext: ["png"], maxBytes: 10 * MB, sig: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }] },
  // WEBP = "RIFF"...."WEBP"
  "image/webp": { ext: ["webp"], maxBytes: 10 * MB, sig: [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }] },
  "application/pdf": { ext: ["pdf"], maxBytes: 20 * MB, sig: [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }] },
  "application/epub+zip": { ext: ["epub"], maxBytes: 20 * MB, sig: ZIP },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: ["docx"], maxBytes: 15 * MB, sig: ZIP },
  "application/msword": { ext: ["doc"], maxBytes: 15 * MB, sig: OLE },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { ext: ["pptx"], maxBytes: 50 * MB, sig: ZIP },
  "application/vnd.ms-powerpoint": { ext: ["ppt"], maxBytes: 50 * MB, sig: OLE },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: ["xlsx"], maxBytes: 10 * MB, sig: ZIP },
  "application/vnd.ms-excel": { ext: ["xls"], maxBytes: 10 * MB, sig: OLE },
  "application/zip": { ext: ["zip"], maxBytes: 50 * MB, sig: ZIP },
  "application/x-zip-compressed": { ext: ["zip"], maxBytes: 50 * MB, sig: ZIP },
  // MP4 = ....(4 bytes size)"ftyp" at offset 4
  "video/mp4": { ext: ["mp4"], maxBytes: 500 * MB, sig: [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }] },
  // Audio rekaman Berbicara (MediaRecorder). WebM = EBML header 1A 45 DF A3.
  "audio/webm": { ext: ["webm"], maxBytes: 25 * MB, sig: [{ offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] }] },
  // M4A/MP4 audio (Safari) = "ftyp" at offset 4.
  "audio/mp4": { ext: ["mp4", "m4a"], maxBytes: 25 * MB, sig: [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }] },
};

export const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
export const AUDIO_MIMES = ["audio/webm", "audio/mp4"];

function sigMatches(header: Uint8Array, sig: Rule["sig"]): boolean {
  // ALL parts of a signature must match (e.g. RIFF + WEBP for webp).
  return sig.every(({ offset, bytes }) =>
    bytes.every((b, i) => header[offset + i] === b)
  );
}

export type UploadValidation = { ok: true; ext: string } | { ok: false; error: string; status: number };

/**
 * Validate a File against the allowlist. Pass `allowedMimes` to restrict which
 * types are acceptable for a given endpoint (e.g. images only).
 */
export async function validateUpload(file: File, allowedMimes?: string[]): Promise<UploadValidation> {
  const rule = UPLOAD_RULES[file.type];
  if (!rule || (allowedMimes && !allowedMimes.includes(file.type))) {
    return { ok: false, error: "Tipe file tidak didukung.", status: 400 };
  }
  if (file.size === 0) return { ok: false, error: "File kosong.", status: 400 };
  if (file.size > rule.maxBytes) {
    return { ok: false, error: `Ukuran file melebihi batas ${Math.round(rule.maxBytes / MB)}MB.`, status: 413 };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!rule.ext.includes(ext)) {
    return { ok: false, error: "Ekstensi file tidak cocok dengan tipenya.", status: 400 };
  }

  // Magic-byte check — read only the header, not the whole file.
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (rule.sig.length && !sigMatches(header, rule.sig)) {
    return { ok: false, error: "Isi file tidak sesuai dengan tipe yang diklaim.", status: 400 };
  }

  return { ok: true, ext: rule.ext[0] };
}
