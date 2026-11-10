import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { withAdmin } from "@/lib/admin/guard";
import { isValidIsoDate, isoDateToDb } from "@/lib/finance/dates";
import { LEDGER_LIST_CAP, loadLedgerEntries, parseLedgerRange, serializeEntry } from "@/lib/finance/api";
import { normalizeLedgerInput, validateLedgerInput } from "@/lib/finance/ledger";

export const GET = withAdmin(async (req: NextRequest) => {
  const range = parseLedgerRange(new URL(req.url));
  if ("error" in range) return NextResponse.json({ error: range.error }, { status: 400 });
  const data = await loadLedgerEntries(range.from, range.to, LEDGER_LIST_CAP);
  return NextResponse.json(data);
}, { method: "GET", route: "/api/admin/finance/ledger" });

export const POST = withAdmin(async (req: NextRequest) => {
  const admin = await getUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }
  const input = (body && typeof body === "object" ? body : {}) as {
    entryDate?: string;
    type?: string;
    amount?: unknown;
    description?: string;
    category?: string | null;
  };
  const errors = validateLedgerInput(
    {
      entryDate: String(input.entryDate || ""),
      type: String(input.type || ""),
      amount: input.amount,
      description: String(input.description || ""),
      category: input.category,
    },
    { isValidIsoDate },
  );
  if (errors.length) return NextResponse.json({ error: errors[0].message, errors }, { status: 400 });
  const data = normalizeLedgerInput({
    entryDate: String(input.entryDate),
    type: String(input.type),
    amount: input.amount,
    description: String(input.description || ""),
    category: input.category,
  });

  const row = await db.financeLedgerEntry.create({
    data: {
      entryDate: isoDateToDb(data.entryDate),
      type: data.type,
      amount: BigInt(data.amount),
      description: data.description,
      category: data.category,
      createdById: admin.id,
      createdByEmail: admin.email,
    },
  });
  return NextResponse.json({ entry: serializeEntry(row) }, { status: 201 });
}, { method: "POST", route: "/api/admin/finance/ledger" });
