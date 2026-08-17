export function normText(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[.,;:!?()'"„“”–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normOption(s: string): string {
  return normText(s);
}

export function keyIndex(ca: string | undefined, type: string): number | null {
  if (ca === undefined || ca === null) return null;
  if (type === "BENAR_SALAH") {
    if (ca === "Benar") return 0;
    if (ca === "Salah") return 1;
  }
  const n = parseInt(String(ca), 10);
  if (isNaN(n)) return null;
  return n;
}

export function collapseWs(s: string): string {
  return (s || "").replace(/\s+/g, " ").trim();
}
