/**
 * QT-WORLD-01 — Tes world engine Kuis Tempur (lib/game/kuis-tempur-world).
 * Tanpa DB, tanpa DOM: murni logika + pemeriksaan file statis.
 */
import * as fs from "fs";
import * as path from "path";
import {
  WORLD_ASSETS,
  worldAssetUrl,
  runtimeAssetPool,
  seededRng,
  buildWorld,
  worldColliders,
  collidersToPixels,
} from "../lib/game/kuis-tempur-world";

let pass = 0;
let fail = 0;
function ok(cond: boolean, name: string) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

console.log("\n1. Manifest aset — kategori & URL");
{
  const kinds = Object.keys(WORLD_ASSETS);
  ok(kinds.length === 8, `8 kategori aset (${kinds.length})`);
  for (const k of kinds) {
    const files = WORLD_ASSETS[k as keyof typeof WORLD_ASSETS];
    ok(files.length > 0, `${k}: ${files.length} sprite`);
    ok(files.every((f) => f.endsWith(".png")), `${k}: semua .png`);
  }
  ok(
    worldAssetUrl("trees", "tree_01.png") === "/game/kuis-tempur/assets/world/trees/tree_01.png",
    "worldAssetUrl membangun path produksi",
  );
}

console.log("\n2. Manifest vs file fisik (QT-ASSET-02)");
{
  const root = path.join(__dirname, "..", "public", "game", "kuis-tempur", "assets", "world");
  let missing = 0;
  let total = 0;
  for (const [kind, files] of Object.entries(WORLD_ASSETS)) {
    for (const f of files) {
      total++;
      if (!fs.existsSync(path.join(root, kind, f))) { missing++; console.log(`     hilang: ${kind}/${f}`); }
    }
  }
  ok(missing === 0, `semua ${total} sprite manifest ada di disk (${missing} hilang)`);
}

console.log("\n3. seededRng — deterministik");
{
  const a = seededRng(42);
  const b = seededRng(42);
  const seqA = [a(), a(), a(), a(), a()];
  const seqB = [b(), b(), b(), b(), b()];
  ok(seqA.every((v, i) => v === seqB[i]), "seed sama → urutan sama");
  ok(seqA.every((v) => v >= 0 && v < 1), "nilai dalam [0,1)");
  const c = seededRng(43);
  ok(c() !== seqA[0], "seed beda → urutan beda");
}

console.log("\n4. buildWorld — portrait vs landscape");
{
  const portrait = buildWorld(390, 700, { seed: 7 });
  const landscape = buildWorld(1100, 600, { seed: 7 });
  ok(!portrait.landscape && portrait.aspect < 0.85, "390x700 = portrait");
  ok(landscape.landscape, "1100x600 = landscape");
  ok(landscape.objects.length > portrait.objects.length, `landscape lebih kaya (${landscape.objects.length} > ${portrait.objects.length})`);
  for (const w of [portrait, landscape]) {
    ok(w.objects.every((o) => o.x >= 0 && o.x <= 1 && o.y >= 0 && o.y <= 1), "semua posisi normalisasi 0..1");
    ok(w.objects.every((o) => ["back", "mid", "front"].includes(o.layer)), "layer valid");
    ok(w.objects.every((o) => WORLD_ASSETS[o.kind].includes(o.file)), "file obyek terdaftar di manifest");
    ok(w.terrain.path.length === 7, "jalur tanah 7 titik");
    ok(w.terrain.dots.length > 0 && w.terrain.dots.length <= 90, `bintik tekstur dibatasi (${w.terrain.dots.length})`);
  }
  const houses = portrait.objects.filter((o) => o.kind === "houses");
  ok(houses.length >= 2 && houses.length <= 4, `rumah portrait ${houses.length} (kompak)`);
  const front = landscape.objects.filter((o) => o.layer === "front");
  ok(front.length >= 2 && front.length <= 8, `foreground jarang (${front.length})`);
}

console.log("\n5. worldColliders — hanya rumah/pohon/batu");
{
  const world = buildWorld(800, 600, { seed: 11 });
  const cols = worldColliders(world);
  ok(cols.length > 0, `${cols.length} tabrakan`);
  ok(cols.every((c) => c.kind === "house" || c.kind === "tree" || c.kind === "rock"), "hanya house/tree/rock");
  const nCollide = world.objects.filter((o) => o.collides).length;
  ok(cols.length === nCollide, "satu collider per obyek collides");
  const decor = world.objects.filter((o) => ["bushes", "flowers_details", "fences", "props", "decals"].includes(o.kind));
  ok(decor.every((o) => !o.collides), "dekorasi tidak menahan gerakan");
}

console.log("\n6. collidersToPixels — bentuk legacy Rintangan");
{
  const world = buildWorld(800, 600, { seed: 11 });
  const px = collidersToPixels(worldColliders(world), 800, 600);
  ok(px.every((r) => r.jenis === "rumah" || r.jenis === "pohon" || r.jenis === "batu"), "jenis legacy");
  const rumah = px.filter((r) => r.jenis === "rumah");
  ok(rumah.every((r) => r.jenis === "rumah" && r.w > 0 && r.h > 0 && typeof r.warna === "string"), "rumah: rect + warna atap");
  // Skala proporsional saat resize: 2x kanvas → 2x piksel.
  const px2 = collidersToPixels(worldColliders(world), 1600, 1200);
  const r1 = px.find((r) => r.jenis === "rumah") as { x: number; y: number; w: number; h: number };
  const r2 = px2.find((r) => r.jenis === "rumah") as { x: number; y: number; w: number; h: number };
  ok(Math.abs(r2.x - r1.x * 2) < 0.001 && Math.abs(r2.w - r1.w * 2) < 0.001, "resize 2x → piksel 2x");
}

console.log("\n7. Determinisme dunia penuh");
{
  const a = buildWorld(800, 600, { seed: 99 });
  const b = buildWorld(800, 600, { seed: 99 });
  ok(JSON.stringify(a) === JSON.stringify(b), "seed sama → dunia identik");
  const c = buildWorld(800, 600, { seed: 100 });
  ok(JSON.stringify(a) !== JSON.stringify(c), "seed beda → dunia beda");
}

console.log("\n8. Renderer memakai world engine (statis)");
{
  const src = fs.readFileSync(path.join(__dirname, "..", "components", "game", "KuisTempurSolo.tsx"), "utf8");
  ok(src.includes("buildWorld") && src.includes("collidersToPixels"), "impor world engine");
  ok(src.includes('drawWorldLayer(ctx, world, "back"') && src.includes('drawWorldLayer(ctx, world, "front"'), "lapisan back/mid/front");
  ok(!src.includes("bangunDunia") && !src.includes("latarDepan") && !src.includes("renderLatar"), "simbol WIP rusak hilang");
  ok(!src.includes("batikRef"), "overlay batik dihapus");
  ok(!src.includes("R + 7") && !src.includes("setLineDash"), "lingkaran target/seleksi dihapus");
  ok(src.includes("drawWorldBackdrop"), "latar terrain via engine");
}

console.log("\n9. Karantina DICABUT (QT-WORLD-02 §0) — 2 file bersih aktif");
{
  ok(runtimeAssetPool("decals").includes("shadow_soft.png"), "shadow_soft kembali di pool");
  ok(runtimeAssetPool("decals").includes("flowers_scatter.png"), "flowers_scatter kembali di pool");
  ok(runtimeAssetPool("decals").length === WORLD_ASSETS.decals.length, "pool decals = manifest penuh");
  let shadow = 0;
  let scatter = 0;
  for (let s = 1; s <= 12; s++) {
    const w = buildWorld(1100, 700, { seed: s * 101 });
    for (const o of w.objects) {
      if (o.file === "shadow_soft.png") shadow++;
      if (o.file === "flowers_scatter.png") scatter++;
    }
  }
  // shadow_soft HANYA bayangan karakter (SHADOW_SOFT_URL) — bukan dekorasi
  // tanah (tampil sebagai noda raksasa bila dipasang sebagai decal).
  ok(shadow === 0, `shadow_soft bukan dekorasi (${shadow}x di 12 dunia)`);
  ok(scatter >= 1, `flowers_scatter dipakai jarang (§12) (${scatter}x di 12 dunia)`);
  // flowers_scatter dekorasi jarang — tidak mendominasi.
  ok(scatter <= 24, `flowers_scatter tidak berlebihan (${scatter}x)`);
}

console.log("\n9b. File sampah QT-ASSET-05 — tidak ada di runtime");
{
  const root = path.join(__dirname, "..", "public", "game", "kuis-tempur", "assets", "world");
  ok(!fs.existsSync(path.join(root, "decals", "flowers_scatter (1).png")), "duplikat (1).png dihapus");
  ok(!fs.existsSync(path.join(root, "terrain", "arena_base_01.png")), "arena_base_01 keluar dari runtime");
}

console.log("\n10. Elips tempur — obyek tinggi di luar arena");
{
  const inArena = (x: number, y: number, W: number, H: number) => {
    const dx = (x - W * 0.5) / (W * 0.3);
    const dy = (y - H * 0.58) / (H * 0.26);
    return dx * dx + dy * dy < 1;
  };
  let bad = 0;
  for (let s = 1; s <= 8; s++) {
    for (const [W, H] of [[390, 700], [1100, 700]] as const) {
      const w = buildWorld(W, H, { seed: s * 37 });
      for (const o of w.objects) {
        if ((o.kind === "houses" || o.kind === "trees" || o.kind === "rocks") && o.collides) {
          if (inArena(o.x * W, o.y * H, W, H)) bad++;
        }
      }
    }
  }
  ok(bad === 0, `0 penahan di elips tempur 16 dunia (${bad})`);
}

console.log("\n11. Varian berbeda + skala koheren + foreground hemat");
{
  const w = buildWorld(1100, 700, { seed: 5 });
  for (const kind of ["trees", "houses", "bushes", "rocks", "props"] as const) {
    const files = w.objects.filter((o) => o.kind === kind).map((o) => o.file);
    const uniq = new Set(files).size;
    const pool = runtimeAssetPool(kind).length;
    ok(uniq >= Math.min(files.length, pool), `${kind}: ${uniq}/${files.length} varian unik`);
  }
  const houses = w.objects.filter((o) => o.kind === "houses");
  ok(houses.every((o) => o.scale <= 1.0), "rumah tak mendominasi (scale ≤ 1.0)");
  const front = w.objects.filter((o) => o.layer === "front");
  ok(front.every((o) => o.kind === "flowers_details" || o.kind === "bushes"), "front hanya flora kecil");
  ok(front.every((o) => o.y > 0.7 && o.scale <= 1.0), "front di strip bawah & kecil");
  ok(front.length <= 5, `front hemat (${front.length})`);
}

console.log("\n12. Pagar berderet + petak terrain");
{
  let neighbor = 0;
  let total = 0;
  for (let s = 1; s <= 6; s++) {
    const w = buildWorld(1100, 700, { seed: s * 53 });
    const fences = w.objects.filter((o) => o.kind === "fences");
    for (const f of fences) {
      total++;
      const near = fences.some(
        (g) => g !== f && Math.abs(g.x - f.x) * 1100 < 80 && Math.abs(g.y - f.y) * 700 < 30,
      );
      if (near) neighbor++;
    }
  }
  ok(total > 0 && neighbor / total >= 0.6, `pagar berderet (${neighbor}/${total} punya tetangga)`);
  const w = buildWorld(1100, 700, { seed: 5 });
  ok(w.terrain.patches.length >= 4 && w.terrain.patches.length <= 7, `${w.terrain.patches.length} petak terrain`);
  ok(w.terrain.patches.every((p) => p.alpha <= 0.3), "petak terrain subtil (alpha ≤ 0.3)");
  const pool = ["grass_01.png", "grass_02.png", "mixed_01.png", "dirt_01.png", "grass_flowers.png"];
  ok(w.terrain.patches.every((p) => pool.includes(p.file)), "petak dari aset terrain");
}

console.log(`\nHasil: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
process.exit(0);
