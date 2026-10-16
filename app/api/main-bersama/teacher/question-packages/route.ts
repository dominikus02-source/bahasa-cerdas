import { NextResponse } from "next/server";
import { resolveVerifiedTeacherActor } from "@/src/main-bersama/adapters/auth/teacher-actor";
import { saveQuestionPackage } from "@/lib/main-bersama/save-question-package";
import { packageDraftSchema } from "@/lib/main-bersama/question-authoring";
import { db } from "@/lib/db";
import { questionPackageSummarySelect, questionPackageSummary, questionPackageWhere } from "@/lib/main-bersama/question-package-library";

export async function GET(request: Request) {
  const actor = await resolveVerifiedTeacherActor();
  if (!actor) return NextResponse.json({ error: "Masuk sebagai guru untuk melihat paket soal." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const scope = params.get("scope") === "public" ? "public" : "mine";
  const search = (params.get("search") ?? "").slice(0, 120);
  const cursor = params.get("cursor");
  try {
    const rows = await db.soalSet.findMany({
      where: questionPackageWhere(actor.userId, scope, search),
      select: questionPackageSummarySelect,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 31,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    return NextResponse.json({ packages: rows.slice(0, 30).map(row => questionPackageSummary(row, actor.userId)), nextCursor: rows.length > 30 ? rows[29].id : null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Daftar paket belum dapat dimuat. Coba lagi." }, { status: 500 });
  }
}

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
