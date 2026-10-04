import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getIdentityUser } from "@/lib/supabase/server";
import { jsonBody, sameOrigin, privacyFailure } from "@/lib/compliance/http";
import { rateLimitRoute } from "@/lib/rate-limit";

const schema = z.object({
  type: z.enum(["ACCESS","COPY","CORRECTION","RESTRICT","DELETE_ACCOUNT","OTHER"]),
  detail: z.string().trim().min(3).max(2000).optional(),
  subjectId: z.string().max(100).optional(),
}).strict();

async function subjectFor(actorId: string, requested?: string) {
  if (!requested || requested === actorId) return actorId;
  const guardian = await db.guardianRequest.findFirst({
    where: { childId: requested, guardianId: actorId, status: "VERIFIED" },
    select: { id: true },
  });
  if (!guardian) throw new Error("ORIGIN");
  return requested;
}

export async function GET() {
  try {
    const u = await getIdentityUser();
    if (!u) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
    const ownChildren = await db.guardianRequest.findMany({
      where: { guardianId: u.id, status: "VERIFIED" },
      select: { childId: true },
    });
    const subjectIds = [u.id, ...ownChildren.map(x => x.childId)];
    const requests = await db.privacyRequest.findMany({
      where: { userId: { in: subjectIds } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, userId: true, type: true, status: true, deadlineAt: true, createdAt: true, completedAt: true },
    });
    return NextResponse.json({ requests }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return privacyFailure(e);
  }
}

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const rl = await rateLimitRoute(req, { maxRequests: 12, windowSeconds: 3600, identifier: "privacy-rights" });
    if (rl) return rl;
    const u = await getIdentityUser();
    if (!u) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
    const input = schema.parse(await jsonBody(req));
    const subjectId = await subjectFor(u.id, input.subjectId);
    const now = new Date();
    const deadlineAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    const created = await db.$transaction(async tx => {
      if (input.type === "RESTRICT") {
        await tx.privacyAccount.updateMany({ where: { userId: subjectId }, data: { publicProfile: false, publicWorks: false, analytics: false, aiAssistance: false } });
        await tx.complianceAudit.create({ data: { subjectId, actorId: u.id, action: "OPTIONAL_PROCESSING_RESTRICTED_PENDING_REVIEW" } });
      }
      const request = await tx.privacyRequest.create({
        data: {
          userId: subjectId,
          guardianId: subjectId === u.id ? null : u.id,
          type: input.type,
          detail: input.detail || null,
          deadlineAt,
        },
      });
      await tx.complianceAudit.create({
        data: { subjectId, actorId: u.id, action: `PRIVACY_REQUEST_${input.type}`, reference: request.id },
      });
      return request;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({
      ok: true,
      requestId: created.id,
      deadlineAt: created.deadlineAt,
      message: "Permintaan diterima dan masuk antrean privasi.",
    }, { status: 201 });
  } catch (e) {
    return privacyFailure(e);
  }
}
