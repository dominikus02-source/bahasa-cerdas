import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { kirimKeUser } from "@/lib/push";
import { db } from "@/lib/db";

// Kirim notifikasi uji ke perangkat MILIK SENDIRI.
//
// Ada karena jarak antara "server berhasil mengirim" dan "notifikasi muncul di
// layar" tidak bisa dilihat dari mana pun: push service membalas sukses begitu ia
// menerima kiriman, dan apa yang terjadi setelah itu — service worker versi lama,
// izin notifikasi Android yang belum diberikan, saluran notifikasi yang dibisukan
// — tidak pernah sampai kembali ke server.
//
// Tanpa ini setiap percobaan harus menunggu jadwal cron berikutnya, dan penyebab
// yang tidak terlihat hanya bisa ditebak.

export async function POST() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Hanya ke diri sendiri — tidak ada parameter penerima, jadi endpoint ini
    // tidak bisa dipakai mengirim ke orang lain.
    const jumlahPerangkat = await db.pushSubscription.count({ where: { userId: user.id } });
    if (jumlahPerangkat === 0) {
      return NextResponse.json(
        { error: "Belum ada perangkat terdaftar untuk akun ini", perangkat: 0 },
        { status: 400 }
      );
    }

    const terkirim = await kirimKeUser(user.id, {
      title: "Notifikasi uji ✅",
      body: "Kalau kamu melihat ini, notifikasi Arena berfungsi di perangkat ini.",
      url: "/arena/player",
      tag: "uji",
    });

    // perangkat vs terkirim sengaja dipisah: kalau terkirim lebih kecil, ada
    // langganan yang ditolak push service dan sudah dibersihkan otomatis.
    return NextResponse.json({ ok: true, perangkat: jumlahPerangkat, terkirim });
  } catch (e) {
    console.error("push/test gagal:", e);
    return NextResponse.json({ error: "Gagal mengirim notifikasi uji" }, { status: 500 });
  }
}
