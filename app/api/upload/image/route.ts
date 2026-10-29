import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/supabase/server";
import { validateUpload, IMAGE_MIMES } from "@/lib/upload-validation";

export const runtime = "nodejs";

/**
 * Upload gambar (cover / ilustrasi) untuk editor artikel guru dan komunitas.
 *
 * RUTE INI PERNAH GAGAL SELALU. Versi lama memakai client sesi (RLS aktif)
 * dengan path "toko/<userId>/..." — RLS hanya menerima INSERT bila folder
 * pertama = auth.uid(), jadi setiap upload ditolak dan pengguna melihat
 * "Gambar belum berhasil diunggah". Kunci service-role dipakai HANYA di
 * server (pola yang sama dengan /api/upload/avatar); autentikasi tetap wajib
 * lewat getUser() dan validasi file tetap berlaku sebelum menyentuh Storage.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });

    // Images only — MIME + extension + size + magic-byte validation.
    const check = await validateUpload(file, IMAGE_MIMES);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error("IMAGE_UPLOAD_CONFIG_MISSING", { urlConfigured: !!supabaseUrl, serviceKeyConfigured: !!serviceKey });
      return NextResponse.json({ error: "Penyimpanan gambar belum dikonfigurasi. Hubungi pengelola." }, { status: 503 });
    }

    const admin = createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const fileName = `toko/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${check.ext}`;
    const { error } = await admin.storage.from("avatars").upload(fileName, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error("IMAGE_STORAGE_UPLOAD_FAILED", { userId: user.id, status: error.statusCode, message: error.message });
      return NextResponse.json(
        { error: "Gambar belum berhasil diunggah. Coba lagi atau hubungi pengelola." },
        { status: Number(error.statusCode) === 403 ? 403 : 503 }
      );
    }

    const { data } = admin.storage.from("avatars").getPublicUrl(fileName);
    return NextResponse.json({ url: data.publicUrl });
  } catch {
    return NextResponse.json({ error: "Gambar belum berhasil diunggah. Silakan coba lagi." }, { status: 500 });
  }
}
