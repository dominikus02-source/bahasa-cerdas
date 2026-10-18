/**
 * GET  /api/jumpa/rooms/[code]/chat — riwayat obrolan (100 terakhir).
 * POST /api/jumpa/rooms/[code]/chat — kirim pesan { content }.
 * Pesan DISIMPAN dulu lalu disiarkan server lewat data channel; klien
 * hanya menampilkan pesan yang datang dari server (lib/jumpa/signals.ts).
 */
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { listChat, sendChat } from "@/lib/jumpa/room-actions";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

async function guard(request: Request, params: Promise<{ code: string }>, write: boolean) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return { res: disabled } as const;
  const user = await getUser();
  if (!user) return { res: jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.") } as const;
  const limited = await rateLimitRoute(request, {
    identifier: write ? "jumpa-chat-send" : "jumpa-chat-list",
    maxRequests: write ? 20 : 30,
    windowSeconds: write ? 30 : 60,
    subject: user.id,
  });
  if (limited) return { res: limited } as const;
  const { code } = await params;
  if (!isValidRoomCode(code)) return { res: jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.") } as const;
  return { user, code } as const;
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await guard(request, params, false);
  if ("res" in g) return g.res;
  try {
    const result = await listChat(g.user, g.code);
    if (!result.ok) return jumpaError(result.status, result.code, result.message);
    return jumpaJson({ messages: result.messages, chatEnabled: result.chatEnabled });
  } catch (error) {
    console.error("JUMPA_CHAT_LIST_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "Obrolan belum bisa dimuat.");
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await guard(request, params, true);
  if ("res" in g) return g.res;
  const body = (await request.json().catch(() => null)) as { content?: unknown } | null;
  try {
    const result = await sendChat(g.user, g.code, body?.content);
    if (!result.ok) return jumpaError(result.status, result.code, result.message);
    return jumpaJson({ message: result.message }, 201);
  } catch (error) {
    console.error("JUMPA_CHAT_SEND_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "Pesan gagal dikirim. Coba lagi.");
  }
}
