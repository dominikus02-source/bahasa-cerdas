/**
 * DELETE /api/jumpa/chat/[id] — soft-delete pesan (pola OBROLAN):
 * pemilik pesan, atau guru host/cohost ruang. Konten tetap ada di DB
 * untuk audit/laporan; peserta melihat "Pesan telah dihapus".
 */
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { deleteChat } from "@/lib/jumpa/room-actions";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");
  const limited = await rateLimitRoute(request, { identifier: "jumpa-chat-delete", maxRequests: 30, windowSeconds: 60, subject: user.id });
  if (limited) return limited;
  const { id } = await params;
  if (!id || id.length > 64) return jumpaError(404, "NOT_FOUND", "Pesan tidak ditemukan.");
  try {
    const result = await deleteChat(user, id);
    if (!result.ok) return jumpaError(result.status, result.code, result.message);
    return jumpaJson({ ok: true });
  } catch (error) {
    console.error("JUMPA_CHAT_DELETE_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "Pesan gagal dihapus. Coba lagi.");
  }
}
