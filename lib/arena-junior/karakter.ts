// Karakter Arena Junior — sumber tunggal untuk maskot & posenya.
//
// Aset resmi ada tiga karakter: Zelby, Hazel, Alby (lihat
// public/arena-junior/karakter/). Kurikulum asal KataPlay memakai nama lain
// ("lily", "budi") yang TIDAK punya gambar sama sekali, jadi nama itu
// dinormalkan di sini — bukan di komponen, supaya tidak ada tempat lain yang
// perlu tahu soal nama lama.

export const KARAKTER = ["zelby", "hazel", "alby"] as const
export type Karakter = (typeof KARAKTER)[number]

export type Pose =
  | "idle"
  | "happy"
  | "celebrate"
  | "thinking"
  | "reading"
  | "wave"
  | "encouraging"
  | "questioning"

/** Nama lama dari kurikulum KataPlay → karakter yang benar-benar punya aset. */
const ALIAS: Record<string, Karakter> = {
  zelby: "zelby",
  lily: "hazel",
  hazel: "hazel",
  budi: "alby",
  alby: "alby",
}

export function normalkanKarakter(hint: string | null | undefined): Karakter {
  if (!hint) return "zelby"
  return ALIAS[hint.trim().toLowerCase()] ?? "zelby"
}

/** Pose yang benar-benar ada berkasnya, per karakter. */
const POSE_TERSEDIA: Record<Karakter, Pose[]> = {
  zelby: ["idle", "happy", "celebrate", "thinking", "reading", "wave"],
  hazel: ["idle", "happy", "celebrate", "thinking", "reading", "encouraging"],
  alby: ["idle", "happy", "celebrate", "questioning"],
}

export const PROFIL: Record<Karakter, { nama: string; peran: string; warna: string }> = {
  zelby: { nama: "Master Zelby", peran: "Pemandu petualangan", warna: "#D99058" },
  hazel: { nama: "Hazel", peran: "Kakak pemandu baca", warna: "#A78BFA" },
  alby: { nama: "Alby", peran: "Adik penuh tanya", warna: "#FF8C42" },
}

/**
 * Jalur gambar karakter. Kalau pose yang diminta tidak punya berkas, jatuh ke
 * "happy" lalu "idle" — jadi komponen tidak pernah merender gambar rusak.
 */
export function gambarKarakter(hint: string | null | undefined, pose: Pose = "idle") {
  const karakter = normalkanKarakter(hint)
  const tersedia = POSE_TERSEDIA[karakter]
  const dipakai = tersedia.includes(pose)
    ? pose
    : tersedia.includes("happy")
      ? "happy"
      : "idle"
  return `/arena-junior/karakter/${karakter}_${dipakai}.webp`
}

/** Palet resmi dari lembar desain Zelby V2. */
export const PALET = {
  krem: "#FFF8E6",
  kremMuda: "#FFF1D2",
  amber: "#FFD54A",
  oranye: "#D99058",
  cokelat: "#C9823A",
  cokelatTua: "#8B5A2B",
} as const
