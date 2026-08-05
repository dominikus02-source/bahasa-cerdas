import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kirimKeUser } from "@/lib/push";

// Tiga ajakan harian, dijadwalkan lewat vercel.json (WIB = UTC+7):
//   15.00 WIB — main gim, baru pulang sekolah
//   17.00 WIB — cek misi harian
//   19.00 WIB — belajar Jalur Cerdas
//
// Satu endpoint untuk ketiganya: slotnya diturunkan dari jam saat ia dipanggil,
// bukan dari parameter. Itu membuat jadwal di vercel.json menjadi satu-satunya
// sumber kebenaran — tidak ada cara jadwal dan isi pesan menjadi tidak sinkron.
//
// TIDAK bisa dijadwalkan di perangkat: web tidak punya API penjadwal notifikasi
// lokal yang bisa diandalkan (Notification Triggers tidak pernah dirilis,
// Periodic Background Sync waktunya ditentukan browser). Push terjadwal dari
// server adalah satu-satunya cara yang bekerja saat aplikasi tertutup.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Slot = "gim" | "misi" | "belajar";

// Beberapa varian per slot, dipilih bergantian menurut tanggal. Kalimat yang
// sama persis setiap hari cepat berubah jadi latar dan diabaikan.
const PESAN: Record<Slot, { title: string; body: string }[]> = {
  gim: [
    { title: "Capek sekolah ya?", body: "Main gim dulu yuk — 5 menit aja 🎮" },
    { title: "Istirahat dulu", body: "Ada gim baru nunggu kamu di Arena 🕹️" },
    { title: "Yuk seru-seruan", body: "Tantang teman sekelasmu di gim kata 🎯" },
  ],
  misi: [
    { title: "Misi hari ini", body: "Hai! Kamu sudah cek misi hari ini belum? 🎯" },
    { title: "Ada koin nunggu", body: "Selesaikan misi harian, kumpulkan koinnya 🪙" },
    { title: "Tinggal sedikit lagi", body: "Misi hari ini belum selesai — ayo rampungkan ✨" },
  ],
  belajar: [
    { title: "Yuk belajar", body: "Ayo belajar Bahasa Indonesia biar makin pintar 📚" },
    { title: "Lanjut Jalur Cerdas", body: "Satu pelajaran lagi sebelum tidur, yuk 🌙" },
    { title: "Jaga runtunanmu", body: "Belajar 5 menit hari ini, biar tidak putus 🔥" },
  ],
};

const TUJUAN: Record<Slot, string> = {
  gim: "/arena/game",
  misi: "/arena/misi",
  belajar: "/arena/jalur-cerdas",
};

function slotDariJam(sekarang: Date): Slot | null {
  const jamWib = (sekarang.getUTCHours() + 7) % 24;
  if (jamWib === 15) return "gim";
  if (jamWib === 17) return "misi";
  if (jamWib === 19) return "belajar";
  return null;
}

export async function GET(req: NextRequest) {
  const rahasia = process.env.CRON_SECRET;
  if (rahasia) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${rahasia}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const sekarang = new Date();
  const slot = slotDariJam(sekarang);
  if (!slot) {
    // Berjaga kalau jadwal cron diubah tanpa mengubah niatnya.
    return NextResponse.json({ dilewati: "di luar jam ajakan" });
  }

  // Awal hari ini menurut WIB, dinyatakan dalam UTC.
  const awalHariWib = new Date(sekarang);
  awalHariWib.setUTCHours(awalHariWib.getUTCHours() + 7);
  awalHariWib.setUTCHours(0, 0, 0, 0);
  awalHariWib.setUTCHours(awalHariWib.getUTCHours() - 7);

  try {
    // Hanya murid yang punya perangkat terdaftar. Tidak ada gunanya menghitung
    // seluruh basis pengguna kalau yang bisa dijangkau cuma pemilik langganan.
    const langganan = await db.pushSubscription.findMany({
      select: { userId: true, lastOkAt: true },
      take: 5000,
    });
    if (langganan.length === 0) return NextResponse.json({ slot, terkirim: 0, kandidat: 0 });

    // Pengaman antar-slot: lewati murid yang baru saja menerima notifikasi.
    // Cron tugas berjalan pada jam yang sama dengan slot gim, dan dua
    // pemberitahuan beruntun adalah cara tercepat membuat orang mematikan izin.
    const batasDiam = new Date(sekarang.getTime() - 90 * 60 * 1000);
    const kandidat = [
      ...new Set(langganan.filter((s) => s.lastOkAt < batasDiam).map((s) => s.userId)),
    ];
    if (kandidat.length === 0) return NextResponse.json({ slot, terkirim: 0, kandidat: 0 });

    // Yang sudah melakukan hal itu hari ini tidak diajak melakukannya lagi.
    // Inilah yang membuat tiga ajakan sehari tidak terasa seperti gangguan:
    // murid rajin biasanya menerima nol.
    let perlu: string[] = [];
    if (slot === "misi") {
      const selesai = await db.dailyQuest.findMany({
        where: { userId: { in: kandidat }, date: { gte: awalHariWib }, completed: true },
        select: { userId: true },
      });
      const sudah = new Set(selesai.map((q) => q.userId));
      perlu = kandidat.filter((id) => !sudah.has(id));
    } else if (slot === "belajar") {
      const belajar = await db.userUnitProgress.findMany({
        where: { userId: { in: kandidat }, completedAt: { gte: awalHariWib } },
        select: { userId: true },
      });
      const sudah = new Set(belajar.map((p) => p.userId));
      perlu = kandidat.filter((id) => !sudah.has(id));
    } else {
      // Slot gim: ajakan bersantai, bukan pengingat tugas. Cukup lewati murid
      // yang memang sudah membuka aplikasi hari ini.
      const aktif = await db.user.findMany({
        where: { id: { in: kandidat }, lastActiveAt: { gte: awalHariWib } },
        select: { id: true },
      });
      const sudah = new Set(aktif.map((u) => u.id));
      perlu = kandidat.filter((id) => !sudah.has(id));
    }

    if (perlu.length === 0) return NextResponse.json({ slot, terkirim: 0, kandidat: kandidat.length });

    const varian = PESAN[slot];
    const hariKe = Math.floor(sekarang.getTime() / 86_400_000);
    const pesan = varian[hariKe % varian.length];

    let terkirim = 0;
    for (const userId of perlu) {
      terkirim += await kirimKeUser(userId, {
        title: pesan.title,
        body: pesan.body,
        url: TUJUAN[slot],
        // Satu tag per slot: kalau cron terpanggil dua kali, notifikasi kedua
        // menimpa yang pertama alih-alih menumpuk.
        tag: `ajakan-${slot}`,
      });
    }

    return NextResponse.json({ slot, terkirim, kandidat: kandidat.length, perlu: perlu.length });
  } catch (e) {
    console.error("cron/ajakan-harian gagal:", e);
    return NextResponse.json({ error: "Gagal" }, { status: 500 });
  }
}
