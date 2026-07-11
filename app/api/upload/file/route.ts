import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/supabase/server";
import { validateUpload } from "@/lib/upload-validation";

const BUCKET_BY_MIME: Record<string, string> = { "video/mp4": "videos" };

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan login" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });

    // MIME + extension + size + magic-byte validation (server-side, trust nothing).
    const check = await validateUpload(file);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const bucket = BUCKET_BY_MIME[file.type] || "documents";
    const folder = formData.get("folder") as string || "umum";
    const fileName = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${check.ext}`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error, data } = await supabase.storage.from(bucket).upload(fileName, file, {
      cacheControl: "31536000",
      upsert: true,
      contentType: file.type,
    });

    if (error) return NextResponse.json({ error: `Upload gagal: ${error.message}` }, { status: 500 });

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return NextResponse.json({ url: urlData.publicUrl, key: data?.path || fileName });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload gagal" }, { status: 500 });
  }
}
