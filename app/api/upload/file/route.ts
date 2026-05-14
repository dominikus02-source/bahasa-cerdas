import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/supabase/server";

const ALLOWED = {
  "image/jpeg": { ext: "jpg", bucket: "documents" },
  "image/png": { ext: "png", bucket: "documents" },
  "image/webp": { ext: "webp", bucket: "documents" },
  "application/pdf": { ext: "pdf", bucket: "documents" },
  "application/epub+zip": { ext: "epub", bucket: "documents" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "docx", bucket: "documents" },
  "application/msword": { ext: "doc", bucket: "documents" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { ext: "pptx", bucket: "documents" },
  "application/vnd.ms-powerpoint": { ext: "ppt", bucket: "documents" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: "xlsx", bucket: "documents" },
  "application/vnd.ms-excel": { ext: "xls", bucket: "documents" },
  "application/zip": { ext: "zip", bucket: "documents" },
  "application/x-zip-compressed": { ext: "zip", bucket: "documents" },
  "video/mp4": { ext: "mp4", bucket: "videos" },
};

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan login" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });

    const info = ALLOWED[file.type as keyof typeof ALLOWED];
    if (!info) return NextResponse.json({ error: "Tipe file tidak didukung" }, { status: 400 });

    if (file.size > 100 * 1024 * 1024) return NextResponse.json({ error: "File maksimal 100MB" }, { status: 400 });

    const folder = formData.get("folder") as string || "umum";
    const fileName = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${info.ext}`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error, data } = await supabase.storage.from(info.bucket).upload(fileName, file, {
      cacheControl: "31536000",
      upsert: true,
      contentType: file.type,
    });

    if (error) return NextResponse.json({ error: `Upload gagal: ${error.message}` }, { status: 500 });

    const { data: urlData } = supabase.storage.from(info.bucket).getPublicUrl(fileName);
    return NextResponse.json({ url: urlData.publicUrl, key: data?.path || fileName });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload gagal" }, { status: 500 });
  }
}
