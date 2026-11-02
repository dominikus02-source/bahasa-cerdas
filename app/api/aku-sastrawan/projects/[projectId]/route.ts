import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { akuSastrawanPremiumRequired, canWriteAkuSastrawan } from "@/lib/aku-sastrawan/access";

export const runtime = "nodejs";

// NOTE: the dynamic segment MUST be named [projectId] — the same name as the
// sibling `projects/[projectId]/chapters` routes. Two different slug names at
// the same level ([id] vs [projectId]) make the Next.js runtime throw on EVERY
// request (production outage 30 Oct 2026). Guarded by scripts/test-route-slugs.ts.
type Context = { params: Promise<{ projectId: string }> };

async function ownedProject(projectId: string, mode: "read" | "write") {
  const user = await getUser();
  if (!user) return { error: NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }) };
  if (mode === "write" && !(await canWriteAkuSastrawan(user))) return { error: akuSastrawanPremiumRequired(user.role) };
  const project = await db.writingProject.findFirst({ where: { id: projectId, userId: user.id } });
  if (!project) return { error: NextResponse.json({ error: "Karya tidak ditemukan." }, { status: 404 }) };
  return { user, project };
}

// READ: owner only, allowed after premium ends.
export async function GET(_request: NextRequest, context: Context) {
  const { projectId } = await context.params;
  const result = await ownedProject(projectId, "read");
  if (result.error) return result.error;
  return NextResponse.json({ project: result.project });
}

export async function PATCH(request: NextRequest, context: Context) {
  const { projectId } = await context.params;
  const result = await ownedProject(projectId, "write");
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

// Deleting your own draft is a write action (premium), consistent with the
// "read + export stay free" policy. Founder may decide to allow it for owners.
export async function DELETE(_request: NextRequest, context: Context) {
  const { projectId } = await context.params;
  const result = await ownedProject(projectId, "write");
  if (result.error) return result.error;
  await db.writingProject.delete({ where: { id: result.project!.id } });
  return NextResponse.json({ ok: true });
}
