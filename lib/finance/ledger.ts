export const LEDGER_TYPES = ["PEMASUKAN", "PENGELUARAN"] as const;
export type LedgerType = (typeof LEDGER_TYPES)[number];

export const LEDGER_CATEGORIES = [
  "Premium",
  "Komisi",
  "Operasional",
  "Infrastruktur",
  "Gaji",
  "Pajak",
  "Marketing",
  "Lainnya",
] as const;

export const DESCRIPTION_MAX = 500;
export const CATEGORY_MAX = 80;
export const AMOUNT_MAX = 1_000_000_000_000; // 1 triliun rupiah

export type LedgerInput = {
  entryDate: string;
  type: string;
  amount: unknown;
  description: string;
  category?: string | null;
};

export type LedgerValidationError = { field: string; message: string };

export function parseRupiahAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "bigint") {
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(value);
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d-]/g, "");
    if (!cleaned || cleaned === "-") return null;
    const n = Number(cleaned);
    if (!Number.isInteger(n)) return null;
    return n;
  }
  return null;
}

export function validateLedgerInput(input: LedgerInput, { isValidIsoDate }: { isValidIsoDate: (v: string) => boolean }): LedgerValidationError[] {
  const errors: LedgerValidationError[] = [];
  if (!input.entryDate || !isValidIsoDate(input.entryDate)) {
    errors.push({ field: "entryDate", message: "Tanggal tidak valid (YYYY-MM-DD)." });
  }
  if (!LEDGER_TYPES.includes(input.type as LedgerType)) {
    errors.push({ field: "type", message: "Tipe harus Pemasukan atau Pengeluaran." });
  }
  const amount = parseRupiahAmount(input.amount);
  if (amount == null || amount <= 0 || amount > AMOUNT_MAX) {
    errors.push({ field: "amount", message: "Nominal harus angka rupiah bulat lebih dari 0." });
  }
  const description = (input.description || "").trim();
  if (!description) errors.push({ field: "description", message: "Keterangan wajib diisi." });
  else if (description.length > DESCRIPTION_MAX) errors.push({ field: "description", message: `Keterangan maksimal ${DESCRIPTION_MAX} karakter.` });
  const category = input.category == null || input.category === "" ? null : String(input.category).trim();
  if (category && category.length > CATEGORY_MAX) {
    errors.push({ field: "category", message: `Kategori maksimal ${CATEGORY_MAX} karakter.` });
  }
  return errors;
}

export function normalizeLedgerInput(input: LedgerInput): {
  entryDate: string;
  type: LedgerType;
  amount: number;
  description: string;
  category: string | null;
} {
  return {
    entryDate: input.entryDate,
    type: input.type as LedgerType,
    amount: parseRupiahAmount(input.amount) as number,
    description: input.description.trim(),
    category: input.category == null || String(input.category).trim() === "" ? null : String(input.category).trim(),
  };
}

export type LedgerTotals = { pemasukan: number; pengeluaran: number; saldo: number };

export function computeLedgerTotals(entries: { type: string; amount: number | bigint }[]): LedgerTotals {
  let pemasukan = 0;
  let pengeluaran = 0;
  for (const entry of entries) {
    const amount = typeof entry.amount === "bigint" ? Number(entry.amount) : entry.amount;
    if (entry.type === "PEMASUKAN") pemasukan += amount;
    else if (entry.type === "PENGELUARAN") pengeluaran += amount;
  }
  return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran };
}

export function formatRupiah(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}Rp ${Math.abs(amount).toLocaleString("id-ID")}`;
}

export function amountToNumber(value: bigint | number | string): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  return Number(value);
}
