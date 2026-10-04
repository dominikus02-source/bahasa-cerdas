import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getIdentityUser } from "@/lib/supabase/server";
import { jsonBody, sameOrigin, privacyFailure } from "@/lib/compliance/http";

const createSchema = z.object({
  action: z.literal("create"),
  title: z.string().trim().min(5).max(200),
  severity: z.enum(["ASSESS","LOW","MEDIUM","HIGH","CRITICAL"]).default("ASSESS"),
  description: z.string().trim().max(4000).optional(),
  dataCategories: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  affectedChildren: z.boolean().default(false),
  detectedAt: z.string().datetime().optional(),
}).strict();

const updateSchema = z.discriminatedUnion("action", [
  createSchema,
  z.object({ action: z.literal("confirm"), id: z.string(), notificationRequired: z.boolean(), evidenceRef: z.string().trim().min(6).max(300) }).strict(),
  z.object({ action: z.literal("contain"), id: z.string(), containment: z.string().trim().min(10).max(4000), evidenceRef: z.string().trim().min(6).max(300).optional() }).strict(),
  z.object({ action: z.literal("notify"), id: z.string(), evidenceRef: z.string().trim().min(6).max(300) }).strict(),
  z.object({ action: z.literal("close"), id: z.string(), evidenceRef: z.string().trim().min(6).max(300) }).strict(),
]);

async function admin() {
  const u = await getIdentityUser();
  if (!u || (u.role !== "ADMIN" && !u.isFounder)) return null;
  return u;
}

export async function GET() {
  try {
    const u = await admin();
    if (!u) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    const incidents = await db.privacyIncident.findMany({
      orderBy: [{ status: "asc" }, { detectedAt: "desc" }],
      take: 100,
    });
    return NextResponse.json({ incidents }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return privacyFailure(e); }
}

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await admin();
    if (!u) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    const input = updateSchema.parse(await jsonBody(req));

    if (input.action === "create") {
      const detectedAt = input.detectedAt ? new Date(input.detectedAt) : new Date();
      if (!Number.isFinite(detectedAt.getTime()) || detectedAt > new Date()) throw new Error("ORIGIN");
      const incident = await db.$transaction(async tx => {
        const created = await tx.privacyIncident.create({ data: {
          title: input.title,
          severity: input.severity,
          description: input.description || null,
          dataCategories: input.dataCategories,
          affectedChildren: input.affectedChildren,
          detectedAt,
          ownerId: u.id,
        }});
        await tx.complianceAudit.create({ data: { actorId: u.id, action: "PRIVACY_INCIDENT_CREATED", reference: created.id } });
        return created;
      });
      return NextResponse.json({ incident }, { status: 201 });
    }

    const current = await db.privacyIncident.findUniqueOrThrow({ where: { id: input.id } });
    if (current.status === "CLOSED") return NextResponse.json({ error: "Insiden sudah ditutup." }, { status: 409 });

    if (input.action === "confirm") {
      const deadline = input.notificationRequired
        ? new Date(current.detectedAt.getTime() + 72 * 60 * 60 * 1000)
        : null;
      await db.$transaction(async tx => {
        await tx.privacyIncident.update({ where: { id: input.id }, data: {
          confirmedAt: current.confirmedAt || new Date(),
          notificationRequired: input.notificationRequired,
          notificationDeadlineAt: deadline,
          status: input.notificationRequired ? "CONFIRMED_REPORTABLE" : "CONFIRMED_NON_REPORTABLE",
          evidenceRef: input.evidenceRef,
          ownerId: u.id,
        }});
        await tx.complianceAudit.create({ data: { actorId: u.id, action: input.notificationRequired ? "PRIVACY_INCIDENT_REPORTABLE" : "PRIVACY_INCIDENT_NON_REPORTABLE", reference: input.id } });
      });
    } else if (input.action === "contain") {
      await db.$transaction(async tx => {
        await tx.privacyIncident.update({ where: { id: input.id }, data: { containment: input.containment, status: "CONTAINED", evidenceRef: input.evidenceRef || current.evidenceRef, ownerId: u.id } });
        await tx.complianceAudit.create({ data: { actorId: u.id, action: "PRIVACY_INCIDENT_CONTAINED", reference: input.id } });
      });
    } else if (input.action === "notify") {
      if (current.notificationRequired !== true) return NextResponse.json({ error: "Insiden belum ditetapkan wajib notifikasi." }, { status: 409 });
      await db.$transaction(async tx => {
        await tx.privacyIncident.update({ where: { id: input.id }, data: { notifiedAt: new Date(), status: "NOTIFIED", evidenceRef: input.evidenceRef, ownerId: u.id } });
        await tx.complianceAudit.create({ data: { actorId: u.id, action: "PRIVACY_INCIDENT_NOTIFICATION_RECORDED", reference: input.id } });
      });
    } else {
      if (current.notificationRequired === true && !current.notifiedAt) return NextResponse.json({ error: "Catat bukti notifikasi sebelum menutup insiden yang wajib diberitahukan." }, { status: 409 });
      await db.$transaction(async tx => {
        await tx.privacyIncident.update({ where: { id: input.id }, data: { status: "CLOSED", closedAt: new Date(), evidenceRef: input.evidenceRef, ownerId: u.id } });
        await tx.complianceAudit.create({ data: { actorId: u.id, action: "PRIVACY_INCIDENT_CLOSED", reference: input.id } });
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return privacyFailure(e); }
}
