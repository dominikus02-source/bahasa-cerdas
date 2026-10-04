import { uploadPrivate } from "@/lib/compliance/assets";
import { NextRequest, NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { validateUpload, IMAGE_MIMES } from "@/lib/upload-validation";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });

    // Images only — MIME + extension + size + magic-byte validation.
    const check = await validateUpload(file, IMAGE_MIMES);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
    if (user.role === "MURID") return NextResponse.json(await uploadPrivate(file, user.id, check.ext));

    const fileName = `toko/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${check.ext}`;

    // Use the authenticated session, so Storage records ownership and applies RLS.
    const supabase = await createClient();
    const bucket = "avatars";
    const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

    if (error) return NextResponse.json({ error: "Gambar belum berhasil diunggah. Coba lagi atau hubungi pengelola.", }, { status: "statusCode" in error && Number(error.statusCode) === 403 ? 403 : 503 });

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch {
    return NextResponse.json({ error: "Gambar belum berhasil diunggah. Silakan coba lagi." }, { status: 500 });
  }
}
