import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// Menyimpan/mencabut langganan Web Push satu perangkat.
//
// Endpoint dari browser adalah identitas perangkat, dan ia unik di tabel — jadi
// upsert, bukan create: murid yang membuka ulang aplikasi mengirim endpoint yang
// sama dan tidak boleh menghasilkan baris kedua.

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
    if (!dbUser) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const endpoint: string | undefined = body?.endpoint;
    const p256dh: string | undefined = body?.keys?.p256dh;
    const auth: string | undefined = body?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Langganan tidak lengkap" }, { status: 400 });
    }

    await db.pushSubscription.upsert({
      where: { endpoint },
      // Endpoint bisa berpindah pemilik: satu HP dipakai bergantian dua murid
      // (lumrah di rumah). userId ikut diperbarui supaya notifikasi tidak
      // menyusul ke akun sebelumnya.
      update: { userId: dbUser.id, p256dh, auth, lastOkAt: new Date() },
      create: { userId: dbUser.id, endpoint, p256dh, auth },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("push/subscribe gagal:", e);
    return NextResponse.json({ error: "Gagal menyimpan langganan" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const endpoint: string | undefined = body?.endpoint;
    if (!endpoint) return NextResponse.json({ error: "endpoint wajib" }, { status: 400 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
    if (!dbUser) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    // Dibatasi pada userId: tanpa itu siapa pun yang tahu sebuah endpoint bisa
    // mencabut notifikasi milik murid lain.
    await db.pushSubscription.deleteMany({ where: { endpoint, userId: dbUser.id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("push/unsubscribe gagal:", e);
    return NextResponse.json({ error: "Gagal mencabut langganan" }, { status: 500 });
  }
}
