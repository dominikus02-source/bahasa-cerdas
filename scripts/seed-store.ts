import { db } from "../lib/db";

const items = [
  { name: "Streak Freeze", description: "Lindungi streak-mu agar tidak putus selama 1 hari", type: "STREAK_FREEZE", price: 50, icon: "freeze" },
  { name: "XP Boost 24 Jam", description: "Lipat gandakan XP yang kamu dapat selama 24 jam", type: "XP_BOOST", price: 100, icon: "boost" },
  { name: "Bingkai Avatar Perunggu", description: "Bingkai avatar eksklusif warna perunggu", type: "AVATAR_FRAME", price: 200, icon: "frame-bronze" },
  { name: "Bingkai Avatar Perak", description: "Bingkai avatar eksklusif warna perak", type: "AVATAR_FRAME", price: 500, icon: "frame-silver" },
  { name: "Bingkai Avatar Emas", description: "Bingkai avatar eksklusif warna emas", type: "AVATAR_FRAME", price: 1000, icon: "frame-gold" },
  { name: "Tema Tampilan Gelap", description: "Ubah tema aplikasi menjadi mode gelap", type: "THEME", price: 300, icon: "theme" },
  { name: "Stiker Premium (5 pcs)", description: "Koleksi stiker digital eksklusif untuk komentar", type: "STICKER", price: 150, icon: "sticker" },
  { name: "Hint Token", description: "Lihat 1 opsi yang salah pada soal PG", type: "HINT_TOKEN", price: 25, icon: "hint" },
  { name: "Time Extension", description: "Tambahan waktu 30 detik untuk kuis", type: "TIME_EXTENSION", price: 40, icon: "timer" },
  { name: "Heart Refill", description: "Isi ulang nyawa untuk lanjut belajar", type: "HEART_REFILL", price: 30, icon: "heart" },
  { name: "Warna Nama Ungu", description: "Ubah warna namamu menjadi ungu premium", type: "NAME_COLOR", price: 150, icon: "color-purple" },
  { name: "Warna Nama Emas", description: "Ubah warna namamu menjadi emas legendaris", type: "NAME_COLOR", price: 300, icon: "color-gold" },
  { name: "Badge 'Rajin Menulis'", description: "Badge eksklusif untuk penulis aktif", type: "BADGE", price: 200, icon: "badge-write" },
  { name: "Badge 'Kutu Buku'", description: "Badge untuk pencinta literasi", type: "BADGE", price: 200, icon: "badge-book" },
  { name: "Efek Confetti", description: "Efek kembang api saat jawaban benar", type: "ANSWER_EFFECT", price: 200, icon: "confetti" },
  { name: "Bingkai Avatar Neon", description: "Bingkai avatar dengan efek neon menyala", type: "AVATAR_FRAME", price: 1500, icon: "frame-neon" },
  { name: "Ekstra Tryout UKBI", description: "1 kali tryout UKBI tambahan", type: "EXTRA_TRYOUT", price: 500, icon: "ukbi" },
  { name: "Ekstra Tryout TKA", description: "1 kali tryout TKA tambahan", type: "EXTRA_TRYOUT", price: 500, icon: "tka" },
  { name: "Double XP 15 Menit", description: "Lipat gandakan XP selama 15 menit", type: "XP_BOOST", price: 75, icon: "boost" },
];

async function seed() {
  for (const item of items) {
    await db.storeItem.upsert({
      where: { name: item.name },
      create: item,
      update: item,
    });
  }
  console.log(`Seeded ${items.length} store items`);
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect());
