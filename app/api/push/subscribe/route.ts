import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// Menyimpan/mencabut langganan Web Push satu perangkat.
//
// Identitas diambil lewat getUser() dari lib/supabase/server — BUKAN
// supabase.auth.getUser() langsung. Versi pertama route ini memakai panggilan
// langsung dan selalu membalas 401 meski murid jelas sudah masuk: layout Arena
// (yang memakai helper) merender normal pada detik yang sama. Helper itu
// memverifikasi JWT secara lokal lewat getClaims(); panggilan langsung menembak
// server Auth Supabase tiap kali, pola yang sudah dibuang dari repo ini setelah
// menyebabkan 429 massal pada 28 Juli 2026.
//
// Endpoint dari browser adalah identitas perangkat, dan ia unik di tabel — jadi
// upsert, bukan create: murid yang membuka ulang aplikasi mengirim endpoint yang
// sama dan tidak boleh menghasilkan baris kedua.

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      update: { userId: user.id, p256dh, auth, lastOkAt: new Date() },
      create: { userId: user.id, endpoint, p256dh, auth },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("push/subscribe gagal:", e);
    // P2021 = tabel tidak ada di database. Dibedakan karena penyebabnya spesifik
    // dan hanya bisa diperbaiki dengan menjalankan
    // prisma/migrations/manual/push-subscription.sql di Supabase — bukan sesuatu
    // yang bisa diperbaiki murid dengan mencoba lagi. Tanpa pesan yang jelas,
    // murid menekan tombolnya berulang kali sampai browser memblokir izinnya.
    if (e?.code === "P2021") {
      return NextResponse.json(
        { error: "Tabel PushSubscription belum ada di database", kode: "TABEL_HILANG" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Gagal menyimpan langganan di server", kode: "SERVER" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const endpoint: string | undefined = body?.endpoint;
    if (!endpoint) return NextResponse.json({ error: "endpoint wajib" }, { status: 400 });

    // Dibatasi pada userId: tanpa itu siapa pun yang tahu sebuah endpoint bisa
    // mencabut notifikasi milik murid lain.
    await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("push/unsubscribe gagal:", e);
    return NextResponse.json({ error: "Gagal mencabut langganan" }, { status: 500 });
  }
}
