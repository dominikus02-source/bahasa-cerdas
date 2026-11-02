import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { bacaSinopsis, petaSebagaiTeks } from "@/lib/aku-sastrawan/peta-cerita";

export const runtime = "nodejs";

type Context = { params: Promise<{ projectId: string }> };

function safeFileName(title: string) {
  const base = title.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
  return (base || "naskah") + ".txt";
}

/**
 * Export the owner's manuscript as plain text. READ action: allowed for the
 * owner even after premium ends (founder decision: drafts are never locked).
 */
export async function GET(_request: NextRequest, context: Context) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  const { projectId } = await context.params;
  const project = await db.writingProject.findFirst({
    where: { id: projectId, userId: user.id },
    include: { chapters: { orderBy: { orderIndex: "asc" } } },
  });
  if (!project) return NextResponse.json({ error: "Karya tidak ditemukan." }, { status: 404 });

  const parts = [project.title, ""];
  // Sinopsis + Peta Cerita (tersimpan berversi di kolom synopsis) → teks rapi, bukan JSON mentah.
  const { sinopsis, peta } = bacaSinopsis(project.synopsis);
  const rancangan = petaSebagaiTeks(sinopsis, peta);
  if (rancangan) parts.push(rancangan, "", "———", "");
  if (project.content.trim()) parts.push(project.content.trim(), "");
  for (const chapter of project.chapters) {
    parts.push(`Bab ${chapter.orderIndex}: ${chapter.title}`, "", chapter.content.trim(), "");
  }
  return new NextResponse(parts.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFileName(project.title)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
