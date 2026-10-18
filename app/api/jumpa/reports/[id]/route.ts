/**
 * PATCH /api/jumpa/reports/[id] — tandai laporan { status: REVIEWED|DISMISSED|OPEN }.
 * Hanya admin/founder, atau guru pemilik ruang / wali kelas ruang itu.
 */
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { reviewReport } from "@/lib/jumpa/room-actions";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ status: z.enum(["REVIEWED", "DISMISSED", "OPEN"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");
  const limited = await rateLimitRoute(request, { identifier: "jumpa-report-review", maxRequests: 30, windowSeconds: 60, subject: user.id });
  if (limited) return limited;
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !id || id.length > 64) return jumpaError(400, "BAD_REQUEST", "Status tidak valid.");
  try {
    const r = await reviewReport(user, id, parsed.data.status);
    if (!r.ok) return jumpaError(r.status, r.code, r.message);
    return jumpaJson({ ok: true });
  } catch (error) {
    console.error("JUMPA_REPORT_REVIEW_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "Gagal menyimpan. Coba lagi.");
  }
}
