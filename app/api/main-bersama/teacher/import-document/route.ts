import { NextResponse } from "next/server";
import { resolveVerifiedTeacherActor } from "@/src/main-bersama/adapters/auth/teacher-actor";
import {
  importQuestionDocument,
  MAX_DOCUMENT_BYTES,
} from "@/lib/main-bersama/import-question-document";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  try {
    const actor = await resolveVerifiedTeacherActor();
    if (!actor)
      return NextResponse.json(
        { error: "Masuk sebagai guru untuk mengimpor soal." },
        { status: 401 },
      );
    if (
      Number(request.headers.get("content-length") ?? 0) >
      MAX_DOCUMENT_BYTES + 65536
    )
      return NextResponse.json(
        { error: "Maksimal ukuran dokumen 3 MB." },
        { status: 413 },
      );
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return NextResponse.json(
        { error: "Pilih PDF atau DOCX." },
        { status: 400 },
      );
    if (!file.size || file.size > MAX_DOCUMENT_BYTES)
      return NextResponse.json(
        { error: "Maksimal ukuran dokumen 3 MB." },
        { status: 413 },
      );
    return NextResponse.json(
      await importQuestionDocument(
        file.name,
        Buffer.from(await file.arrayBuffer()),
      ),
    );
  } catch (error) {
    const known =
      error instanceof Error &&
      /terlebih dahulu|terlalu panjang|Format file|Teks tidak|maksimal 3 MB/.test(
        error.message,
      );
    return NextResponse.json(
      {
        error: known
          ? (error as Error).message
          : "Dokumen belum bisa dibaca. Pastikan tidak terkunci, atau gunakan input manual.",
      },
      { status: 422 },
    );
  }
}
