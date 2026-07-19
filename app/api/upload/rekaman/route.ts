import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan login" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const bucket = "audio";

    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === bucket);
    if (!bucketExists) {
      const { error: createErr } = await supabase.storage.createBucket(bucket, { public: true });
      if (createErr) return NextResponse.json({ error: `Gagal buat bucket: ${createErr.message}` }, { status: 500 });
    } else {
      await supabase.storage.updateBucket(bucket, { public: true });
    }

    const fileName = `rekaman/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.webm`;

    const { error: upErr } = await supabase.storage.from(bucket).upload(fileName, file, {
      cacheControl: "31536000",
      upsert: true,
      contentType: file.type,
    });

    if (upErr) return NextResponse.json({ error: `Upload gagal: ${upErr.message}` }, { status: 500 });

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload gagal" }, { status: 500 });
  }
}
