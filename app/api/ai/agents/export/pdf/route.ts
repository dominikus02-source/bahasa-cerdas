import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db as prisma } from "@/lib/db";
import { logExportEvent } from "@/src/ai/core/usage-logger";
import { z } from "zod";
import { checkExportQuota, deductCreditsAtomic, ensureMonthlyLedger } from "@/lib/ai-gateway/quota-checker";
import { resolveUserAiPlan } from "@/lib/ai-gateway/plan-resolver";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_AGENTS = ["rpp", "soal"] as const;

const bodySchema = z.object({
  agentId: z.string(),
  savedResultId: z.string().optional(),
  title: z.string().max(200).optional(),
  outputJson: z.record(z.unknown()).optional(),
  editableText: z.string().max(100000).optional(),
});

const exportSchema = z.object({
  agentId: z.enum(VALID_AGENTS),
  savedResultId: z.string().optional(),
  title: z.string().max(200).optional(),
  outputJson: z.record(z.unknown()).optional(),
  editableText: z.string().max(100000).optional(),
});

export async function POST(req: NextRequest) {
  const exportStartTime = Date.now();
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // PDF exports are free (0 credits), but we still check quota for consistency
    await ensureMonthlyLedger(user);
    const quotaCheck = await checkExportQuota(user, "pdf");

    // PDF is free — always allowed (quota policy returns 0 credits for PDF)
    // But if hard mode and somehow blocked, return error
    if (!quotaCheck.allowed) {
      return NextResponse.json({
        error: "QUOTA_EXCEEDED",
        message: "Credit AI Anda sudah habis.",
      }, { status: 402 });
    }

    const body = await req.json();
    const bodyParsed = bodySchema.safeParse(body);

    if (!bodyParsed.success) {
      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    }

    const { agentId } = bodyParsed.data;
    if (agentId !== "rpp" && agentId !== "soal") {
      return NextResponse.json({
        error: "Ekspor PDF untuk fitur ini akan tersedia pada tahap berikutnya.",
      }, { status: 400 });
    }

    const parsed = exportSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || "Data tidak valid";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { savedResultId, title, outputJson, editableText } = parsed.data;

    // Dynamic imports to avoid loading pdfkit at module level
    const [
      { generateRPppdf, getRPPMetadata },
      { generateSoalPdf, getSoalMetadata },
      { generateFallbackPdf },
    ] = await Promise.all([
      import("@/src/ai/export/pdf/rpp-pdf"),
      import("@/src/ai/export/pdf/soal-pdf"),
      import("@/src/ai/export/pdf/fallback-pdf"),
    ]);

    let output: Record<string, unknown>;
    let docTitle: string;
    let docEditableText: string | null | undefined;

    if (savedResultId) {
      const saved = await prisma.aiSavedResult.findUnique({
        where: { id: savedResultId },
      });

      if (!saved) {
        return NextResponse.json({ error: "Riwayat tidak ditemukan." }, { status: 404 });
      }
      if (saved.userId !== user.id) {
        return NextResponse.json({ error: "Anda tidak memiliki akses ke riwayat ini." }, { status: 403 });
      }

      output = saved.outputJson as Record<string, unknown>;
      docTitle = saved.title;
      docEditableText = saved.editableText;
    } else {
      output = outputJson ?? {};
      docTitle = title || (agentId === "rpp" ? "RPP" : "Soal");
      docEditableText = editableText;
    }

    let buffer: Buffer;
    let filename: string;

    if (agentId === "rpp") {
      const meta = getRPPMetadata(output);
      docTitle = title || meta.title;
      try {
        buffer = await generateRPppdf({
          title: docTitle,
          output,
          editableText: docEditableText,
        });
      } catch {
        buffer = await generateFallbackPdf(docTitle, docEditableText ?? "");
      }
      if (!buffer || buffer.length < 100) {
        buffer = await generateFallbackPdf(docTitle, docEditableText ?? "");
      }
      filename = meta.filename;
    } else {
      const meta = getSoalMetadata(output);
      docTitle = title || meta.title;
      try {
        buffer = await generateSoalPdf({
          title: docTitle,
          output,
          editableText: docEditableText,
        });
      } catch {
        buffer = await generateFallbackPdf(docTitle, docEditableText ?? "");
      }
      if (!buffer || buffer.length < 100) {
        buffer = await generateFallbackPdf(docTitle, docEditableText ?? "");
      }
      filename = meta.filename;
    }

    // PDF is free — no deduction needed
    // Fire-and-forget export event logging
    logExportEvent(user.id, "pdf", agentId, Date.now() - exportStartTime).catch(() => {});

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("[AI Export PDF] Error:", error);
    return NextResponse.json({
      error: "PDF belum bisa dibuat. Coba lagi beberapa saat.",
    }, { status: 500 });
  }
}
