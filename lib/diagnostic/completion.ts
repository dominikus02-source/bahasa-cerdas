/**
 * STEP 4E.2 — status sesi diagnostik (READ-ONLY).
 * Dipakai preview home/adaptive untuk menentukan state kartu:
 *   - diagnosticCompleted → "Profil Belajarmu Sudah Siap"
 *   - belum pernah diagnostik + tanpa bukti → "Kenali Kemampuanmu"
 * Tanpa tulis DB, tanpa migrasi — query idempoten yang aman dipanggil
 * berulang (cache per request di dalam satu sesi).
 */
import { db } from "@/lib/db";
import { DIAGNOSTIC_REASON_CODE } from "./config";

/**
 * Apakah user pernah MENYELESAIKAN sesi diagnostik (status COMPLETED)?
 * Read-only; gagal query → false (kartu jatuh ke state tanpa klaim).
 */
export async function hasCompletedDiagnostic(userId: string): Promise<boolean> {
  try {
    const session = await db.adaptivePracticeSession.findFirst({
      where: { userId, reasonCode: DIAGNOSTIC_REASON_CODE, status: "COMPLETED" },
      select: { id: true },
    });
    return Boolean(session);
  } catch {
    return false;
  }
}
