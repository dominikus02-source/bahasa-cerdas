import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { hasAkuSastrawanAccess } from "@/lib/aku-sastrawan/access";

type Context = { params: Promise<{ id: string }> };
async function authorizedProject(id: string) {
  const user = await getUser();
  if (!user) return { error: NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }) };
  const hasPremium = await hasAkuSastrawanAccess(user.id);
  if (!hasPremium) {
    return { error: NextResponse.json({ error: "AKU SASTRAWAN memerlukan akses Premium." }, { status: 403 }) };
  }
  const project = await db.writingProject.findFirst({ where: { id, userId: user.id } });
  if (!project) return { error: NextResponse.json({ error: "Karya tidak ditemukan." }, { status: 404 }) };
  return { user, project };
}

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  const result = await authorizedProject(id);
  if (result.error) return result.error;
  return NextResponse.json({ project: result.project });
}

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const result = await authorizedProject(id);
  if (result.error) return result.error;
  const body = await request.json().catch(() => null);
  const data: { title?: string; synopsis?: string | null; content?: string; status?: string; wordCount?: number } = {};
  if (typeof body?.title === "string") data.title = body.title.trim().slice(0, 120) || "Tanpa judul";
  if (typeof body?.synopsis === "string" || body?.synopsis === null) data.synopsis = typeof body.synopsis === "string" ? body.synopsis.slice(0, 10000) : null;
  if (typeof body?.content === "string") {
    const content = body.content.slice(0, 1000000);
    data.content = content;
    data.wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  }
  if (body?.status === "DRAFT" || body?.status === "REVISION" || body?.status === "COMPLETED") data.status = body.status;
  const project = await db.writingProject.update({ where: { id: result.project!.id }, data });
  return NextResponse.json({ project });
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  const result = await authorizedProject(id);
  if (result.error) return result.error;
  await db.writingProject.delete({ where: { id: result.project!.id } });
  return NextResponse.json({ ok: true });
}
