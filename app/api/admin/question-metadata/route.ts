import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { validateQuestionMetadata, type QuestionMetadataInput } from "@/lib/question-metadata/validation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toInput(value: unknown): QuestionMetadataInput | null {
  if (!isRecord(value)) return null;
  return {
    source: typeof value.source === "string" ? value.source : "",
    questionId: typeof value.questionId === "string" ? value.questionId : "",
    skill: typeof value.skill === "string" ? value.skill : null,
    subskill: typeof value.subskill === "string" ? value.subskill : null,
    difficulty: typeof value.difficulty === "string" ? value.difficulty : null,
    level: typeof value.level === "number" ? value.level : null,
    topic: typeof value.topic === "string" ? value.topic : null,
    questionType: typeof value.questionType === "string" ? value.questionType : "",
    cefr: typeof value.cefr === "string" ? value.cefr : null,
    provenance: typeof value.provenance === "string" ? value.provenance : "",
    confidence: typeof value.confidence === "string" ? value.confidence : "",
    status: typeof value.status === "string" ? value.status : undefined,
    taxonomyVersion: typeof value.taxonomyVersion === "string" ? value.taxonomyVersion : undefined,
    metadataVersion: typeof value.metadataVersion === "string" ? value.metadataVersion : undefined,
  };
}

async function requireMetadataEditor() {
  const user = await getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  if (!user.isFounder && user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { user } as const;
}

export async function GET(req: NextRequest) {
  const auth = await requireMetadataEditor();
  if (auth.error) return auth.error;

  const search = new URL(req.url).searchParams;
  const source = search.get("source") || undefined;
  const status = search.get("status") || undefined;
  const limit = Math.min(Math.max(Number(search.get("limit") || 50), 1), 100);

  const rows = await db.questionMetadata.findMany({
    where: { ...(source ? { source } : {}), ...(status ? { status } : {}) },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      source: true,
      questionId: true,
      skill: true,
      subskill: true,
      difficulty: true,
      level: true,
      topic: true,
      questionType: true,
      cefr: true,
      provenance: true,
      confidence: true,
      status: true,
      taxonomyVersion: true,
      metadataVersion: true,
      createdById: true,
      reviewedById: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ items: rows });
}

/** Admin/founder-only import/update. Student clients cannot mutate metadata. */
export async function POST(req: NextRequest) {
  const auth = await requireMetadataEditor();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const rawItems = isRecord(body) && Array.isArray(body.items) ? body.items : [body];
  if (rawItems.length === 0 || rawItems.length > 50) {
    return NextResponse.json({ error: "Jumlah metadata harus 1 sampai 50" }, { status: 400 });
  }

  const inputs = rawItems.map(toInput);
  if (inputs.some((input) => input === null)) {
    return NextResponse.json({ error: "Setiap metadata harus berupa objek" }, { status: 400 });
  }

  const validated = inputs.map((input) => validateQuestionMetadata(input as QuestionMetadataInput));
  const errors = validated.flatMap((result, index) => result.valid ? [] : result.errors.map((error) => `items[${index}]: ${error}`));
  if (errors.length > 0) return NextResponse.json({ error: "Metadata tidak valid", details: errors }, { status: 400 });

  const values = validated.map((result) => result.value!);
  const saved = await db.$transaction(
    values.map((value) =>
      db.questionMetadata.upsert({
        where: { source_questionId: { source: value.source, questionId: value.questionId } },
        update: {
          skill: value.skill,
          subskill: value.subskill,
          difficulty: value.difficulty,
          level: value.level,
          topic: value.topic,
          questionType: value.questionType,
          cefr: value.cefr,
          provenance: value.provenance,
          confidence: value.confidence,
          status: value.status,
          taxonomyVersion: value.taxonomyVersion,
          metadataVersion: value.metadataVersion,
          reviewedById: value.status === "APPROVED" ? auth.user.id : null,
        },
        create: {
          ...value,
          createdById: auth.user.id,
          reviewedById: value.status === "APPROVED" ? auth.user.id : null,
        },
      })
    )
  );

  return NextResponse.json({ ok: true, count: saved.length, items: saved }, { status: 201 });
}
