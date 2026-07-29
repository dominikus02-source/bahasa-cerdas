/**
 * Kotak Harian — hadiah login harian dengan siklus 7 hari.
 *
 * Hari ke-7 adalah Kotak Misterius: hadiahnya diundi di server, bukan tetap.
 */

export const KOTAK_HARIAN_REASON = "KOTAK_HARIAN";

export type RewardKind = "XP" | "KOIN" | "FREEZE";

export type BoxReward = {
  jenis: RewardKind;
  jumlah: number;
  label: string;
};

/** Slot harian. `misteri: true` artinya hadiahnya diundi saat diklaim. */
export type BoxSlot = {
  hari: number;
  misteri?: boolean;
  reward?: BoxReward;
  label: string;
};

export const BOX_SLOTS: BoxSlot[] = [
  { hari: 1, reward: { jenis: "XP", jumlah: 50, label: "+50 XP" }, label: "+50 XP" },
  { hari: 2, reward: { jenis: "KOIN", jumlah: 5, label: "+5 Koin" }, label: "+5 Koin" },
  { hari: 3, reward: { jenis: "FREEZE", jumlah: 1, label: "Streak Freeze" }, label: "Streak Freeze" },
  { hari: 4, reward: { jenis: "XP", jumlah: 100, label: "+100 XP" }, label: "+100 XP" },
  { hari: 5, reward: { jenis: "KOIN", jumlah: 10, label: "+10 Koin" }, label: "+10 Koin" },
  { hari: 6, reward: { jenis: "XP", jumlah: 150, label: "+150 XP" }, label: "+150 XP" },
  { hari: 7, misteri: true, label: "Kotak Misterius" },
];

/**
 * Isi Kotak Misterius hari ke-7. `bobot` adalah peluang relatif — jumlah
 * seluruh bobot di sini 100, jadi angkanya sekaligus terbaca sebagai persen
 * dan bisa ditampilkan apa adanya ke murid tanpa risiko salah janji.
 */
export const MYSTERY_POOL: { reward: BoxReward; bobot: number }[] = [
  { reward: { jenis: "XP", jumlah: 200, label: "+200 XP" }, bobot: 30 },
  { reward: { jenis: "KOIN", jumlah: 20, label: "+20 Koin" }, bobot: 25 },
  { reward: { jenis: "FREEZE", jumlah: 1, label: "Streak Freeze" }, bobot: 20 },
  { reward: { jenis: "KOIN", jumlah: 50, label: "+50 Koin" }, bobot: 15 },
  { reward: { jenis: "XP", jumlah: 500, label: "+500 XP" }, bobot: 10 },
];

/** Undi isi Kotak Misterius. Dipanggil di server saja. */
export function rollMysteryReward(): BoxReward {
  const total = MYSTERY_POOL.reduce((sum, p) => sum + p.bobot, 0);
  let tiket = Math.random() * total;
  for (const p of MYSTERY_POOL) {
    tiket -= p.bobot;
    if (tiket <= 0) return p.reward;
  }
  return MYSTERY_POOL[MYSTERY_POOL.length - 1].reward;
}

/**
 * Kunci tanggal zona WIB (UTC+7), dipakai sebagai `reference` penanda klaim.
 *
 * Sengaja tidak memakai toISOString() apa adanya: itu tanggal UTC, sehingga
 * "hari baru" berganti pukul 07.00 WIB. Murid yang membuka kotak pukul 06.00
 * lalu 08.00 akan terhitung dua hari berbeda dan bisa klaim dua kali.
 * WIB tidak mengenal DST, jadi geser tetap +7 jam sudah tepat.
 */
export function getJakartaDateKey(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Slot untuk klaim ke-N (0-indeks), berulang tiap 7 hari. */
export function getSlotForClaimCount(claimCount: number): BoxSlot {
  return BOX_SLOTS[claimCount % BOX_SLOTS.length];
}
