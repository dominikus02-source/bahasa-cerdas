import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { removeRevokedStudentFromJumpa } from "@/lib/jumpa/student-consent";

const NOTICE_VERSION = "2026-11-17-v1";
const NOTICE = "Persetujuan ini mengizinkan BahasaCerdas membuat akun murid yang terhubung dengan Anda untuk kegiatan belajar. Anda dapat menolak atau mencabut persetujuan melalui layanan ini. Baca Pemberitahuan Privasi untuk mengetahui cara data digunakan dan cara mengajukan permintaan terkait data pribadi.";
const selection = z.object({
  studentAuthId: z.string().uuid(),
  decision: z.enum(["grant", "decline", "revoke"]),
  noticeVersion: z.literal(NOTICE_VERSION),
});

const transitions = {
  grant: { from: "PENDING", to: "GRANTED" },
  decline: { from: "PENDING", to: "DECLINED" },
  revoke: { from: "GRANTED", to: "REVOKED" },
} as const;

export async function GET(req: Request) {
  const limited = await rateLimitRoute(req, { maxRequests: 30, windowSeconds: 60, identifier: "guardian-consent-read" });
  if (limited) return limited;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk sebagai wali." }, { status: 401 });

  const students = await db.studentGuardianConsent.findMany({
    where: { guardianAuthId: user.id },
    select: { studentAuthId: true, studentLabel: true, verifiedUntil: true, status: true, decidedAt: true },
    orderBy: { studentAuthId: "asc" },
  });
  return NextResponse.json({ noticeVersion: NOTICE_VERSION, notice: NOTICE, privacyUrl: "/kebijakan-privasi", students }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(req: Request) {
  const limited = await rateLimitRoute(req, { maxRequests: 10, windowSeconds: 60, identifier: "guardian-consent-write" });
  if (limited) return limited;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk sebagai wali." }, { status: 401 });
  if (!req.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Gunakan data JSON." }, { status: 415 });
  }
  const parsed = selection.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Keputusan atau versi pemberitahuan tidak valid." }, { status: 400 });

  const { studentAuthId, decision } = parsed.data;
  const now = new Date();
  const { from, to } = transitions[decision];
  const changed = await db.studentGuardianConsent.updateMany({
    where: {
      studentAuthId,
      guardianAuthId: user.id,
      status: from,
      ...(decision === "grant" ? { verifiedUntil: { gt: now } } : {}),
    },
    data: { status: to, decidedAt: now, noticeVersion: NOTICE_VERSION },
  });
  if (!changed.count) {
    const current = await db.studentGuardianConsent.findFirst({
      where: { studentAuthId, guardianAuthId: user.id },
      select: { status: true },
    });
    if (!current) return NextResponse.json({ error: "Hubungan wali belum diverifikasi." }, { status: 404 });
    if (current.status !== to) {
      return NextResponse.json({ error: "Keputusan tidak dapat diterapkan pada status saat ini." }, { status: 409 });
    }
  }
  if (decision === "revoke") {
    try {
      await removeRevokedStudentFromJumpa(studentAuthId);
    } catch (error) {
      console.error("JUMPA_CONSENT_DISCONNECT_FAILED", error);
      // The database decision remains revoked and still blocks new tokens.
      return NextResponse.json({
        status: to,
        error: "Persetujuan sudah dicabut. Pemutusan ruang JUMPA belum terkonfirmasi. Coba lagi.",
      }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    }
  }
  return NextResponse.json({ status: to }, { headers: { "Cache-Control": "private, no-store" } });
}
