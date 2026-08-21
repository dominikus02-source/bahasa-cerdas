import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { db } from "@/lib/db";

/**
 * Pemakaian item habis-pakai (consumable) dari Toko Koin.
 *
 * Hanya tipe di daftar ini yang boleh dipakai lewat endpoint ini. Item kosmetik
 * (bingkai, warna nama, efek jawaban) TIDAK boleh masuk sini — kalau tidak,
 * murid bisa "menghabiskan" barang yang seharusnya permanen.
 */
const CONSUMABLE_TYPES = ["HINT_TOKEN", "TIME_EXTENSION"] as const;
type ConsumableType = (typeof CONSUMABLE_TYPES)[number];

// Coin Shop 2.4 — HINT_TOKEN_PACK memberikan 5 Hint Token.
// Saat mengonsumsi HINT_TOKEN, pack juga dicek sebagai sumber.
const HINT_SOURCE_TYPES = ["HINT_TOKEN", "HINT_TOKEN_PACK"] as const;

const LABEL: Record<ConsumableType, string> = {
  HINT_TOKEN: "Hint Token",
  TIME_EXTENSION: "Time Extension",
};

function isConsumable(value: unknown): value is ConsumableType {
  return typeof value === "string" && (CONSUMABLE_TYPES as readonly string[]).includes(value);
}

/** Apakah tipe ini bisa dijadikan sumber HINT_TOKEN? */
function isHintSource(type: string): boolean {
  return (HINT_SOURCE_TYPES as readonly string[]).includes(type);
}

/** Baris inventaris yang sudah lewat masa berlaku dianggap tidak dimiliki. */
function notExpired(now: Date) {
  return { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

/**
 * GET — jumlah item habis-pakai yang dimiliki murid + efek jawaban yang dipasang.
 * Dipakai UI untuk menampilkan/menyembunyikan tombol bantuan sebelum dipakai.
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db.userItem.findMany({
      where: {
        userId: user.id,
        quantity: { gt: 0 },
        item: { type: { in: [...CONSUMABLE_TYPES, ...HINT_SOURCE_TYPES] } },
        ...notExpired(new Date()),
      },
      select: { quantity: true, item: { select: { type: true } } },
    });

    const items: Record<string, number> = { HINT_TOKEN: 0, TIME_EXTENSION: 0, HINT_TOKEN_PACK: 0 };
    for (const row of rows) {
      items[row.item.type] = (items[row.item.type] || 0) + row.quantity;
    }

    return NextResponse.json({ items, equippedEffect: user.equippedEffect ?? null });
  } catch {
    return NextResponse.json({ error: "Gagal memuat inventaris" }, { status: 500 });
  }
}

/**
 * POST — pakai satu item. Body: { type: "HINT_TOKEN" } atau { itemId: "..." }.
 *
 * Pengurangan stok dilakukan di dalam transaksi dengan `updateMany` bersyarat
 * `quantity > 0`, sehingga dua permintaan yang datang bersamaan (murid menekan
 * tombol dua kali, atau dua tab) tidak bisa memakai satu item yang sama.
 * Kalau stok habis, permintaan ditolak — UI tidak boleh memberi efek apa pun
 * sebelum respons ini sukses.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimitRoute(req, {
      maxRequests: 30,
      windowSeconds: 60,
      identifier: "store-consume",
    });
    if (limited) return limited;

    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { type, itemId } = body as { type?: unknown; itemId?: unknown };

    if (!type && !itemId) {
      return NextResponse.json({ error: "Jenis item tidak dikirim" }, { status: 400 });
    }
    // Coin Shop 2.4 — HINT_TOKEN bisa diambil dari HINT_TOKEN atau HINT_TOKEN_PACK.
    const isHintRequest = type === "HINT_TOKEN";
    if (type !== undefined && !isConsumable(type) && !isHintRequest) {
      return NextResponse.json({ error: "Item ini tidak bisa dipakai" }, { status: 400 });
    }

    const now = new Date();

    const result = await db.$transaction(async (tx) => {
      // Untuk HINT_TOKEN, cari dari HINT_TOKEN dulu, lalu HINT_TOKEN_PACK.
      const row = await tx.userItem.findFirst({
        where: {
          userId: user.id,
          quantity: { gt: 0 },
          ...(typeof itemId === "string" && itemId
            ? { itemId }
            : isHintRequest
              ? { item: { type: { in: [...HINT_SOURCE_TYPES] } } }
              : { item: { type: type as ConsumableType } }),
          ...notExpired(now),
        },
        select: { id: true, quantity: true, item: { select: { type: true, name: true } } },
        orderBy: { createdAt: "asc" },
      });

      if (!row) return { ok: false as const, reason: "kosong" as const };

      // Kalau dicari lewat itemId, tipenya tetap harus habis-pakai atau hint source.
      if (!isConsumable(row.item.type) && !isHintSource(row.item.type)) {
        return { ok: false as const, reason: "bukan-consumable" as const };
      }

      // Kunci baris + kurangi hanya kalau stoknya memang masih ada. `count === 0`
      // berarti ada permintaan lain yang lebih dulu menghabiskannya.
      const updated = await tx.userItem.updateMany({
        where: { id: row.id, quantity: { gt: 0 } },
        data: { quantity: { decrement: 1 } },
      });
      if (updated.count === 0) return { ok: false as const, reason: "kosong" as const };

      const remaining = row.quantity - 1;

      // Baris bersisa 0 dihapus, mengikuti pola Streak Freeze di lib/coins.ts:
      // "punya 0" dan "tidak punya" harus terlihat sama di seluruh aplikasi.
      // Route pembelian membuat ulang barisnya saat murid membeli lagi.
      if (remaining <= 0) {
        await tx.userItem.delete({ where: { id: row.id } });
      }

      return { ok: true as const, type: row.item.type, remaining };
    });

    if (!result.ok) {
      const label = isConsumable(type) ? LABEL[type as ConsumableType] : "Item";
      const message =
        result.reason === "bukan-consumable"
          ? "Item ini tidak bisa dipakai"
          : `${label} kamu sudah habis. Beli lagi di Toko Koin ya!`;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true, type: result.type, remaining: result.remaining });
  } catch {
    return NextResponse.json({ error: "Gagal memakai item. Coba lagi." }, { status: 500 });
  }
}
