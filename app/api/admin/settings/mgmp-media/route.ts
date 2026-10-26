import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getMgmpMedia, setMgmpMedia, extractYouTubeId, type MgmpMedia } from "@/lib/site-settings";
import { withAdmin } from "@/lib/admin/guard";

function isAdmin(user: any) {
  return !!user && (user.isFounder || user.role === "ADMIN");
}

async function adminGET() {
  try {
    const user = await getUser();
    if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const media = await getMgmpMedia();
    return NextResponse.json({ media });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function adminPUT(req: NextRequest) {
  try {
    const user = await getUser();
    if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();

    if (body.type === "none") {
      await setMgmpMedia({ type: "none" });
      return NextResponse.json({ media: { type: "none" } satisfies MgmpMedia });
    }

    if (body.type === "video") {
      const videoId = extractYouTubeId(body.input || "");
      if (!videoId) return NextResponse.json({ error: "Link atau ID video YouTube tidak valid" }, { status: 400 });
      const media: MgmpMedia = { type: "video", videoId };
      await setMgmpMedia(media);
      return NextResponse.json({ media });
    }

    if (body.type === "photo") {
      const photos = Array.isArray(body.photos) ? body.photos.filter((p: any) => p?.url && p?.key) : [];
      if (photos.length === 0) return NextResponse.json({ error: "Minimal 1 foto" }, { status: 400 });
      const media: MgmpMedia = { type: "photo", photos };
      await setMgmpMedia(media);
      return NextResponse.json({ media });
    }

    return NextResponse.json({ error: "Tipe tidak dikenali" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export const GET = withAdmin(adminGET, { route: "/api/admin/settings/mgmp-media", method: "GET" });
export const PUT = withAdmin(adminPUT, { route: "/api/admin/settings/mgmp-media", method: "PUT" });
