/** Registrasi per tile: track yang sama bisa tampil di fokus dan strip. */
export class VisibleTracks {
  private readonly tiles = new Map<string, Set<symbol>>();
  constructor(private readonly changed: () => void) {}
  has(sid: string): boolean { return (this.tiles.get(sid)?.size ?? 0) > 0; }
  set(sid: string, tile: symbol, visible: boolean): void {
    const before = this.has(sid);
    const entries = this.tiles.get(sid) ?? new Set<symbol>();
    if (visible) entries.add(tile); else entries.delete(tile);
    if (entries.size) this.tiles.set(sid, entries); else this.tiles.delete(sid);
    if (before !== this.has(sid)) this.changed();
  }
}

export function shouldReceiveTrack(input: {
  kind: string;
  source: string;
  visible: boolean;
  screenVisible: boolean;
  audioOnly: boolean;
  pageVisible: boolean;
}): boolean {
  // Suara tetap terdengar walaupun pembicara di luar halaman grid.
  if (input.kind === "audio") return true;
  if (input.kind !== "video" || !input.pageVisible || !input.visible) return false;
  return input.source === "screen_share" || !input.audioOnly;
}

/** Amati tile, bukan elemen video: tile tetap ada ketika track dilepas. */
export function observeVisibleTrack(registry: VisibleTracks, sid: string, element: HTMLElement): () => void {
  const tile = Symbol(sid);
  const mark = (visible: boolean) => registry.set(sid, tile, visible);
  let observer: IntersectionObserver | undefined;
  if (typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver(([entry]) => mark(entry.isIntersecting && entry.intersectionRatio > 0), { threshold: 0 });
    observer.observe(element);
  } else mark(true);
  return () => { observer?.disconnect(); mark(false); };
}
