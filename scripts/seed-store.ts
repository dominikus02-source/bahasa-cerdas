import { db } from "../lib/db";

const items = [
  { name: "Streak Freeze", description: "Lindungi streak-mu agar tidak putus selama 1 hari", type: "STREAK_FREEZE", price: 50, icon: "🧊" },
  { name: "XP Boost 24 Jam", description: "Lipat gandakan XP yang kamu dapat selama 24 jam", type: "XP_BOOST", price: 100, icon: "⚡" },
  { name: "Bingkai Avatar Perunggu", description: "Bingkai avatar eksklusif warna perunggu", type: "AVATAR_FRAME", price: 200, icon: "🟤" },
  { name: "Bingkai Avatar Perak", description: "Bingkai avatar eksklusif warna perak", type: "AVATAR_FRAME", price: 500, icon: "⚪" },
  { name: "Bingkai Avatar Emas", description: "Bingkai avatar eksklusif warna emas", type: "AVATAR_FRAME", price: 1000, icon: "🟡" },
  { name: "Tema Tampilan Gelap", description: "Ubah tema aplikasi menjadi mode gelap", type: "THEME", price: 300, icon: "🌙" },
  { name: "Stiker Premium (5 pcs)", description: "Koleksi stiker digital eksklusif untuk komentar", type: "STICKER", price: 150, icon: "🎨" },
];

async function seed() {
  for (const item of items) {
    await db.storeItem.upsert({
      where: { id: item.name },
      create: item,
      update: item,
    });
  }
  console.log(`Seeded ${items.length} store items`);
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect());
