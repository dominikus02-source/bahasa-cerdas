// Deprecated: AI generation is centralized in /guru/ai-tools.
// Polling job RPP lama — tidak dipakai lagi setelah /guru/rpp-modul diarahkan ke Alat AI.
// Endpoint dipertahankan sementara untuk kompatibilitas; jangan tambahkan
// pemanggil baru — gunakan POST /api/ai/agents/run dengan agentId yang sesuai.
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getJobStatus } from "@/lib/ai-queue";
import { scrubAiProviderNames } from "@/lib/ai/public-ai-sanitize";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { jobId } = await params;
    const job = await getJobStatus(jobId);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Kerahasiaan teknologi AI: job lama bisa menyimpan pesan berisi nama penyedia.
    return NextResponse.json({ ...job, error: scrubAiProviderNames(job.error) });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
