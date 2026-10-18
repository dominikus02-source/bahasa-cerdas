// Posisi panel lonceng notifikasi (NotificationBell). Murni + mudah diuji.

export interface PanelPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export interface ViewportBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

type TriggerRect = Pick<DOMRect, "left" | "right" | "bottom">;

const PANEL_LEBAR_MAKS = 384;
const BATAS_HP = 640;

/**
 * Area layar yang benar-benar terlihat. `position: fixed` dihitung dari
 * layout viewport (tanpa scrollbar), jadi pakai `clientWidth`, lalu persempit
 * ke visualViewport (Chrome Android bisa melebarkan layout viewport bila
 * halaman meluap ke samping / di-zoom).
 */
export function bacaViewport(): ViewportBox {
  const doc = document.documentElement;
  const vv = window.visualViewport;
  const layoutWidth = doc.clientWidth || window.innerWidth;
  const layoutHeight = doc.clientHeight || window.innerHeight;
  return {
    left: vv ? vv.offsetLeft : 0,
    top: vv ? vv.offsetTop : 0,
    width: vv ? Math.min(vv.width, layoutWidth) : layoutWidth,
    height: vv ? Math.min(vv.height, layoutHeight) : layoutHeight,
  };
}

/**
 * Posisi panel lonceng: selalu utuh di dalam layar.
 * - HP (< 640px): hampir selebar layar, margin 10px kiri-kanan, di bawah top bar.
 * - Layar lebar: 384px, tepi kanan sejajar lonceng, digeser bila mentok tepi layar.
 */
export function hitungPosisiPanel(rect: TriggerRect, vp: ViewportBox): PanelPosition {
  const hp = vp.width < BATAS_HP;
  const gutter = hp ? 10 : 12;
  const ruang = Math.max(0, vp.width - gutter * 2);
  const width = hp ? ruang : Math.min(PANEL_LEBAR_MAKS, ruang);

  const minLeft = vp.left + gutter;
  const maxLeft = vp.left + vp.width - width - gutter;
  const left = hp ? minLeft : Math.min(Math.max(rect.right - width, minLeft), Math.max(minLeft, maxLeft));

  const viewBottom = vp.top + vp.height;
  const top = Math.max(vp.top + gutter, Math.min(rect.bottom + 8, viewBottom - 260));
  const maxHeight = Math.max(220, viewBottom - top - gutter);

  return { top, left, width, maxHeight };
}
