import { NextRequest, NextResponse } from "next/server";
import { createStorageAdminClient } from "@/lib/supabase/storage-server";
import { getUser } from "@/lib/supabase/server";
import { AUDIO_MIMES, validateUpload } from "@/lib/upload-validation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan login" }, { status: 401 });

    const formData = await req.formData();
    const value = formData.get("file");
    if (!(value instanceof File)) {
      return NextResponse.json({ error: "File rekaman tidak ditemukan" }, { status: 400 });
    }

    const validation = await validateUpload(value, AUDIO_MIMES);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const storage = createStorageAdminClient();
    const bucket = "audio";
    const { data: buckets, error: listError } = await storage.storage.listBuckets();
    if (listError) {
      console.error("AUDIO_STORAGE_BUCKET_LOOKUP_FAILED", { message: listError.message });
      return NextResponse.json({ error: "Penyimpanan rekaman belum dapat diperiksa." }, { status: 502 });
    }

    const bucketInfo = buckets?.find((item) => item.name === bucket);
    if (!bucketInfo) {
      const { error } = await storage.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: 25 * 1024 * 1024,
        allowedMimeTypes: AUDIO_MIMES,
      });
      if (error) {
        console.error("AUDIO_STORAGE_BUCKET_CREATE_FAILED", { message: error.message });
        return NextResponse.json({ error: "Penyimpanan rekaman gagal disiapkan." }, { status: 502 });
      }
    }

    const fileName = `rekaman/${user.id}/${Date.now()}-${crypto.randomUUID()}.${validation.ext}`;
    const { error: uploadError } = await storage.storage.from(bucket).upload(fileName, value, {
      cacheControl: "3600",
      upsert: false,
      contentType: value.type,
    });

    if (uploadError) {
      console.error("AUDIO_STORAGE_UPLOAD_FAILED", { userId: user.id, message: uploadError.message });
      return NextResponse.json({ error: "Rekaman gagal disimpan." }, { status: 502 });
    }

    if (bucketInfo?.public) {
      const { data } = storage.storage.from(bucket).getPublicUrl(fileName);
      return NextResponse.json({ url: data.publicUrl, key: fileName });
    }

    const { data: signed, error: signError } = await storage.storage
      .from(bucket)
      .createSignedUrl(fileName, 24 * 60 * 60);
    if (signError || !signed?.signedUrl) {
      console.error("AUDIO_STORAGE_SIGN_FAILED", { userId: user.id, message: signError?.message });
      return NextResponse.json({ error: "Rekaman tersimpan, tetapi tautan akses gagal dibuat." }, { status: 502 });
    }

    return NextResponse.json({ url: signed.signedUrl, key: fileName, expiresIn: 86400 });
  } catch (error) {
    console.error("AUDIO_UPLOAD_UNEXPECTED_ERROR", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Terjadi kendala saat mengunggah rekaman." }, { status: 500 });
  }
}
