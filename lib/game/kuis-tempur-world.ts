// Kuis Tempur — World Engine (QT-WORLD-01).
//
// Pemisahan WORLD DATA vs WORLD VISUALS:
// - WORLD DATA  : WorldState (posisi normalisasi 0..1, varian, layer, tabrakan).
// - WORLD VISUALS: drawWorldBackdrop + drawWorldLayer (membaca WorldState +
//   sprite di public/game/kuis-tempur/assets/world/<kind>/<file>).
//
// Mengganti "tree placeholder" dengan "tree_final.png" TIDAK perlu mengubah
// logika gim — cukup timpa berkasnya (nama sama) atau tambah nama ke
// WORLD_ASSETS di bawah.
//
// Murni (tanpa DOM/React/DB) supaya bisa diuji: scripts/test-kuis-tempur-world.ts.
// Sprite digambar bila Image-nya sudah termuat; bila belum, fallback prosedural
// sederhana dipakai supaya frame pertama tetap aman.

export type WorldKind =
  | "terrain"
  | "trees"
  | "houses"
  | "bushes"
  | "rocks"
  | "fences"
  | "flowers_details"
  | "props"
  | "decals"

export type WorldLayer = "back" | "mid" | "front"

/** Akar URL sprite dunia (hasil organisasi QT-ASSET-02). */
export const WORLD_ASSET_BASE = "/game/kuis-tempur/assets/world"

/**
 * Manifest sprite per kategori — nama berkas yang secara fisik ada di
 * public/game/kuis-tempur/assets/world/<kind>/. Aset final nanti cukup
 * menimpa/menambah di sini tanpa menyentuh logika gim.
 */
export const WORLD_ASSETS: Record<Exclude<WorldKind, "terrain">, string[]> = {
  trees: [
    "tree_01.png", "tree_02.png", "tree_03.png", "tree_04.png", "tree_05.png",
    "tree_small.png", "tree_tall.png", "tree_wide.png", "tree_palm.png",
    "tree_bush_yellow.png",
  ],
  houses: ["house_01.png", "house_02.png", "house_03.png", "house_04.png"],
  bushes: [
    "bush_01.png", "bush_02.png", "bush_04.png", "bush_05.png",
    "bush_06.png", "bush_07.png", "bush_08.png", "bush_flower.png",
  ],
  rocks: [
    "rock_01.png", "rock_02.png", "rock_03.png", "rock_04.png",
    "rock_small.png", "rock_cluster.png", "rock_moss.png", "rock_stack.png",
  ],
  fences: [
    "fence_01.png", "fence_02.png", "fence_03.png",
    "fence_broken.png", "fence_corner.png", "fence_gate.png",
  ],
  flowers_details: [
    "flower_01.png", "flower_02.png", "flower_03.png", "flower_04.png",
    "flower_red.png", "flower_blue.png", "flower_mix.png", "grass_clump.png",
  ],
  props: [
    "sign_wood.png", "sign_direction.png", "barrel.png", "crate.png",
    "hay_stack.png", "well.png", "lamp_post.png", "stump.png",
    "log.png", "cart.png",
  ],
  decals: [
    "grass_patch_01.png", "grass_patch_02.png", "dirt_patch.png",
    "stone_patch.png", "leaves.png", "flowers_scatter.png",
    "footprint.png", "shadow_soft.png",
  ],
}

export function worldAssetUrl(kind: WorldKind, file: string): string {
  return `${WORLD_ASSET_BASE}/${kind}/${file}`
}

/**
 * Karantina runtime (QT-ASSET-04) DICABUT di QT-WORLD-02: kedua berkas
 * (decals/shadow_soft.png, decals/flowers_scatter.png) sudah diganti file
 * bersih terverifikasi (gate QT-ASSET-05 PASS). Set dikosongkan tetapi
 * mekanismenya dipertahankan untuk insiden aset di masa depan.
 */
const QUARANTINED_ASSETS = new Set<string>([
  // contoh: "decals/contoh-rusak.png",
])

/** Kolam file siap pakai per kategori (manifest minus karantina). */
export function runtimeAssetPool(kind: Exclude<WorldKind, "terrain">): string[] {
  return WORLD_ASSETS[kind].filter((f) => !QUARANTINED_ASSETS.has(`${kind}/${f}`))
}

export interface WorldObject {
  id: string
  kind: Exclude<WorldKind, "terrain">
  /** Nama berkas sprite. null = pakai fallback prosedural. */
  file: string
  /** Posisi normalisasi 0..1 (titik tanah/di bawah obyek). */
  x: number
  y: number
  scale: number
  layer: WorldLayer
  shadow: boolean
  /** Warna atap rumah (fallback + identitas visual), bila relevan. */
  tint: string | null
  /** true = menahan gerakan & peluru (rumah/pohon/batu). */
  collides: boolean
  /** Bentuk tabrakan dalam satuan normalisasi (relatif W/H). */
  shape:
    | { type: "circle"; rN: number }
    | { type: "rect"; xN: number; yN: number; wN: number; hN: number }
    | null
}

export interface WorldTerrainPatch {
  file: string
  x: number
  y: number
  /** Diameter px saat dibangun (diskalakan proporsional saat resize). */
  sizeN: number
  alpha: number
}

export interface WorldTerrain {
  sky: string
  groundTop: string
  groundBottom: string
  /** Garis horizon dalam satuan normalisasi (y 0..1). */
  horizonN: number
  /** Jalur tanah berliku (titik normalisasi), digambar di bawah obyek. */
  path: { x: number; y: number }[]
  /** Bintik tekstur halus di bawah horizon (dibatasi jumlahnya). */
  dots: { x: number; y: number; s: number; a: number }[]
  /** Petak variasi tanah dari aset terrain/ (alpha rendah, anti repetisi). */
  patches: WorldTerrainPatch[]
}

export interface WorldState {
  seed: number
  /** Rasio W/H saat dibangun. */
  aspect: number
  landscape: boolean
  terrain: WorldTerrain
  objects: WorldObject[]
}

/** Tabrakan dalam satuan normalisasi — dipetakan ke piksel saat dipakai. */
export type WorldCollider =
  | { kind: "house"; xN: number; yN: number; wN: number; hN: number; tint: string }
  | { kind: "tree" | "rock"; xN: number; yN: number; rN: number }

/** RNG deterministik (mulberry32) — dunia bisa dibangun ulang dari seed. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ROOF_COLORS = ["#EF4444", "#F97316", "#0EA5E9", "#8B5CF6", "#14B8A6"]

// Ukuran visual acuan (px pada min-dim 500px) per kategori.
const BASE_SIZE: Record<Exclude<WorldKind, "terrain">, number> = {
  trees: 96,
  houses: 120,
  bushes: 48,
  rocks: 40,
  fences: 72,
  flowers_details: 24,
  props: 60,
  decals: 76,
}

export function worldSpriteSize(kind: Exclude<WorldKind, "terrain">, scale: number, minDim: number): number {
  const k = Math.min(1.3, Math.max(0.7, minDim / 500))
  return BASE_SIZE[kind] * scale * k
}

interface BuildOpts {
  seed?: number
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

/**
 * Elips arena tempur (tengah-bawah): obyek TINGGI (rumah/pohon/batu) dan
 * pagar dilarang masuk agar area tempur selalu terbuka. Dekorasi rendah
 * (bunga/decal) boleh lebih dekat. Semua dalam piksel kanvas bangun.
 */
function combatEllipse(W: number, H: number, margin: number): { cx: number; cy: number; rx: number; ry: number } {
  return { cx: W * 0.5, cy: H * 0.58, rx: W * 0.3 + margin, ry: H * 0.26 + margin }
}

function inEllipse(x: number, y: number, e: { cx: number; cy: number; rx: number; ry: number }): boolean {
  const dx = (x - e.cx) / e.rx
  const dy = (y - e.cy) / e.ry
  return dx * dx + dy * dy < 1
}

/**
 * Pagar dipasang BERDERET (2–4 segmen sebaris horizontal) di tepi desa,
 * bukan satuan acak — memberi kesan batas kampung & jalur.
 */
function placeFenceRuns(
  rng: () => number,
  W: number,
  H: number,
  objects: WorldObject[],
  taken: { x: number; y: number; r: number }[],
  bebas: (x: number, y: number, r: number) => boolean,
  id: (kind: string) => string,
  runs: number,
): void {
  const pool = runtimeAssetPool("fences")
  if (pool.length === 0) return
  const deck = [...pool].sort(() => rng() - 0.5)
  let di = 0
  for (let r = 0; r < runs; r++) {
    const n = 2 + Math.floor(rng() * 3)
    const scale = 0.85 + rng() * 0.2
    const segW = 52 * scale
    // Jangkar di kiri/kanan arena (batas kampung), di luar elips tempur.
    const left = rng() < 0.5
    const ax = left ? 20 + rng() * W * 0.12 : W * 0.88 - rng() * W * 0.12
    const ay = H * 0.35 + rng() * H * 0.45
    // Segmen se-deret TIDAK saling memblokir (jarak antar-segmen < radius
    // bebas); hanya jangkar yang diuji terhadap dunia yang sudah ada.
    const baseLen = taken.length
    const bebasRun = (x: number, y: number) =>
      Math.hypot(x - W / 2, y - H / 2) > Math.min(W, H) * 0.2 &&
      !taken.slice(0, baseLen).some((t) => Math.hypot(x - t.x, y - t.y) < 30 * scale + t.r)
    const run: { x: number; y: number }[] = []
    for (let i = 0; i < n; i++) {
      const x = left ? ax + i * segW : ax - i * segW
      const y = ay + (rng() - 0.5) * 10
      if (x < 10 || x > W - 10 || y < 60 || y > H - 60) continue
      if (!bebasRun(x, y)) continue
      run.push({ x, y })
    }
    if (run.length < 2) continue
    for (const s of run) {
      taken.push({ x: s.x, y: s.y, r: 30 * scale })
      objects.push({
        id: id("fences"), kind: "fences", file: deck[di++ % deck.length],
        x: s.x / W, y: s.y / H, scale, layer: "mid",
        shadow: false, tint: null, collides: false, shape: null,
      })
    }
  }
}

/**
 * Bangun dunia dari dimensi kanvas aktual. Portrait = kompak & sedikit obyek;
 * landscape = lega & kaya obyek. Semua posisi dinormalisasi 0..1 sehingga
 * resize tidak merusak komposisi (tabrakan dihitung ulang via collidersToPixels).
 *
 * Komposisi disengaja (bukan galeri acak): pohon/rumah bias ke tepi,
 * semak & batu berkelompok, pagar dipasang berderet, bunga di sisi jalur,
 * tengah arena selalu terbuka.
 */
export function buildWorld(W: number, H: number, opts: BuildOpts = {}): WorldState {
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000_000)
  const rng = seededRng(seed)
  const aspect = W / Math.max(1, H)
  const landscape = aspect >= 0.85
  const minDim = Math.min(W, H)

  // Area tengah dikosongkan untuk spawn (radius 0.20 × min-dim).
  const clearR = minDim * 0.2
  const cx = W / 2
  const cy = H / 2
  const taken: { x: number; y: number; r: number }[] = []
  const jauhDariTengah = (x: number, y: number) => Math.hypot(x - cx, y - cy) > clearR
  const bebas = (x: number, y: number, r: number) =>
    jauhDariTengah(x, y) && !taken.some((t) => Math.hypot(x - t.x, y - t.y) < r + t.r)

  // Elips tempur: larangan obyek tinggi di tengah.
  const arenaTall = combatEllipse(W, H, 0)
  const arenaLow = combatEllipse(W, H, -Math.min(W, H) * 0.08)

  const objects: WorldObject[] = []
  let seq = 0
  const id = (kind: string) => `${kind}-${seq++}`

  /** Titik bias tepi: 65% di sabuk perimeter, sisanya di mana saja. */
  const edgePoint = (): { x: number; y: number } => {
    if (rng() < 0.65) {
      const side = Math.floor(rng() * 4)
      if (side === 0) return { x: 16 + rng() * W * 0.14, y: H * 0.15 + rng() * H * 0.7 }
      if (side === 1) return { x: W * 0.86 + rng() * (W * 0.14 - 16), y: H * 0.15 + rng() * H * 0.7 }
      if (side === 2) return { x: rng() * W, y: H * 0.3 + rng() * H * 0.12 }
      return { x: rng() * W, y: H * 0.88 + rng() * (H * 0.12 - 40) }
    }
    return { x: 16 + rng() * (W - 32), y: groundYMin + rng() * (H - groundYMin - 70) }
  }

  // Obyek mid/front berpijak di bawah horizon (0.42H); hanya layer back
  // yang boleh jadi siluet langit. Mencegah prop "melayang" di langit.
  const groundYMin = Math.max(60, H * 0.42)

  interface PlaceOpts {
    layer: WorldLayer
    scaleMin: number
    scaleMax: number
    pxR: number
    collides: "circle" | "rect" | null
    count: number
    /** true = bias ke tepi; angka = peluang menempel kelompok sejenis. */
    edge?: boolean
    cluster?: number
    /** true = dilarang masuk elips tempur (obyek tinggi). */
    avoidArena?: boolean
    /** Batas bawah y (foreground bawah). */
    yMinFrac?: number
    yMaxFrac?: number
    /**
     * Berkas yang dikecualikan dari undian varian (tetap di manifest).
     * Dipakai untuk shadow_soft: ia aset bayangan karakter, bukan dekorasi
     * tanah — sebagai decal ia tampil sebagai noda gelap raksasa.
     */
    exclude?: string[]
  }

  const taruh = (kind: WorldObject["kind"], o: PlaceOpts) => {
    // Varian berbeda tanpa pengulangan selama jumlah <= berkas (anti copy/paste).
    const pool = runtimeAssetPool(kind).filter((f) => !(o.exclude ?? []).includes(f))
    if (pool.length === 0) return
    const deck: string[] = []
    for (let i = 0; pool.length > 0 && i < o.count * 2; i++) {
      const p = [...pool].sort(() => rng() - 0.5)
      deck.push(...p)
    }
    let placed = 0
    let guard = 0
    while (placed < o.count && guard++ < o.count * 30) {
      const scale = o.scaleMin + rng() * (o.scaleMax - o.scaleMin)
      let x: number
      let y: number
      if (o.cluster && objects.length > 0) {
        // Menempel pada obyek sejenis yang sudah ada.
        const same = objects.filter((v) => v.kind === kind)
        if (same.length > 0 && rng() < o.cluster) {
          const s = same[Math.floor(rng() * same.length)]
          const a = rng() * Math.PI * 2
          const d = 40 + rng() * 50
          x = s.x * W + Math.cos(a) * d
          y = s.y * H + Math.sin(a) * d
        } else {
          const p = o.edge ? edgePoint() : { x: 16 + rng() * (W - 32), y: groundYMin + rng() * (H - groundYMin - 70) }
          x = p.x
          y = p.y
        }
      } else {
        const p = o.edge ? edgePoint() : { x: 16 + rng() * (W - 32), y: groundYMin + rng() * (H - groundYMin - 70) }
        x = p.x
        y = p.y
      }
      if (o.yMinFrac !== undefined && y < H * o.yMinFrac) continue
      if (o.yMaxFrac !== undefined && y > H * o.yMaxFrac) continue
      // Jepit ke dalam kanvas DULU (offset kelompok bisa keluar batas),
      // validitas (jarak/elips) tetap diuji setelahnya.
      x = Math.min(Math.max(x, 12), W - 12)
      y = Math.min(Math.max(y, 50), H - 50)
      if (!bebas(x, y, o.pxR * scale)) continue
      if (o.avoidArena && inEllipse(x, y, arenaTall)) continue
      if (!o.avoidArena && kind !== "flowers_details" && kind !== "decals" && inEllipse(x, y, arenaLow)) continue
      taken.push({ x, y, r: o.pxR * scale })
      const file = deck[placed % deck.length]
      const tint = kind === "houses" ? pick(rng, ROOF_COLORS) : null
      let shape: WorldObject["shape"] = null
      if (o.collides === "circle") {
        shape = { type: "circle", rN: (o.pxR * scale) / minDim }
      } else if (o.collides === "rect") {
        const w = (52 + rng() * 40) * scale
        const h = (40 + rng() * 24) * scale
        shape = { type: "rect", xN: (x - w / 2) / W, yN: (y - h) / H, wN: w / W, hN: h / H }
      }
      objects.push({
        id: id(kind), kind, file,
        x: x / W, y: y / H, scale, layer: o.layer,
        shadow: o.collides !== null || kind === "props",
        tint, collides: o.collides !== null, shape,
      })
      placed++
    }
  }

  // ── VILLAGE MEADOW COMPOSITION ───────────────────────────────────────
  // Layout: kiri = desa (rumah, pagar, barrel), kanan = pepohonan,
  // tengah = padang tempur terbuka, bawah = foreground framing,
  // atas = pepohonan jauh + rumah desa.
  //
  // Rumah: 2 di kiri (desa), 1 di kanan atas (terpencil), 1 di atas tengah.
  // Pohon: kanan lebih padat (hutan pinggir), kiri sedang (dekat desa).
  // Batu: tersebar di tepi, cluster kecil.
  // Pagar: berderet kiri (batas desa) & kanan (batas hutan).

  // ── LEFT VILLAGE ZONE (houses + fences + props) ──
  taruh("houses", {
    layer: "mid", scaleMin: 0.85, scaleMax: 1.0, pxR: 46, collides: "rect",
    count: landscape ? 2 : 2, avoidArena: true,
    edge: true,
  })
  // ── RIGHT TREE ZONE (dense forest edge) ──
  taruh("houses", {
    layer: "mid", scaleMin: 0.75, scaleMax: 0.9, pxR: 46, collides: "rect",
    count: landscape ? 1 : 1, avoidArena: true,
    edge: true,
  })
  // ── TOP CENTER house (distant village) ──
  taruh("houses", {
    layer: "back", scaleMin: 0.55, scaleMax: 0.7, pxR: 46, collides: "rect",
    count: landscape ? 1 : 0, edge: true,
  })

  // ── TREES — right side denser (forest), left moderate (near village) ──
  // Mid-layer trees (gameplay obstacles)
  taruh("trees", {
    layer: "mid", scaleMin: 0.85, scaleMax: 1.1, pxR: 20, collides: "circle",
    count: landscape ? 10 : 6, edge: true, avoidArena: true,
  })
  // Back-layer trees (distant silhouettes, no collision)
  taruh("trees", {
    layer: "back", scaleMin: 0.4, scaleMax: 0.65, pxR: 18, collides: null,
    count: landscape ? 6 : 4, edge: true,
  })

  // ── ROCKS — natural scatter at perimeter ──
  taruh("rocks", {
    layer: "mid", scaleMin: 0.8, scaleMax: 1.1, pxR: 16, collides: "circle",
    count: landscape ? 5 : 3, edge: true, cluster: 0.4, avoidArena: true,
  })

  // ── BUSHES — transition zone between clearing and edges ──
  taruh("bushes", {
    layer: "mid", scaleMin: 0.8, scaleMax: 1.1, pxR: 16, collides: null,
    count: landscape ? 8 : 5, edge: true, cluster: 0.45,
  })
  // Foreground bushes (bottom framing only)
  taruh("bushes", {
    layer: "front", scaleMin: 0.7, scaleMax: 1.0, pxR: 20, collides: null,
    count: 2, yMinFrac: 0.80,
  })

  // ── FLOWERS — scattered, not clustered ──
  taruh("flowers_details", {
    layer: "mid", scaleMin: 0.8, scaleMax: 1.2, pxR: 8, collides: null,
    count: landscape ? 12 : 7,
  })
  taruh("flowers_details", {
    layer: "front", scaleMin: 0.8, scaleMax: 1.0, pxR: 8, collides: null,
    count: 2, yMinFrac: 0.80,
  })

  // ── FENCES — village boundary left, forest boundary right ──
  placeFenceRuns(rng, W, H, objects, taken, bebas, id, landscape ? 3 : 2)

  // ── PROPS — barrels, crates, well near village ──
  taruh("props", {
    layer: "mid", scaleMin: 0.85, scaleMax: 1.0, pxR: 26, collides: null,
    count: landscape ? 6 : 4, edge: true,
  })

  // ── DECALS — ground texture (shadow_soft excluded, flowers_scatter sparse) ──
  taruh("decals", {
    layer: "mid", scaleMin: 0.8, scaleMax: 1.3, pxR: 20, collides: null,
    count: landscape ? 10 : 6, exclude: ["shadow_soft.png"],
  })

  // ── PATH — natural village path from bottom-right toward village (left) ──
  // The path curves gently: starts lower-right, bends through the clearing,
  // and leads toward the left-side village cluster. Not a zig-zag.
  const path: { x: number; y: number }[] = []
  const pathBase = 0.55 + rng() * 0.15 // start x (right of center)
  for (let i = 0; i <= 6; i++) {
    const t = i / 6
    // Gentle curve: starts right (0.6–0.7), ends left (0.25–0.35)
    const x = pathBase - t * 0.38 + Math.sin(t * Math.PI) * 0.08
    const y = 1.02 - i * 0.12
    path.push({ x: Math.max(0.1, Math.min(0.9, x)), y })
  }

  // Bintik tekstur halus — sedikit, di bawah horizon saja (keterbacaan).
  const dots: WorldTerrain["dots"] = []
  const nDots = landscape ? 90 : 55
  for (let i = 0; i < nDots; i++) {
    dots.push({
      x: rng(), y: 0.32 + rng() * 0.66,
      s: 2 + rng() * 9, a: 0.04 + rng() * 0.05,
    })
  }

  // Petak variasi tanah: 4–5 tile terrain (rumput/campur/tanah) digambar
  // BESAR dengan alpha rendah sebagai corak tanah — bukan ubin berulang.
  // Dimulai lebih tinggi (y≈0.28) supaya transisi krem→hijau tertutup
  // petak organik, bukan garis gradien tajam. Tetap di luar elips tempur.
  const patchFiles = ["grass_01.png", "grass_02.png", "mixed_01.png", "dirt_01.png", "grass_flowers.png"]
  const patches: WorldTerrainPatch[] = []
  const nPatches = landscape ? 7 : 5
  for (let i = 0; i < nPatches; i++) {
    for (let c = 0; c < 20; c++) {
      const size = minDim * (0.35 + rng() * 0.25)
      const x = rng() * W
      const y = H * 0.28 + rng() * H * 0.65
      if (Math.hypot(x - cx, y - cy) < clearR + size * 0.4) continue
      if (inEllipse(x, y, arenaTall)) continue
      patches.push({
        file: patchFiles[i % patchFiles.length],
        x: x / W, y: y / H, sizeN: size / minDim, alpha: 0.22 + rng() * 0.08,
      })
      break
    }
  }

  return {
    seed, aspect, landscape,
    terrain: {
      sky: "#FFE9C4",
      groundTop: "#8FBE5A",
      groundBottom: "#5E9337",
      horizonN: 0.42,
      path, dots, patches,
    },
    objects,
  }
}

/** Ambil daftar tabrakan (normalisasi) dari dunia. */
export function worldColliders(world: WorldState): WorldCollider[] {
  const out: WorldCollider[] = []
  for (const o of world.objects) {
    if (!o.collides || !o.shape) continue
    if (o.shape.type === "rect" && o.kind === "houses") {
      out.push({
        kind: "house",
        xN: o.shape.xN, yN: o.shape.yN, wN: o.shape.wN, hN: o.shape.hN,
        tint: o.tint ?? ROOF_COLORS[0],
      })
    } else if (o.shape.type === "circle" && (o.kind === "trees" || o.kind === "rocks")) {
      out.push({ kind: o.kind === "trees" ? "tree" : "rock", xN: o.x, yN: o.y, rN: o.shape.rN })
    }
  }
  return out
}

/**
 * Petakan tabrakan normalisasi ke piksel kanvas saat ini — bentuknya SAMA
 * dengan Rintangan lama ({rumah|pohon|batu}) sehingga kenaRintangan,
 * dorongKeluar, dan penahan peluru bekerja tanpa perubahan.
 */
export function collidersToPixels(
  colliders: WorldCollider[],
  W: number,
  H: number,
): (
  | { jenis: "rumah"; x: number; y: number; w: number; h: number; warna: string }
  | { jenis: "pohon"; x: number; y: number; r: number }
  | { jenis: "batu"; x: number; y: number; r: number }
)[] {
  const minDim = Math.min(W, H)
  return colliders.map((c) => {
    if (c.kind === "house") {
      return {
        jenis: "rumah" as const,
        x: c.xN * W, y: c.yN * H, w: c.wN * W, h: c.hN * H,
        warna: c.tint,
      }
    }
    return {
      jenis: (c.kind === "tree" ? "pohon" : "batu") as "pohon" | "batu",
      x: c.xN * W, y: c.yN * H, r: c.rN * minDim,
    }
  })
}

// ─── IMAGE STORE (WORLD VISUALS) ────────────────────────────────────────────
// Dimuat sekali per URL lalu dipakai ulang semua obyek sejenis. Aman dipakai
// di luar React (hanya canvas); tidak menyentuh DOM selain `new Image()`.

const imageCache = new Map<string, HTMLImageElement>()

function cachedImage(url: string): HTMLImageElement | null {
  if (typeof window === "undefined") return null
  let img = imageCache.get(url)
  if (!img) {
    img = new Image()
    img.src = url
    imageCache.set(url, img)
  }
  return img
}

/** Muat semua sprite yang dipakai dunia (fire-and-forget; fallback menutup). */
export function preloadWorldImages(world: WorldState): void {
  if (typeof window === "undefined") return
  const seen = new Set<string>()
  for (const o of world.objects) {
    const url = worldAssetUrl(o.kind, o.file)
    if (!seen.has(url)) {
      seen.add(url)
      cachedImage(url)
    }
  }
}

function imageReady(img: HTMLImageElement | null): img is HTMLImageElement {
  return !!img && img.complete && img.naturalWidth > 0
}

/** URL bayangan kontak karakter (QT-WORLD-02 §11). */
export const SHADOW_SOFT_URL = worldAssetUrl("decals", "shadow_soft.png")

/**
 * Akses Image cache untuk pemakaian di luar drawWorldLayer (mis. bayangan
 * karakter di renderer). Lazy-load + dipakai ulang; JANGAN new Image per frame.
 */
export function getWorldImage(url: string): HTMLImageElement | null {
  return cachedImage(url)
}

export function isWorldImageReady(img: HTMLImageElement | null): img is HTMLImageElement {
  return imageReady(img)
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  // Shadow sits 1px below object base for natural grounding.
  // Elongated horizontally, compressed vertically — soft contact shadow.
  ctx.fillStyle = "rgba(0,0,0,0.18)"
  ctx.beginPath()
  ctx.ellipse(x, y + 1, w / 2, Math.max(2, w * 0.10), 0, 0, Math.PI * 2)
  ctx.fill()
}

/** Fallback prosedural bila sprite belum termuat — sederhana & tidak ramai. */
function drawFallback(
  ctx: CanvasRenderingContext2D,
  o: WorldObject,
  x: number,
  y: number,
  size: number,
): void {
  const s = size
  switch (o.kind) {
    case "trees": {
      ctx.fillStyle = "#78350F"
      ctx.fillRect(x - s * 0.045, y - s * 0.42, s * 0.09, s * 0.42)
      ctx.fillStyle = "#2F7D32"
      ctx.beginPath(); ctx.arc(x, y - s * 0.52, s * 0.32, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "#43A047"
      ctx.beginPath(); ctx.arc(x - s * 0.1, y - s * 0.62, s * 0.19, 0, Math.PI * 2); ctx.fill()
      break
    }
    case "houses": {
      const w = s * 1.05
      const h = s * 0.72
      ctx.fillStyle = "#FEF3C7"
      ctx.fillRect(x - w / 2, y - h, w, h)
      ctx.fillStyle = o.tint ?? "#EF4444"
      ctx.beginPath()
      ctx.moveTo(x - w / 2 - 4, y - h + 4)
      ctx.lineTo(x, y - h - s * 0.3)
      ctx.lineTo(x + w / 2 + 4, y - h + 4)
      ctx.closePath(); ctx.fill()
      ctx.fillStyle = "#92400E"
      ctx.fillRect(x - s * 0.08, y - h * 0.52, s * 0.16, h * 0.52)
      break
    }
    case "rocks": {
      ctx.fillStyle = "#78909C"
      ctx.beginPath(); ctx.arc(x, y - s * 0.2, s * 0.3, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "#B0BEC5"
      ctx.beginPath(); ctx.arc(x - s * 0.09, y - s * 0.3, s * 0.13, 0, Math.PI * 2); ctx.fill()
      break
    }
    case "bushes": {
      ctx.fillStyle = "#388E3C"
      ctx.beginPath(); ctx.ellipse(x, y - s * 0.16, s * 0.34, s * 0.22, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "#66BB6A"
      ctx.beginPath(); ctx.ellipse(x - s * 0.1, y - s * 0.24, s * 0.16, s * 0.1, 0, 0, Math.PI * 2); ctx.fill()
      break
    }
    case "flowers_details": {
      ctx.fillStyle = "#F9A825"
      ctx.beginPath(); ctx.arc(x, y - s * 0.2, s * 0.07, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "#FCE4EC"
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(x + Math.cos(a) * s * 0.11, y - s * 0.2 + Math.sin(a) * s * 0.11, s * 0.07, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.strokeStyle = "#388E3C"
      ctx.lineWidth = Math.max(1, s * 0.04)
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s * 0.14); ctx.stroke()
      break
    }
    case "fences": {
      ctx.fillStyle = "#8D6E63"
      ctx.fillRect(x - s * 0.42, y - s * 0.4, s * 0.07, s * 0.4)
      ctx.fillRect(x + s * 0.35, y - s * 0.4, s * 0.07, s * 0.4)
      ctx.fillRect(x - s * 0.46, y - s * 0.34, s * 0.92, s * 0.07)
      ctx.fillRect(x - s * 0.46, y - s * 0.18, s * 0.92, s * 0.07)
      break
    }
    case "props": {
      ctx.fillStyle = "#A1887F"
      ctx.fillRect(x - s * 0.22, y - s * 0.4, s * 0.44, s * 0.4)
      ctx.strokeStyle = "#6D4C41"
      ctx.lineWidth = Math.max(1, s * 0.04)
      ctx.strokeRect(x - s * 0.22, y - s * 0.4, s * 0.44, s * 0.4)
      ctx.beginPath(); ctx.moveTo(x - s * 0.22, y - s * 0.4); ctx.lineTo(x + s * 0.22, y); ctx.stroke()
      break
    }
    case "decals": {
      ctx.fillStyle = "rgba(46, 90, 30, 0.28)"
      ctx.beginPath(); ctx.ellipse(x, y - 2, s * 0.4, s * 0.14, 0, 0, Math.PI * 2); ctx.fill()
      break
    }
  }
}

/** Latar: langit hangat di atas horizon + tanah gradien + jalur + bintik. */
export function drawWorldBackdrop(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  W: number,
  H: number,
): void {
  const t = world.terrain
  const horizon = t.horizonN * H
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, t.sky)
  g.addColorStop(Math.max(0, t.horizonN - 0.28), "#E8D9A5")
  g.addColorStop(Math.max(0, t.horizonN - 0.12), "#B5CC7A")
  g.addColorStop(t.horizonN - 0.04, t.groundTop)
  g.addColorStop(t.horizonN + 0.08, t.groundTop)
  g.addColorStop(0.78, "#6EAA42")
  g.addColorStop(1, t.groundBottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // Petak variasi tanah dari aset terrain/ — alpha rendah, tepi ubin
  // menyamar di atas gradien. Aset TIDAK diubah (hanya cara gambar).
  const minDim = Math.min(W, H)
  for (const p of t.patches) {
    const img = cachedImage(worldAssetUrl("terrain", p.file))
    if (!imageReady(img)) continue
    const size = p.sizeN * minDim
    ctx.globalAlpha = p.alpha
    ctx.drawImage(img, p.x * W - size / 2, p.y * H - size / 2, size, size)
    ctx.globalAlpha = 1
  }

  // Jalur tanah berliku.
  if (t.path.length > 1) {
    ctx.strokeStyle = "rgba(222, 184, 135, 0.55)"
    ctx.lineCap = "round"
    ctx.lineWidth = Math.max(10, Math.min(W, H) * 0.045)
    ctx.beginPath()
    t.path.forEach((p, i) => {
      const x = p.x * W
      const y = p.y * H
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
    ctx.strokeStyle = "rgba(240, 214, 170, 0.5)"
    ctx.lineWidth = Math.max(4, Math.min(W, H) * 0.018)
    ctx.stroke()
  }

  // Bintik tekstur halus.
  for (const d of t.dots) {
    ctx.fillStyle = `rgba(255,255,255,${d.a.toFixed(3)})`
    ctx.fillRect(d.x * W, d.y * H, d.s, d.s)
  }
}

/**
 * Gambar satu lapisan dunia (back/mid/front). Urutan panggil di renderer:
 * back → mid → entitas (pemain/musuh) → front. Di dalam lapisan diurut
 * berdasarkan y supaya yang lebih bawah tampil di depan (kedalaman semu).
 */
export function drawWorldLayer(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  layer: WorldLayer,
  W: number,
  H: number,
): void {
  const minDim = Math.min(W, H)
  const objs = world.objects
    .filter((o) => o.layer === layer)
    .sort((a, b) => a.y - b.y)
  for (const o of objs) {
    const x = o.x * W
    const y = o.y * H
    const size = worldSpriteSize(o.kind, o.scale, minDim)
    if (x < -size || x > W + size || y < -size * 1.6 || y > H + size) continue
    const alpha = layer === "back" ? 0.85 : layer === "front" ? 0.92 : 1
    ctx.globalAlpha = alpha
    if (o.shadow) drawShadow(ctx, x, y, size * (o.kind === "houses" ? 1.0 : 0.7))
    const img = cachedImage(worldAssetUrl(o.kind, o.file))
    if (imageReady(img)) {
      const iw = img.naturalWidth
      const ih = img.naturalHeight
      const h = size * (o.kind === "houses" ? 0.95 : 1.15)
      const w = (h * iw) / Math.max(1, ih)
      ctx.drawImage(img, x - w / 2, y - h, w, h)
    } else {
      drawFallback(ctx, o, x, y, size)
    }
    ctx.globalAlpha = 1
  }
}
