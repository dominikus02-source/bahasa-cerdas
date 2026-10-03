import mammoth from "mammoth";
import { parseQuestionText } from "./question-authoring";

export const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024;
export async function importQuestionDocument(name: string, bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES)
    throw new Error("Pilih PDF atau DOCX berukuran maksimal 3 MB.");
  let text: string;
  if (/\.pdf$/i.test(name) && bytes.subarray(0, 5).toString() === "%PDF-") {
    const { PDFParse } = await import("pdf-parse-modern");
    const parser = new PDFParse({
      data: new Uint8Array(bytes),
      isEvalSupported: false,
    });
    try {
      const info = await parser.getInfo();
      if (info.total > 100)
        throw new Error(
          "Maksimal 100 halaman. Pisahkan dokumen terlebih dahulu.",
        );
      text = (await parser.getText({ pageJoiner: "\n" })).text;
    } finally {
      await parser.destroy();
    }
  } else if (/\.docx$/i.test(name) && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    text = (await mammoth.extractRawText({ buffer: bytes })).value;
  } else throw new Error("Format file tidak sesuai. Gunakan PDF atau DOCX.");
  if (text.trim().length < 10)
    throw new Error(
      "Teks tidak terbaca. PDF hasil scan perlu diubah menjadi teks terlebih dahulu, atau gunakan input manual.",
    );
  return { text, ...parseQuestionText(text) };
}
