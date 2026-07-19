import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;

    const question = await db.uKBIQuestion.findUnique({
      where: { id: questionId },
      select: { audioUrl: true },
    });

    if (!question?.audioUrl) {
      return new NextResponse("Audio not found", { status: 404 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const storagePath = question.audioUrl.replace(
      /^.*\/storage\/v1\/object\/(public|authenticated)\//,
      ""
    );

    const { data, error } = await supabase.storage
      .from(storagePath.split("/")[0])
      .download(storagePath.split("/").slice(1).join("/"));

    if (error || !data) {
      console.error(`[audio-proxy] Download failed: ${error?.message}`);
      return new NextResponse("Audio unavailable", { status: 502 });
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const ext = storagePath.endsWith(".mp3") ? "mp3" : "webm";
    const contentType = ext === "mp3" ? "audio/mpeg" : "audio/webm";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("[audio-proxy] Error:", e);
    return new NextResponse("Internal error", { status: 500 });
  }
}
