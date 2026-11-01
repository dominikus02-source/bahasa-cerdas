import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/supabase/server";
import { configureBucket } from "@/lib/upload";
import { getStorageAdminConfig } from "@/lib/supabase/storage-config";
import { withAdmin } from "@/lib/admin/guard";

async function adminPOST() {
  try {
    await requireFounder();
    const storage = getStorageAdminConfig();

    if (!storage) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 500 });
    }

    await configureBucket(storage.url, storage.serviceKey, "documents", 50 * 1024 * 1024);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Configure storage error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = withAdmin(adminPOST, { route: "/api/admin/configure-storage", method: "POST" });
