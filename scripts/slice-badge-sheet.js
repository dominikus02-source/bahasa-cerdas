/**
 * Potong contact sheet badge jadi 28 WebP transparan.
 *
 * 1. Grid dideteksi dari SATURASI (badge jenuh warna; label teks putih pucat
 *    dan latar biru-gelap saturasinya rendah).
 * 2. Tiap sel dirapatkan lagi ke bbox badge-nya sendiri.
 * 3. Latar biru-gelap dihapus dengan flood fill DARI TEPI — bukan hapus semua
 *    piksel gelap, supaya bagian gelap DI DALAM perisai tetap utuh.
 */
const sharp = require("sharp");
const { join } = require("path");

const SRC = "/Users/user/BC-Bahasa Cerdas Master/Badge BC sumber/Badges BC terbaru.png";
const OUT = "/Users/user/bahasa-cerdas/public/badges";
const WRITE = process.argv.includes("--write");
const SAT_MIN = 60;
const OUT_SIZE = 256;
const BG_SAT_MAX = 45; // di bawah ini = pucat (latar hitam / teks putih)

const CODES = [
  ["karya-1", "xp-25000", "lvl-100", "streak-100", "season-5000", "sumber-tka-500", "xp-10000"],
  ["lvl-25", "lvl-50", "streak-30", "weekly-1000", "coin-10000", "karya-50", "sumber-ukbi-500"],
  ["karya-10", "weekly-200", "season-1000", "coin-2000", "lvl-10", "sumber-jalur-500", "streak-7"],
  ["xp-5000", "xp-100", "streak-3", "xp-1000", "coin-500", "lvl-5", "hall-of-fame"],
];

const sat = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mx === 0 ? 0 : ((mx - mn) / mx) * 255;
};

function bands(mask, minLen) {
  const out = [];
  let s = -1;
  for (let i = 0; i <= mask.length; i++) {
    const on = i < mask.length && mask[i];
    if (on && s < 0) s = i;
    if (!on && s >= 0) { if (i - s >= minLen) out.push([s, i - 1]); s = -1; }
  }
  return out;
}

(async () => {
  const img = sharp(SRC).removeAlpha();
  const { width, height } = await img.metadata();
  const { data } = await img.raw().toBuffer({ resolveWithObject: true });
  const satAt = (x, y) => { const i = (y * width + x) * 3; return sat(data[i], data[i+1], data[i+2]); };

  const colMask = [], rowMask = [];
  for (let x = 0; x < width; x++) { let n = 0; for (let y = 0; y < height; y++) if (satAt(x,y) > SAT_MIN) n++; colMask.push(n > height * 0.02); }
  for (let y = 0; y < height; y++) { let n = 0; for (let x = 0; x < width; x++) if (satAt(x,y) > SAT_MIN) n++; rowMask.push(n > width * 0.02); }
  const cols = bands(colMask, 40), rows = bands(rowMask, 40);
  if (rows.length !== 4 || cols.length !== 7) {
    console.error(`GRID TIDAK SESUAI: ${rows.length}x${cols.length}`); process.exit(1);
  }
  console.log(`grid ${rows.length}x${cols.length} ok\n`);

  const serpihan = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 7; c++) {
      let [y0, y1] = rows[r];
      let [x0, x1] = cols[c];
      // Baris terakhir bersinggungan dengan bilah footer yang berwarna. Tanpa
      // dipangkas, potongannya ikut jenuh sehingga memperluas bbox dan kadang
      // menempel ke badge (lolos dari filter komponen terbesar).
      if (r === 3) y1 -= 14;

      // Rapatkan ke bbox badge di dalam sel ini.
      let nx0 = x1, nx1 = x0, ny0 = y1, ny1 = y0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (satAt(x, y) > SAT_MIN) {
          if (x < nx0) nx0 = x; if (x > nx1) nx1 = x;
          if (y < ny0) ny0 = y; if (y > ny1) ny1 = y;
        }
      }
      const pad = 3;
      x0 = Math.max(0, nx0 - pad); x1 = Math.min(width - 1, nx1 + pad);
      y0 = Math.max(0, ny0 - pad); y1 = Math.min(height - 1, ny1 + pad);
      const w = x1 - x0 + 1, h = y1 - y0 + 1;

      // Ambil piksel sel + siapkan alpha.
      const cell = await sharp(SRC).extract({ left: x0, top: y0, width: w, height: h }).ensureAlpha().raw().toBuffer();
      const px = Buffer.from(cell);

      // Latar = piksel GELAP dan PUCAT. Tepi perisai berwarna emas terang,
      // jadi fill berhenti di situ; navy gelap di dalam perisai tidak tersentuh
      // karena tidak tersambung ke tepi sel.
      // Latar DAN teks label sama-sama PUCAT (hitam sat=0, putih sat~0),
      // sedangkan tepi badge emas sat~200. Ambang kecerahan tidak dipakai:
      // teks putih kecerahannya 255 sehingga lolos dan menyisakan noda.
      // Bagian putih DI DALAM badge aman — tidak tersambung ke tepi sel.
      const isBg = (i) => sat(px[i], px[i+1], px[i+2]) < BG_SAT_MAX;

      // Flood fill dari seluruh tepi — hanya latar yang tersambung ke tepi yang
      // dihapus, jadi bayangan gelap di dalam perisai tidak ikut hilang.
      const seen = new Uint8Array(w * h);
      const stack = [];
      for (let x = 0; x < w; x++) { stack.push([x, 0]); stack.push([x, h - 1]); }
      for (let y = 0; y < h; y++) { stack.push([0, y]); stack.push([w - 1, y]); }
      while (stack.length) {
        const [x, y] = stack.pop();
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const idx = y * w + x;
        if (seen[idx]) continue;
        const i = idx * 4;
        if (!isBg(i)) continue;
        seen[idx] = 1;
        px[i + 3] = 0; // transparan
        stack.push([x+1,y]); stack.push([x-1,y]); stack.push([x,y+1]); stack.push([x,y-1]);
      }

      // Sisa serpihan (mis. potongan bilah footer yang ikut terpotong di baris
      // terakhir) masih opaque karena berwarna. Simpan hanya komponen opaque
      // TERBESAR — itu badge-nya; sisanya dibuang.
      {
        const lab = new Int32Array(w * h).fill(-1);
        let best = -1, bestSize = 0;
        for (let start = 0; start < w * h; start++) {
          if (lab[start] !== -1 || px[start * 4 + 3] === 0) continue;
          const id = start;
          let size = 0;
          const st = [start];
          lab[start] = id;
          while (st.length) {
            const cur = st.pop();
            size++;
            const cx = cur % w, cy = (cur / w) | 0;
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
              const nx = cx + dx, ny = cy + dy;
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
              const ni = ny * w + nx;
              if (lab[ni] !== -1 || px[ni * 4 + 3] === 0) continue;
              lab[ni] = id;
              st.push(ni);
            }
          }
          if (size > bestSize) { bestSize = size; best = id; }
        }
        let dibuang = 0;
        for (let i = 0; i < w * h; i++) {
          if (px[i * 4 + 3] !== 0 && lab[i] !== best) { px[i * 4 + 3] = 0; dibuang++; }
        }
        if (dibuang > 0) serpihan.push(`${CODES[r][c]}:${dibuang}px`);
      }

      const code = CODES[r][c];
      if (WRITE) {
        const side = Math.max(w, h);
        const scaled = await sharp(px, { raw: { width: w, height: h, channels: 4 } })
          .resize(Math.round((w / side) * OUT_SIZE), Math.round((h / side) * OUT_SIZE))
          .png().toBuffer();
        await sharp({ create: { width: OUT_SIZE, height: OUT_SIZE, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } })
          .composite([{ input: scaled, gravity: "center" }])
          .webp({ quality: 90, alphaQuality: 100, effort: 6 })
          .toFile(join(OUT, `${code}.webp`));
      }
      console.log(`  ${code.padEnd(18)} ${w}x${h}`);
    }
  }
  if (serpihan.length) console.log("\nserpihan dibuang: " + serpihan.join(", "));
  console.log(WRITE ? "selesai." : "(analisa saja — pakai --write)");
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
