import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/supabase/server";
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

    const fileName = `toko/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${check.ext}`;

    // Try service_role key first, fallback to anon key
    let supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let { error } = await supabase.storage.from("images").upload(fileName, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: true,
    });

    if (error?.message?.includes("row-level security")) {
      // Fallback: use anon key
      const { createClient: createBrowser } = await import("@/lib/supabase/client");
      supabase = createBrowser();
      error = (await supabase.storage.from("images").upload(fileName, file, {
        cacheControl: "31536000", upsert: true,
      })).error;
    }

    if (error) return NextResponse.json({ error: `Upload gagal: ${error.message}` }, { status: 500 });

    const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal mengupload gambar" }, { status: 500 });
  }
}
