import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { getUser } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `artikel/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Upload via browser-style client (works with anon key for public buckets)
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { error } = await supabase.storage.from("images").upload(fileName, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });

    if (error) return NextResponse.json({ error: `Upload gagal: ${error.message}` }, { status: 500 });

    const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal mengupload gambar" }, { status: 500 });
  }
}
