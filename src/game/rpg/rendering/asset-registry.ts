/**
 * Production asset manifest + sprite loader — Pendekar Suryakerta (P2.0A).
 *
 * Manifest shape mirrors the pipeline sidecar schema
 * (RPG_ASSET_PIPELINE.md §3): assetKey, category, canvas, frame grid,
 * origin (feet bottom-center), directions, animation timing. The RUNTIME
 * registry maps assetKey → decoded sheet; renderers resolve through it —
 * never hardcoded paths, never silent fallbacks to unrelated assets.
 *
 * Missing production art (e.g. Arga today) is an EXPLICIT diagnostic, not
 * a placeholder sprite. See diagnoseAsset() + ARGA_CONTRACT.
 */

export type AssetCategory =
  | "characters" | "npcs" | "monsters" | "bosses" | "environments"
  | "props" | "items" | "equipment" | "vfx" | "ui";

export interface AssetManifestEntry {
  assetKey: string;
  category: AssetCategory;
  /** Runtime file path under public/ (resolved by the loader). */
  sourcePath: string;
  dimensions: { width: number; height: number };
  /** Feet origin in UV space (bible: 0.5, 1.0 bottom-center). */
  origin: { x: number; y: number };
  frame: { width: number; height: number; columns: number; rows: number; count: number };
  directions: string[];
  animation: { state: string; loop: boolean; frameDurationMs: number };
  version: number;
}

export interface AssetManifest {
  version: number;
  entries: Record<string, AssetManifestEntry>;
}

export function createEmptyManifest(): AssetManifest {
  return { version: 1, entries: {} };
}

export function registerAsset(manifest: AssetManifest, entry: AssetManifestEntry): AssetManifest {
  return { ...manifest, entries: { ...manifest.entries, [entry.assetKey]: entry } };
}

export type AssetLookup =
  | { ok: true; entry: AssetManifestEntry }
  | { ok: false; reason: "NOT_REGISTERED"; assetKey: string };

/** Deterministic lookup — miss is explicit, never a silent substitution. */
export function lookupAsset(manifest: AssetManifest, assetKey: string): AssetLookup {
  const entry = manifest.entries[assetKey];
  if (!entry) return { ok: false, reason: "NOT_REGISTERED", assetKey };
  return { ok: true, entry };
}

/**
 * Human-readable missing-asset diagnostic for logs/dev overlays.
 * Production art that has not landed yet reports as MISSING — never
 * renders a fake stand-in and calls it final.
 */
export function diagnoseAsset(manifest: AssetManifest, assetKey: string): string {
  const found = lookupAsset(manifest, assetKey);
  if (found.ok) {
    return `ASSET OK: ${assetKey} → ${found.entry.sourcePath} (v${found.entry.version})`;
  }
  return `ASSET MISSING: ${assetKey} is not registered in the manifest. ` +
    `Expected a pipeline delivery (sheet + JSON sidecar) before integration. ` +
    `The renderer must use its explicit dev placeholder, never invent art.`;
}

/** Minimal image-like handle (keeps the loader testable without DOM). */
export interface LoadedImage {
  width: number;
  height: number;
  complete: boolean;
}

export type ImageFactory = (src: string) => Promise<LoadedImage>;

export type LoadResult =
  | { ok: true; image: LoadedImage }
  | { ok: false; src: string; error: string };

/**
 * Sprite loader with cache + concurrent-load dedupe.
 * Failures are explicit LoadResults (callers decide: placeholder + report).
 * Pass a DOM factory in production (`src => load via new Image()`),
 * a stub in tests. No global mutable cache — instance per call.
 */
export function createSpriteLoader(factory: ImageFactory) {
  const cache = new Map<string, LoadedImage>();
  const inflight = new Map<string, Promise<LoadResult>>();

  async function load(src: string): Promise<LoadResult> {
    const hit = cache.get(src);
    if (hit) return { ok: true, image: hit };
    const pending = inflight.get(src);
    if (pending) return pending;
    const job = factory(src).then(
      (image): LoadResult => {
        cache.set(src, image);
        inflight.delete(src);
        return { ok: true, image };
      },
      (err: unknown): LoadResult => {
        inflight.delete(src);
        return { ok: false, src, error: err instanceof Error ? err.message : String(err) };
      },
    );
    inflight.set(src, job);
    return job;
  }

  function cached(src: string): LoadedImage | undefined {
    return cache.get(src);
  }

  function cacheSize(): number {
    return cache.size;
  }

  return { load, cached, cacheSize };
}

export type SpriteLoader = ReturnType<typeof createSpriteLoader>;
