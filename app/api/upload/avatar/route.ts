import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/supabase/server";
import { validateUpload, IMAGE_MIMES } from "@/lib/upload-validation";

export const runtime = "nodejs";

/**
 * Authenticated avatar upload. Identity is verified from the user's session;
 * the service key is used only server-side to avoid storage INSERT RLS failures.
 * Every object is namespaced under the verified user's immutable application ID.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const formData = await req.formData();
    const value = formData.get("file");
    if (!(value instanceof File)) {
      return NextResponse.json({ error: "Pilih foto terlebih dahulu." }, { status: 400 });
    }
    if (value.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran foto maksimal 5 MB." }, { status: 413 });
    }

    const validation = await validateUpload(value, IMAGE_MIMES);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error("AVATAR_UPLOAD_CONFIG_MISSING", { urlConfigured: !!url, serviceKeyConfigured: !!serviceKey });
      return NextResponse.json({ error: "Penyimpanan foto belum dikonfigurasi. Hubungi pengelola." }, { status: 503 });
    }

    const admin = createSupabaseClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const fileName = `profiles/${user.id}/avatar-${Date.now()}-${crypto.randomUUID()}.${validation.ext}`;
    const { error } = await admin.storage.from("avatars").upload(fileName, value, {
      cacheControl: "3600",
      contentType: value.type,
      upsert: false,
    });

    if (error) {
      console.error("AVATAR_STORAGE_UPLOAD_FAILED", { userId: user.id, status: error.statusCode, message: error.message });
      return NextResponse.json({ error: "Foto gagal disimpan. Silakan coba lagi." }, { status: 502 });
    }

    const { data } = admin.storage.from("avatars").getPublicUrl(fileName);
    return NextResponse.json({ url: data.publicUrl }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("AVATAR_UPLOAD_UNEXPECTED_ERROR", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Terjadi kendala saat mengunggah foto. Silakan coba lagi." }, { status: 500 });
  }
}
