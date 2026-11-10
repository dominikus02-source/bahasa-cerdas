import { db } from "@/lib/db";
import {
  computeLedgerTotals,
  amountToNumber,
  type LedgerTotals,
} from "@/lib/finance/ledger";
import { dbDateToIso, isValidIsoDate, isoDateToDb, jakartaDateISO, startOfJakartaMonth } from "@/lib/finance/dates";
import type { LedgerDto } from "@/lib/finance/types";

export type { LedgerDto };
export const LEDGER_LIST_CAP = 2000;
export const LEDGER_EXPORT_CAP = 10000;

export function serializeEntry(row: {
  id: string;
  entryDate: Date;
  type: "PEMASUKAN" | "PENGELUARAN";
  amount: bigint;
  description: string;
  category: string | null;
  createdById: string | null;
  createdByEmail: string;
  updatedById: string | null;
  updatedByEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}): LedgerDto {
  return {
    id: row.id,
    entryDate: dbDateToIso(row.entryDate),
    type: row.type,
    amount: amountToNumber(row.amount),
    description: row.description,
    category: row.category,
    createdById: row.createdById,
    createdByEmail: row.createdByEmail,
    updatedById: row.updatedById,
    updatedByEmail: row.updatedByEmail,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function parseLedgerRange(url: URL): { from: string; to: string } | { error: string } {
  const today = jakartaDateISO();
  const month = startOfJakartaMonth(today);
  const from = url.searchParams.get("from") || month.from;
  const to = url.searchParams.get("to") || month.to;
  if (!isValidIsoDate(from) || !isValidIsoDate(to)) {
    return { error: "Rentang tanggal tidak valid (YYYY-MM-DD)." };
  }
  if (from > to) return { error: "Tanggal awal tidak boleh setelah tanggal akhir." };
  return { from, to };
}

export async function loadLedgerEntries(from: string, to: string, take: number): Promise<{
  entries: LedgerDto[];
  totals: LedgerTotals;
  truncated: boolean;
  from: string;
  to: string;
}> {
  const rows = await db.financeLedgerEntry.findMany({
    where: { entryDate: { gte: isoDateToDb(from), lte: isoDateToDb(to) } },
    orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    take: take + 1,
  });
  const truncated = rows.length > take;
  const sliced = truncated ? rows.slice(0, take) : rows;
  const entries = sliced.map(serializeEntry);
  return { entries, totals: computeLedgerTotals(entries), truncated, from, to };
}
