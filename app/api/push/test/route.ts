import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { kirimKeUser } from "@/lib/push";
import { db } from "@/lib/db";

// Kirim notifikasi uji ke perangkat MILIK SENDIRI.
//
// Ada karena jarak antara "server berhasil mengirim" dan "notifikasi muncul di
// layar" tidak bisa dilihat dari mana pun: push service membalas sukses begitu ia
// menerima kiriman, dan apa yang terjadi setelah itu — service worker versi lama,
// izin Android yang belum diberikan, saluran yang dibisukan — tidak pernah sampai
// kembali ke server.
//
// Klien mengirimkan endpoint langganannya sendiri supaya server bisa menjawab
// pertanyaan yang paling menentukan dan paling sering salah ditebak: apakah
// perangkat yang sedang dipegang ini memang yang terdaftar? Selama itu belum
// pasti, "terkirim" bisa berarti terkirim ke perangkat lain sama sekali.

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const endpointKlien: string | undefined = body?.endpoint;

    const milikSaya = await db.pushSubscription.findMany({
      where: { userId: user.id },
      select: { endpoint: true },
    });

    if (milikSaya.length === 0) {
      return NextResponse.json(
        { error: "Belum ada perangkat terdaftar untuk akun ini", perangkat: 0 },
        { status: 400 }
      );
    }

    // Cocok berarti langganan perangkat ini memang tersimpan di server. Tidak
    // cocok berarti notifikasi selama ini dikirim ke perangkat atau profil
    // browser LAIN — gejalanya identik dengan "notifikasi rusak", padahal bukan.
    const perangkatIniTerdaftar = endpointKlien
      ? milikSaya.some((s) => s.endpoint === endpointKlien)
      : null;

    const terkirim = await kirimKeUser(user.id, {
      title: "Notifikasi uji ✅",
      body: "Kalau kamu melihat ini, notifikasi Arena berfungsi di perangkat ini.",
      url: "/arena/player",
      tag: "uji",
    });

    return NextResponse.json({
      ok: true,
      perangkat: milikSaya.length,
      terkirim,
      perangkatIniTerdaftar,
    });
  } catch (e) {
    console.error("push/test gagal:", e);
    return NextResponse.json({ error: "Gagal mengirim notifikasi uji" }, { status: 500 });
  }
}
