import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

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
  if (project.synopsis?.trim()) parts.push("Sinopsis:", project.synopsis.trim(), "");
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
