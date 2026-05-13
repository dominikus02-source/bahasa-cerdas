import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });

    const { uploadFile } = await import("@/lib/upload");
    const result = await uploadFile(file, "karya", user.supabaseId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
