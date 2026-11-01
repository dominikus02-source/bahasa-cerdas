import { NextRequest, NextResponse } from "next/server";
import { createStorageAdminClient } from "@/lib/supabase/storage-server";
import { getUser } from "@/lib/supabase/server";
import { validateUpload } from "@/lib/upload-validation";

const BUCKET_BY_MIME: Record<string, string> = { "video/mp4": "videos" };

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan login" }, { status: 401 });

    const formData = await req.formData();
    const value = formData.get("file");
    if (!(value instanceof File)) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    const file = value;

    // MIME + extension + size + magic-byte validation (server-side, trust nothing).
    const check = await validateUpload(file);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const bucket = BUCKET_BY_MIME[file.type] || "documents";
    const folderValue = formData.get("folder");
    const folder = typeof folderValue === "string" && folderValue ? folderValue : "umum";
    if (folder.length > 40 || !/^[a-zA-Z0-9_-]+$/.test(folder)) {
      return NextResponse.json({ error: "Folder unggahan tidak valid." }, { status: 400 });
    }
    const fileName = `${folder}/${user.id}/${Date.now()}-${crypto.randomUUID()}.${check.ext}`;

    const supabase = createStorageAdminClient();

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
