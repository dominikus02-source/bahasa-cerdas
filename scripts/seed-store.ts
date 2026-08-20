import { db } from "../lib/db";

const items = [
  { name: "Streak Freeze", description: "Lindungi streak harianmu agar tidak putus saat lupa login satu hari", type: "STREAK_FREEZE", price: 50, icon: "freeze" },
  { name: "XP Boost 24 Jam", description: "Gandakan XP selama 24 jam — level up lebih cepat dari biasanya", type: "XP_BOOST", price: 100, icon: "boost" },
  { name: "Bingkai Avatar Perunggu", description: "Bingkai perunggu untuk avatarmu — tampil beda dari yang lain", type: "AVATAR_FRAME", price: 200, icon: "frame-bronze" },
  { name: "Bingkai Avatar Perak", description: "Bingkai perak — lebih premium, lebih menonjol di profilmu", type: "AVATAR_FRAME", price: 500, icon: "frame-silver" },
  { name: "Bingkai Avatar Emas", description: "Bingkai emas — untuk siswa yang sudah mencapai banyak", type: "AVATAR_FRAME", price: 1000, icon: "frame-gold" },
  // RETIRED — no working implementation (Coin Shop 2.1 audit)
  { name: "Tema Tampilan Gelap", description: "Ubah tema aplikasi menjadi mode gelap", type: "THEME", price: 300, icon: "theme", isActive: false },
  { name: "Stiker Premium (5 pcs)", description: "Koleksi stiker digital eksklusif untuk komentar", type: "STICKER", price: 150, icon: "sticker", isActive: false },
  { name: "Hint Token", description: "Coret satu opsi salah saat mengerjakan soal pilihan ganda", type: "HINT_TOKEN", price: 25, icon: "hint" },
  // RETIRED — no game consumes TIME_EXTENSION (Coin Shop 2.2 audit)
  { name: "Time Extension", description: "Tambahan waktu 30 detik untuk kuis", type: "TIME_EXTENSION", price: 40, icon: "timer", isActive: false },
  // RETIRED — no working implementation (Coin Shop 2.1 audit)
  { name: "Heart Refill", description: "Isi ulang nyawa untuk lanjut belajar", type: "HEART_REFILL", price: 30, icon: "heart", isActive: false },
  { name: "Warna Nama Ungu", description: "Namamu tampil ungu di Arena dan profilmu", type: "NAME_COLOR", price: 150, icon: "color-purple" },
  { name: "Warna Nama Emas", description: "Namamu tampil emas gradient — premium dan menonjol", type: "NAME_COLOR", price: 300, icon: "color-gold" },
  { name: "Warna Nama Royal", description: "Namamu tampil biru royal — elegan dan berwibawa", type: "NAME_COLOR", price: 400, icon: "color-royal" },
  { name: "Warna Nama Aurora", description: "Namamu tampil hijau aurora — unik dan memukau", type: "NAME_COLOR", price: 450, icon: "color-aurora" },
  { name: "Badge 'Rajin Menulis'", description: "Tunjukkan bahwa kamu aktif menulis karya", type: "BADGE", price: 200, icon: "badge-write" },
  { name: "Badge 'Kutu Buku'", description: "Tunjukkan bahwa kamu pencinta literasi", type: "BADGE", price: 200, icon: "badge-book" },
  { name: "Efek Confetti", description: "Perayaan saat jawaban benar di Menara Cerdas", type: "ANSWER_EFFECT", price: 200, icon: "confetti" },
  { name: "Bingkai Avatar Neon", description: "Bingkai neon bercahaya — yang paling mencolok di Arena", type: "AVATAR_FRAME", price: 1500, icon: "frame-neon" },
  // RETIRED — no working implementation (Coin Shop 2.1 audit)
  { name: "Ekstra Tryout UKBI", description: "1 kali tryout UKBI tambahan", type: "EXTRA_TRYOUT", price: 500, icon: "ukbi", isActive: false },
  { name: "Ekstra Tryout TKA", description: "1 kali tryout TKA tambahan", type: "EXTRA_TRYOUT", price: 500, icon: "tka", isActive: false },
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
