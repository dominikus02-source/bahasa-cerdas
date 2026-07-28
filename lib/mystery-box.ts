/**
 * Kotak Harian — hadiah login harian dengan siklus 7 hari.
 *
 * Hadiahnya hanya XP dan koin, yaitu hal yang benar-benar ada di sistem.
 * Daftar lama sempat menjanjikan "Streak Freeze", "Skin Avatar", dan "Mystery
 * Box" yang tidak pernah diimplementasikan di mana pun.
 */

export const KOTAK_HARIAN_REASON = "KOTAK_HARIAN";

export type BoxReward = {
  hari: number;
  jenis: "XP" | "KOIN";
  jumlah: number;
  label: string;
};

export const BOX_REWARDS: BoxReward[] = [
  { hari: 1, jenis: "XP", jumlah: 50, label: "+50 XP" },
  { hari: 2, jenis: "KOIN", jumlah: 5, label: "+5 Koin" },
  { hari: 3, jenis: "XP", jumlah: 75, label: "+75 XP" },
  { hari: 4, jenis: "XP", jumlah: 100, label: "+100 XP" },
  { hari: 5, jenis: "KOIN", jumlah: 10, label: "+10 Koin" },
  { hari: 6, jenis: "XP", jumlah: 150, label: "+150 XP" },
  { hari: 7, jenis: "KOIN", jumlah: 25, label: "+25 Koin" },
];

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

/** Hadiah untuk klaim ke-N (0-indeks), berulang tiap 7 hari. */
export function getRewardForClaimCount(claimCount: number): BoxReward {
  return BOX_REWARDS[claimCount % BOX_REWARDS.length];
}
