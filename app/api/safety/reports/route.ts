import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getIdentityUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { sameOrigin, jsonBody, privacyFailure } from "@/lib/compliance/http";
const reportSchema = z.object({ targetType: z.enum(["KARYA", "COMMENT", "COMMUNITY_POST", "CHAT", "PROFILE", "OTHER"]), targetId: z.string().trim().min(1).max(500), category: z.enum(["CHILD_SAFETY", "PRIVACY", "BULLYING", "ILLEGAL", "COPYRIGHT", "OTHER"]), detail: z.string().trim().min(10).max(3000), contact: z.string().email().max(254).optional() }).strict();
export async function POST(req: Request) {
 try {
  sameOrigin(req);
  const rl = await rateLimitRoute(req, { maxRequests: 5, windowSeconds: 600, identifier: "public-safety-report" }); if (rl) return rl;
  const b = reportSchema.parse(await jsonBody(req));
  const u = await getIdentityUser();
  const report = await db.$transaction(async tx => {
   const r = await tx.safetyReport.create({ data: { ...b, reporterId: u?.id } });
   await tx.complianceAudit.create({ data: { actorId: u?.id, action: "REPORT_RECEIVED", reference: r.id } });
   return r;
  });
  return NextResponse.json({ reference: report.id, message: "Laporan diterima. Simpan nomor laporan untuk tindak lanjut melalui halo@bahasacerdas.com." }, { status: 201 });
 } catch(e) { return privacyFailure(e); }
}
