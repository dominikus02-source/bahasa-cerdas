const CHALLENGES = [
  { type: "PANTUN", theme: "Pantun Persahabatan", prompt: "Buat pantun tentang persahabatan yang penuh makna!" },
  { type: "PUISI", theme: "Puisi Alam", prompt: "Tulis puisi tentang keindahan alam Indonesia!" },
  { type: "CERPEN", theme: "Cerpen Inspiratif", prompt: "Kisah inspiratif tentang meraih mimpi!" },
  { type: "ARTIKEL", theme: "Artikel Lingkungan", prompt: "Tulis artikel tentang menjaga lingkungan sekolah!" },
  { type: "ANEKDOT", theme: "Anekdot Lucu", prompt: "Cerita lucu berdasarkan pengalaman sehari-hari!" },
  { type: "OPINI", theme: "Opini Pendidikan", prompt: "Pendapatmu tentang masa depan pendidikan Indonesia!" },
  { type: "PANTUN", theme: "Pantun Nasihat", prompt: "Buat pantun yang berisi nasihat bijak!" },
  { type: "PUISI", theme: "Puisi Kemerdekaan", prompt: "Puisi tentang semangat kemerdekaan!" },
  { type: "CERPEN", theme: "Cerpen Fantasi", prompt: "Cerita fantasi pendek dengan tokoh utama hewan!" },
  { type: "ARTIKEL", theme: "Artikel Teknologi", prompt: "Dampak teknologi bagi pelajar!" },
  { type: "ANEKDOT", theme: "Anekdot Sekolah", prompt: "Pengalaman lucu di sekolah!" },
  { type: "OPINI", theme: "Opini Sosial", prompt: "Pandanganmu tentang budaya gotong royong!" },
]

export function getWeeklyChallenge() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const weekNumber = Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const challenge = CHALLENGES[weekNumber % CHALLENGES.length]
  const weekLabel = `Minggu ke-${(weekNumber % CHALLENGES.length) + 1}`
  return { ...challenge, weekLabel }
}

export function getAllChallengeTypes() {
  return [...new Set(CHALLENGES.map(c => c.type))]
}
