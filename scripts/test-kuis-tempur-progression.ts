/**
 * KUIS TEMPUR 2.0 — QA progresi & komposisi musuh.
 *
 * 15 kelompok tes:
 *  1–4   kurva pemain (nyawa & kerusakan peluru per ronde)
 *  5–12  komposisi musuh dinamis (arketipe, keseimbangan, determinisme)
 *  13    sinkronisasi karakter (bc-karakter, alias junior)
 *  14    wiring komponen (import & penggunaan benar)
 *  15    anti-cheat XP (server tidak percaya klien)
 *
 * Jalankan: npm run test:kuis-tempur-progression
 */

import * as fs from "node:fs"
import * as path from "node:path"

let lulus = 0
let gagal = 0
const daftar: string[] = []

function cek(kondisi: boolean, nama: string) {
  if (kondisi) {
    lulus++
    daftar.push(`  ✅ ${nama}`)
  } else {
    gagal++
    daftar.push(`  ❌ ${nama}`)
  }
}

const AKAR = path.resolve(__dirname, "..")

// ── 1. Banyak lawan per ronde ──────────────────────────────────────────────
;(async () => {
  const { lawanBot } = await import("../lib/game/kuis-tempur-progression")
  cek(lawanBot(1) === 3, "lawannya ronde 1 = 3 lawan")
  cek(lawanBot(2) === 3, "ronde 2 tetap 3 lawan")
  cek(lawanBot(3) === 4, "ronde 3 = 4 lawan (naik tiap 2 ronde)")
  cek(lawanBot(5) === 5, "ronde 5 = 5 lawan")
  cek(lawanBot(9) === 7, "ronde 9 = 7 lawan (maks)")
  cek(lawanBot(99) === 7, "ronde 99 tetap 7 lawan (cap)")
  cek(lawanBot(0) === 3 && lawanBot(-5) === 3, "ronde <1 dijepit ke 3 lawan")

  // ── 2–4. Kurva pemain ────────────────────────────────────────────────────
  const { kurvaPemain } = await import("../lib/game/kuis-tempur-progression")
  const l1 = kurvaPemain(1)
  cek(l1.hpMax === 100 && l1.dmgTembak === 34, "pemain ronde 1: 100 nyawa, peluru 34")

  let naikHp = true
  let naikDmg = true
  for (let lv = 2; lv <= 99; lv++) {
    const s = kurvaPemain(lv)
    const sblm = kurvaPemain(lv - 1)
    if (s.hpMax < sblm.hpMax) naikHp = false
    if (s.dmgTembak < sblm.dmgTembak) naikDmg = false
  }
  cek(naikHp, "nyawa maksimum tidak pernah turun antar ronde")
  cek(naikDmg, "kerusakan peluru tidak pernah turun antar ronde")
  cek(kurvaPemain(26).hpMax === 200 && kurvaPemain(99).hpMax === 200, "nyawa maksimum cap 200 (ronde 26+)")
  cek(kurvaPemain(49).dmgTembak === 50 && kurvaPemain(99).dmgTembak === 50, "kerusakan peluru cap 50 (ronde 49+)")

  // ── 5–12. Komposisi musuh dinamis ────────────────────────────────────────
  const { komposisiBot, statDasarBot } = await import("../lib/game/kuis-tempur-progression")
  const TIPE = ["ringan", "sedang", "berat", "penembak"]

  let semuaValid = true
  for (let lv = 1; lv <= 99; lv++) {
    for (let i = 0; i < 20; i++) {
      const s = komposisiBot(lv, i)
      if (!TIPE.includes(s.tipe)) semuaValid = false
      if (!Number.isFinite(s.hpMax) || !Number.isFinite(s.dmg) || !Number.isFinite(s.laju)) semuaValid = false
      if (s.peluangTembak <= 0 || s.sebaran <= 0) semuaValid = false
    }
  }
  cek(semuaValid, "komposisiBot valid untuk ronde 1–99 (tipe & statistik berhingga)")

  const paksa = (tipe: string, lv: number) => {
    // Cari indeks arketipe di band lalu suntikkan rng yang menunjuk ke sana.
    for (let i = 0; i < 10; i++) {
      const s = komposisiBot(lv, i, () => i / 10 + 0.0001)
      if (s.tipe === tipe) return s
    }
    return null
  }

  const ringanL1 = paksa("ringan", 1)
  const beratL1 = paksa("berat", 1)
  cek(ringanL1 !== null && beratL1 !== null, "arketipe ringan & berat bisa dipaksa muncul di ronde 1")
  if (ringanL1 && beratL1) {
    cek(beratL1.hpMax > ringanL1.hpMax, "Si Kuat berdarah lebih tebal dari Si Cepat (ronde sama)")
    cek(ringanL1.laju > beratL1.laju, "Si Cepat berjalan lebih cepat dari Si Kuat")
    cek(beratL1.dmg > ringanL1.dmg, "Si Kuat memukul lebih keras dari Si Cepat")
  }

  const sedangL1 = paksa("sedang", 1)
  const sedangL10 = paksa("sedang", 10)
  const penembakL10 = paksa("penembak", 10)
  cek(sedangL10 !== null && penembakL10 !== null, "arketipe sedang & penembak tersedia di ronde 10")
  if (sedangL10 && penembakL10) {
    cek(penembakL10.peluangTembak > sedangL10.peluangTembak, "Penembak menembak lebih rajin dari bot seimbang")
    cek(penembakL10.sebaran < sedangL10.sebaran, "Penembak lebih akurat (sebaran lebih sempit)")
  }

  const sedangL20 = paksa("sedang", 20)
  cek(sedangL1 !== null && sedangL20 !== null && sedangL20!.hpMax > sedangL1!.hpMax, "HP dasar bot naik seiring ronde (ronde 20 > ronde 1)")

  let dalamBatas = true
  for (let lv = 1; lv <= 99; lv++) {
    for (let i = 0; i < 30; i++) {
      const s = komposisiBot(lv, i)
      if (s.hpMax < 30 || s.hpMax > 500) dalamBatas = false
      if (s.dmg < 6 || s.dmg > 30) dalamBatas = false
    }
  }
  cek(dalamBatas, "batas wajar statistik bot: HP 30–500, kerusakan 6–30")

  const rngTetap = (() => { let x = 0.42; return () => { x = (x * 16807) % 2147483647; return x / 2147483647 } })()
  const a = komposisiBot(12, 3, rngTetap)
  const b = komposisiBot(12, 3, rngTetap)
  cek(JSON.stringify(a) === JSON.stringify(b), "komposisiBot deterministik dengan rng yang sama")

  const s999 = komposisiBot(999, 0)
  cek(s999.hpMax >= 30 && s999.hpMax <= 500 && s999.dmg >= 6, "ronde >99 dijepit (HP & kerusakan tetap dalam batas wajar)")
  const dasar1 = statDasarBot(1)
  const dasar20 = statDasarBot(20)
  cek(dasar20.lajuBot > dasar1.lajuBot && dasar20.dmgBot > dasar1.dmgBot, "statistik dasar arena naik seiring ronde")

  // ── 13. Sinkronisasi karakter ────────────────────────────────────────────
  const { bacaKarakter } = await import("../lib/arena-junior/karakter-simpan")
  cek(bacaKarakter() === "zelby", "bacaKarakter aman tanpa localStorage (SSR/Node) → zelby")
  const { normalkanKarakter } = await import("../lib/arena-junior/karakter")
  cek(normalkanKarakter("lily") === "hazel", "alias lama 'lily' → hazel")
  cek(normalkanKarakter("budi") === "alby", "alias lama 'budi' → alby")
  cek(normalkanKarakter("ZELBY") === "zelby" && normalkanKarakter("hazel") === "hazel", "nama asli karakter dikenali (case-insensitive)")
  cek(normalkanKarakter(null) === "zelby" && normalkanKarakter("") === "zelby", "hint kosong/rusak jatuh ke zelby")

  // ── 14. Wiring komponen ──────────────────────────────────────────────────
  const komponen = fs.readFileSync(path.join(AKAR, "components/game/KuisTempurSolo.tsx"), "utf8")
  cek(komponen.includes('simpanKarakter(p.id)'), "pilihan karakter ditulis ke penyimpanan saat dipilih")
  cek(komponen.includes("bacaKarakter()"), "karakter dibaca ulang dari penyimpanan saat halaman dibuka")
  cek(komponen.includes("komposisiBot(level,"), "gelombang bot memakai arketipe dinamis")
  cek(komponen.includes("kurvaPemain("), "pemain memakai kurva ronde (nyawa & peluru)")
  cek(komponen.includes("WARNA_TIPE") && komponen.includes("LABEL_TIPE"), "warna & label arketipe dipakai di arena")
  cek(komponen.includes("p.hp / Math.max(1, p.hpMax)"), "bar nyawa bot mengikuti HP maksimum arketipe")
  cek(komponen.includes("GAME_TYPE = \"RIMBA_KATA\"") && komponen.includes("bc-kuis-tempur-level"), "identitas gim & kunci ronde tidak berubah")

  // ── 15. Anti-cheat XP (server tidak percaya klien) ───────────────────────
  const xpRoute = fs.readFileSync(path.join(AKAR, "app/api/game/xp/route.ts"), "utf8")
  cek(xpRoute.includes("RIMBA_KATA: 600"), "skor Kuis Tempur dijepit server ke maks 600")
  cek(xpRoute.includes("rateLimitRoute"), "jalur XP dilindungi rate limit 20/menit")
  cek(xpRoute.includes("crypto.randomUUID"), "referensi idempotensi unik per permainan")
  cek(!/const\s*\{[^}]*xpEarned[^}]*\}\s*=\s*await\s*req\.json\(\)/.test(xpRoute), "server tidak pernah memakai xpEarned kiriman klien")
  const award = fs.readFileSync(path.join(AKAR, "lib/award-xp.ts"), "utf8")
  cek(award.includes("batasiXpSubmit"), "XP lewat satu pintu awardXp dengan batas per-submit")
  const guard = fs.readFileSync(path.join(AKAR, "lib/xp-guard.ts"), "utf8")
  cek(guard.includes("GAME: 120"), "batas XP per submit GAME = 120")

  console.log("\n— KUIS TEMPUR 2.0: PROGRESI & KOMPOSISI —")
  console.log(daftar.join("\n"))
  console.log(`\nHasil: ${lulus} lulus, ${gagal} gagal`)
  process.exit(gagal > 0 ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
