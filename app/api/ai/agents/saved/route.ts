import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db as prisma } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const AGENT_IDS = ["rpp", "soal", "ppt", "review", "bc-assistant", "eyd", "feedback", "grading", "text-analysis"] as const;

const createSchema = z.object({
  agentId: z.enum(AGENT_IDS),
  title: z.string().min(1).max(200).trim(),
  inputJson: z.record(z.unknown()),
  outputJson: z.record(z.unknown()),
  editableText: z.string().max(50000).nullable().optional(),
  qualityScore: z.number().int().min(0).max(100).nullable().optional(),
  provider: z.string().max(50).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || "Data tidak valid";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const data = parsed.data;

    const inputJson = data.inputJson as Prisma.InputJsonValue;
    const outputJson = data.outputJson as Prisma.InputJsonValue;
    const meta = data.metadata !== undefined && data.metadata !== null
      ? data.metadata as Prisma.InputJsonValue
      : Prisma.DbNull;

    const saved = await prisma.aiSavedResult.create({
      data: {
        userId: user.id,
        agentId: data.agentId,
        title: data.title,
        inputJson,
        outputJson,
        editableText: data.editableText ?? null,
        qualityScore: data.qualityScore ?? null,
        provider: data.provider ?? null,
        model: data.model ?? null,
        metadata: meta,
      },
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error) {
    console.error("[AI Saved] POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
    const cursor = url.searchParams.get("cursor");

    const where: Record<string, unknown> = { userId: user.id };
    if (agentId && AGENT_IDS.includes(agentId as typeof AGENT_IDS[number])) {
      where.agentId = agentId;
    }

    const results = await prisma.aiSavedResult.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      success: true,
      data: items,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("[AI Saved] GET error:", error);
    return NextResponse.json({ error: "Gagal memuat riwayat." }, { status: 500 });
  }
}
