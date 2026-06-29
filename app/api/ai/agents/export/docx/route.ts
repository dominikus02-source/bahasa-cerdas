import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db as prisma } from "@/lib/db";
import { logExportEvent } from "@/src/ai/core/usage-logger";
import { z } from "zod";
import { generateRPPDocx, getRPPMetadata } from "@/src/ai/export/docx/rpp-docx";
import { generateSoalDocx, getSoalMetadata } from "@/src/ai/export/docx/soal-docx";
import { checkExportQuota, deductCreditsAtomic, ensureMonthlyLedger } from "@/lib/ai-gateway/quota-checker";
import { resolveUserAiPlan } from "@/lib/ai-gateway/plan-resolver";

const VALID_AGENTS = ["rpp", "soal"] as const;

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

    // Ensure ledger exists and check export quota
    await ensureMonthlyLedger(user);
    const quotaCheck = await checkExportQuota(user, "docx");
    if (!quotaCheck.allowed) {
      return NextResponse.json({
        error: "QUOTA_EXCEEDED",
        message: "Credit AI Anda sudah habis. Upgrade atau tunggu periode berikutnya.",
        quota: {
          plan: quotaCheck.plan,
          creditsRequired: quotaCheck.creditsRequired,
          remainingCredits: quotaCheck.creditsRemaining,
        },
      }, { status: 402 });
    }

    const body = await req.json();
    const parsed = exportSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || "Data tidak valid";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { agentId, savedResultId, title, outputJson, editableText } = parsed.data;

    let output: Record<string, unknown>;
    let docTitle: string;
    let docEditableText: string | null | undefined;

    if (savedResultId) {
      // Load from saved result — enforce ownership
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
      // Use provided data
      if (!outputJson) {
        return NextResponse.json({ error: "outputJson tidak boleh kosong." }, { status: 400 });
      }
      output = outputJson;
      docTitle = title || "Hasil AI";
      docEditableText = editableText;
    }

    let buffer: Buffer;
    let filename: string;

    if (agentId === "rpp") {
      const meta = getRPPMetadata(output);
      docTitle = title || meta.title;
      buffer = await generateRPPDocx({
        title: docTitle,
        output,
        editableText: docEditableText,
      });
      filename = meta.filename;
    } else if (agentId === "soal") {
      const meta = getSoalMetadata(output);
      docTitle = title || meta.title;
      buffer = await generateSoalDocx({
        title: docTitle,
        output,
        editableText: docEditableText,
      });
      filename = meta.filename;
    } else {
      return NextResponse.json({
        error: "Ekspor DOCX untuk fitur ini akan tersedia pada tahap berikutnya.",
      }, { status: 400 });
    }

    // Deduct credit only after successful export generation
    const planInfo = resolveUserAiPlan(user);
    await deductCreditsAtomic(user.id, {
      plan: planInfo.plan,
      unlimited: planInfo.unlimited,
      period: planInfo.isTrial ? "trial" : new Date().toISOString().slice(0, 7),
      isTrial: planInfo.isTrial,
    }, 1);

    // Fire-and-forget export event logging
    logExportEvent(user.id, "docx", agentId, Date.now() - exportStartTime).catch(() => {});

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("[AI Export DOCX] Error:", error);
    return NextResponse.json({
      error: "DOCX belum bisa dibuat. Coba lagi beberapa saat.",
    }, { status: 500 });
  }
}
