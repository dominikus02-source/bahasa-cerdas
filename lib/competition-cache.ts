const CACHE_PREFIX = "bc_kompetisi_";

export interface CacheEntry {
  paketId: string;
  data: any;
  fetchedAt: number;
}

export async function preloadCompetition(paketId: string): Promise<void> {
  try {
    const res = await fetch(`/api/kompetensi/${paketId}`);
    const result = await res.json();
    const body = result.data ?? result;
    if (body?.questions) {
      const entry: CacheEntry = { paketId, data: body, fetchedAt: Date.now() };
      try {
        sessionStorage.setItem(CACHE_PREFIX + paketId, JSON.stringify(entry));
      } catch { /* sessionStorage penuh — abaikan */ }
    }
  } catch {
    // Gagal pre-load — test page akan fetch sendiri
  }
}

export function getCachedCompetition(paketId: string): any | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + paketId);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (entry.paketId !== paketId) return null;
    // Cache valid selama 2 menit (lebih dari cukup untuk device check)
    if (Date.now() - entry.fetchedAt > 120_000) {
      sessionStorage.removeItem(CACHE_PREFIX + paketId);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function clearCompetitionCache(paketId: string): void {
  try {
    sessionStorage.removeItem(CACHE_PREFIX + paketId);
  } catch { /* abaikan */ }
}
