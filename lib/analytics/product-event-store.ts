import { db } from "@/lib/db";

/**
 * Product event persistence — Operational Teacher Experiment P0 #7.
 *
 * Additive-only writer di atas tabel `ProductEvent`. DIPAKAI OLEH:
 *  1. route `app/api/analytics/product-event/route.ts` (POST allowlist) — best-effort
 *     persist setelah console-logging (tanpa mengubah perilaku logging/rate-limit).
 *  2. hook server-side (class_created / code_shared / teacher_session) — lihat
 *     `ProductEvent` sumber F4/F8.
 *
 * Idempotensi: unique `(actorId, event, entityType, entityId, logicalKey)`.
 * Pemanggil WAJIB memberikan `logicalKey` deterministik:
 *  - sekali-per-grup  : "group-<groupId>-code-shared"
 *  - sekali-per-hari  : "teacher-<userId>-<tanggalWIB>" (untuk sesi harian)
 * Retry/duplikat dengan logicalKey sama → `recorded:false` (tidak ada baris ganda).
 * Ulangan sah terukur lewat logicalKey berbeda (mis. hari berbeda).
 *
 * Keamanan: fungsi ini TIDAK menerima/menulis password/token/payment-secret/
 * payload sensitif mentah; hanya ID/kategori yang boleh masuk `props`.
 */
export interface ProductEventInput {
  actorId: string;
  event: string;
  entityType: string;
  entityId: string;
  logicalKey: string;
  props?: Record<string, string | number | boolean | null>;
}

export interface ProductEventResult {
  recorded: boolean; // true = baris baru dibuat; false = duplikat (idempoten)
  id?: string;
}

export const PRODUCT_EVENT_F4_CODE_SHARED = "class_code_shared";
export const PRODUCT_EVENT_F5_FIRST_JOIN = "class_first_join";
export const PRODUCT_EVENT_F8_TEACHER_SESSION = "teacher_session";
export const PRODUCT_EVENT_CLASS_INVITE_SHARED = "class_invite_shared";
export const PRODUCT_EVENT_CLASS_INVITE_OPENED = "class_invite_opened";

/** Hari WIB (Asia/Jakarta, UTC+7) dalam format "YYYY-MM-DD" untuk logicalKey harian. */
export function dayKeyWIB(date: Date = new Date()): string {
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

/**
 * Rekam satu product event secara idempotent. Best-effort: kegagalan parse/
 * koneksi TIDAK melempar — dipanggil fire-and-forget dari route.
 */
export async function recordProductEvent(input: ProductEventInput): Promise<ProductEventResult> {
  try {
    if (!input.actorId || !input.event || !input.entityType || !input.entityId || !input.logicalKey) {
      return { recorded: false };
    }
    const row = await db.productEvent.create({
      data: {
        actorId: input.actorId,
        event: input.event,
        entityType: input.entityType,
        entityId: input.entityId,
        logicalKey: input.logicalKey,
        props: input.props && Object.keys(input.props).length > 0 ? input.props : undefined,
      },
      select: { id: true },
    });
    return { recorded: true, id: row.id };
  } catch (err) {
    // P2002 = unique violation → duplikat idempoten, bukan error.
    if ((err as { code?: string })?.code === "P2002") {
      return { recorded: false };
    }
    // Infrastruktur analitik tidak boleh menggagalkan aksi utama (best-effort).
    return { recorded: false };
  }
}
