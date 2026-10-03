import { NextResponse } from "next/server";
import { resolveVerifiedTeacherActor } from "@/src/main-bersama/adapters/auth/teacher-actor";
import { saveQuestionPackage } from "@/lib/main-bersama/save-question-package";
import { packageDraftSchema } from "@/lib/main-bersama/question-authoring";

export async function POST(request: Request) {
  try {
    const actor = await resolveVerifiedTeacherActor();
    if (!actor)
      return NextResponse.json(
        { error: "Masuk sebagai guru untuk membuat soal." },
        { status: 401 },
      );
    if (Number(request.headers.get("content-length") ?? 0) > 1000000)
      return NextResponse.json(
        { error: "Paket terlalu besar." },
        { status: 413 },
      );
    const raw = await request.text();
    if (raw.length > 1000000)
      return NextResponse.json(
        { error: "Paket terlalu besar." },
        { status: 413 },
      );
    const parsed = packageDraftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Periksa isi soal." },
        { status: 400 },
      );
    const value = await saveQuestionPackage(actor.userId, parsed.data);
    return NextResponse.json({ package: value }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json(
        { error: "Data soal tidak valid." },
        { status: 400 },
      );
    console.error("Main Bersama question package save failed");
    return NextResponse.json(
      { error: "Soal belum tersimpan. Coba lagi." },
      { status: 500 },
    );
  }
}
