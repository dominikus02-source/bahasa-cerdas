import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) return new NextResponse("Missing url param", { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const storagePath = url.replace(
      /^https?:\/\/[^\/]+\/storage\/v1\/object\/(public|authenticated)\//,
      ""
    );

    if (!storagePath) return new NextResponse("Invalid URL", { status: 400 });

    const bucket = storagePath.split("/")[0];
    const filePath = storagePath.split("/").slice(1).join("/");

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error || !data) {
      console.error(`[audio-proxy] Download failed: ${error?.message}`);
      return new NextResponse("Audio unavailable", { status: 502 });
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const ext = filePath.split(".").pop()?.toLowerCase() || "mp3";
    const contentType =
      ext === "mp3" || ext === "mpeg"
        ? "audio/mpeg"
        : ext === "wav"
        ? "audio/wav"
        : ext === "ogg"
        ? "audio/ogg"
        : ext === "mp4"
        ? "audio/mp4"
        : "audio/webm";

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
