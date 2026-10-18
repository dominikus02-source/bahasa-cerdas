/**
 * Regresi: panel lonceng notifikasi harus utuh di dalam layar (HP 360–412px & desktop).
 * Bug produksi: di HP, lonceng tidak di pojok kanan → panel bergeser keluar tepi KIRI.
 * Jalankan: npm run test:notif-panel
 */
import { hitungPosisiPanel, type ViewportBox } from "../lib/notifikasi/posisi-panel";

let gagal = 0;
function test(nama: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗"} ${nama}`);
  if (!ok) gagal++;
}

const vp = (width: number, height = 780, left = 0): ViewportBox => ({ left, top: 0, width, height });
const bell = (right: number, bottom = 48) => ({ left: right - 40, right, bottom });

for (const w of [320, 360, 390, 412]) {
  // Posisi lonceng: dekat logo (kiri), tengah, layout guru (avatar | lonceng | tema | keluar), pojok kanan.
  for (const r of [96, 180, w - 108, w - 16]) {
    const p = hitungPosisiPanel(bell(r), vp(w));
    const nama = `HP ${w}px, lonceng kanan=${r}`;
    test(`${nama}: tidak keluar tepi kiri (left=${p.left})`, p.left >= 8);
    test(`${nama}: tidak keluar tepi kanan (kanan=${p.left + p.width})`, p.left + p.width <= w - 8);
    test(`${nama}: hampir selebar layar (margin 8–12px)`, p.left <= 12 && w - (p.left + p.width) <= 12);
    test(`${nama}: di bawah top bar`, p.top >= 48);
  }
}

{
  const p = hitungPosisiPanel(bell(1330), vp(1440, 900));
  test(`desktop 1440: lebar 384`, p.width === 384);
  test(`desktop 1440: tepi kanan sejajar lonceng`, p.left + p.width === 1330);
  test(`desktop 1440: di bawah lonceng`, p.top === 56);
}
{
  const p = hitungPosisiPanel(bell(300), vp(1024, 768));
  test(`desktop 1024, lonceng di kiri: tidak keluar tepi kiri`, p.left >= 12);
}
{
  // Chrome Android: layout viewport melebar / visual viewport digeser.
  const p = hitungPosisiPanel(bell(250), vp(360, 700, 40));
  test(`visualViewport bergeser 40px: panel ikut area terlihat`, p.left === 50 && p.left + p.width === 390);
}
{
  const p = hitungPosisiPanel(bell(300, 48), vp(360, 400));
  test(`layar pendek: tinggi panel tidak melewati bawah layar`, p.top + p.maxHeight <= 400 || p.maxHeight === 220);
}

if (gagal) {
  console.error(`\n${gagal} uji gagal`);
  process.exit(1);
}
console.log("\nSemua uji posisi panel notifikasi lulus");
