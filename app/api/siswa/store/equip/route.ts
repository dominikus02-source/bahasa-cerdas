import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import cache from "@/lib/redis";
import {
  COSMETIC_FIELD,
  CosmeticType,
  EquippedField,
  isCosmeticType,
  isEquippableIcon,
} from "@/lib/cosmetics";

/** Bangun objek update Prisma secara eksplisit (bukan computed key) agar tetap type-safe. */
function patchFor(field: EquippedField, value: string | null): Prisma.UserUpdateInput {
  switch (field) {
    case "equippedFrame":
      return { equippedFrame: value };
    case "equippedNameColor":
      return { equippedNameColor: value };
    case "equippedBadge":
      return { equippedBadge: value };
    case "equippedEffect":
      return { equippedEffect: value };
    case "equippedBackground":
      return { equippedBackground: value };
    case "equippedNameplate":
      return { equippedNameplate: value };
  }
}

async function invalidate(userId: string, email: string) {
  await Promise.all([
    cache.del(`user:me:${email}`),
    cache.del(`profile:public:${userId}`),
  ]);
}

/**
 * Daftar kosmetik yang dimiliki murid + apa yang sedang dipakai.
 * Dipakai halaman Toko Koin untuk menampilkan tombol "Pakai"/"Dipakai".
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const owned = await db.userItem.findMany({
      where: { userId: user.id },
      select: {
        itemId: true,
        quantity: true,
        expiresAt: true,
        item: { select: { id: true, type: true, icon: true } },
      },
    });

    return NextResponse.json({
      ownedItemIds: owned.map((o) => o.itemId),
      owned: owned.map((o) => ({
        itemId: o.itemId,
        type: o.item.type,
        icon: o.item.icon,
        quantity: o.quantity,
      })),
      equipped: {
        AVATAR_FRAME: user.equippedFrame,
        NAME_COLOR: user.equippedNameColor,
        BADGE: user.equippedBadge,
        ANSWER_EFFECT: user.equippedEffect,
        PROFILE_BACKGROUND: user.equippedBackground,
        NAMEPLATE: user.equippedNameplate,
      },
    });
  } catch (error) {
    console.error("GET /api/siswa/store/equip error:", error);
    return NextResponse.json({ error: "Gagal memuat item" }, { status: 500 });
  }
}

/**
 * Pakai / lepas kosmetik.
 *
 * Body:
 *   { itemId }                 -> pakai item (wajib dimiliki murid)
 *   { itemId, equip: false }   -> lepas kosmetik dari slot item tersebut
 *   { type, equip: false }     -> lepas kosmetik pada slot `type`
 *
 * Kepemilikan SELALU diverifikasi di server lewat tabel UserItem — body dari
 * klien tidak pernah dipercaya.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { itemId?: string | null; type?: string | null; equip?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
    }

    const wantEquip = body.equip !== false;

    // Lepas berdasarkan tipe slot (tanpa itemId).
    if (!wantEquip && !body.itemId) {
      const type = body.type;
      if (!type || !isCosmeticType(type)) {
        return NextResponse.json({ error: "Jenis kosmetik tidak dikenal" }, { status: 400 });
      }
      await db.user.update({
        where: { id: user.id },
        data: patchFor(COSMETIC_FIELD[type], null),
      });
      await invalidate(user.id, user.email);
      return NextResponse.json({ success: true, type, icon: null });
    }

    const itemId = body.itemId;
    if (!itemId || typeof itemId !== "string") {
      return NextResponse.json({ error: "itemId wajib diisi" }, { status: 400 });
    }

    const item = await db.storeItem.findUnique({
      where: { id: itemId },
      select: { id: true, name: true, type: true, icon: true },
    });
    if (!item) {
      return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });
    }
    if (!isCosmeticType(item.type) || !isEquippableIcon(item.type, item.icon)) {
      return NextResponse.json({ error: "Item ini tidak bisa dipakai" }, { status: 400 });
    }

    const type = item.type as CosmeticType;
    const field = COSMETIC_FIELD[type];

    // Verifikasi kepemilikan — inti keamanan endpoint ini.
    const owned = await db.userItem.findUnique({
      where: { userId_itemId: { userId: user.id, itemId } },
      select: { id: true, quantity: true, expiresAt: true },
    });
    if (!owned || owned.quantity < 1) {
      return NextResponse.json({ error: "Kamu belum memiliki item ini" }, { status: 403 });
    }
    if (owned.expiresAt && owned.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Item ini sudah kedaluwarsa" }, { status: 400 });
    }

    // Satu slot hanya menyimpan satu ikon, jadi memakai item baru otomatis
    // menggantikan yang lama.
    const icon = wantEquip ? item.icon : null;
    await db.user.update({
      where: { id: user.id },
      data: patchFor(field, icon),
    });
    await invalidate(user.id, user.email);

    return NextResponse.json({ success: true, type, icon, itemId: item.id });
  } catch (error) {
    console.error("POST /api/siswa/store/equip error:", error);
    return NextResponse.json({ error: "Gagal menyimpan kosmetik" }, { status: 500 });
  }
}
