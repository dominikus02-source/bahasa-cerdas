import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveVerifiedTeacherActor } from "@/src/main-bersama/adapters/auth/teacher-actor";
import { mainBersamaMutationBlocked } from "@/lib/main-bersama/mutation-guard";
import {
  questionPackageSummarySelect,
  questionPackageSummary,
} from "@/lib/main-bersama/question-package-library";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = mainBersamaMutationBlocked(
    "teacher/question-packages/visibility",
  );
  if (blocked) return blocked;
  const actor = await resolveVerifiedTeacherActor();
  if (!actor)
    return NextResponse.json(
      { error: "Masuk sebagai guru untuk mengatur akses soal." },
      { status: 401 },
    );
  const { id } = await params;
  try {
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      !("isPublic" in body) ||
      typeof body.isPublic !== "boolean"
    )
      return NextResponse.json(
        { error: "Pilih akses Privat atau Publik." },
        { status: 400 },
      );
    // Ownership stays in the mutation predicate; another teacher cannot publish this set.
    const changed = await db.soalSet.updateMany({
      where: { id, creatorId: actor.userId },
      data: { isPublic: body.isPublic },
    });
    if (!changed.count)
      return NextResponse.json(
        { error: "Paket soal milikmu tidak ditemukan." },
        { status: 404 },
      );
    const row = await db.soalSet.findFirst({
      where: { id, creatorId: actor.userId },
      select: questionPackageSummarySelect,
    });
    if (!row)
      return NextResponse.json(
        { error: "Paket soal tidak ditemukan." },
        { status: 404 },
      );
    return NextResponse.json({
      package: questionPackageSummary(row, actor.userId),
    });
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json(
        { error: "Data akses soal tidak valid." },
        { status: 400 },
      );
    return NextResponse.json(
      { error: "Akses soal belum tersimpan. Coba lagi." },
      { status: 500 },
    );
  }
}
