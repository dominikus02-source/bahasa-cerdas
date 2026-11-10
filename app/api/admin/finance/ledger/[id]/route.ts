import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { withAdmin } from "@/lib/admin/guard";
import { isValidIsoDate, isoDateToDb } from "@/lib/finance/dates";
import { serializeEntry } from "@/lib/finance/api";
import { normalizeLedgerInput, validateLedgerInput } from "@/lib/finance/ledger";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAdmin(async (req: NextRequest, ctx: Ctx) => {
  const admin = await getUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });

  const existing = await db.financeLedgerEntry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Entri tidak ditemukan." }, { status: 404 });

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
  const merged = {
    entryDate: String(input.entryDate ?? serializeEntry(existing).entryDate),
    type: String(input.type ?? existing.type),
    amount: input.amount ?? Number(existing.amount),
    description: String(input.description ?? existing.description),
    category: input.category === undefined ? existing.category : input.category,
  };
  const errors = validateLedgerInput(merged, { isValidIsoDate });
  if (errors.length) return NextResponse.json({ error: errors[0].message, errors }, { status: 400 });
  const data = normalizeLedgerInput(merged);

  const row = await db.financeLedgerEntry.update({
    where: { id },
    data: {
      entryDate: isoDateToDb(data.entryDate),
      type: data.type,
      amount: BigInt(data.amount),
      description: data.description,
      category: data.category,
      updatedById: admin.id,
      updatedByEmail: admin.email,
    },
  });
  return NextResponse.json({ entry: serializeEntry(row) });
}, { method: "PATCH", route: "/api/admin/finance/ledger/[id]" });

export const DELETE = withAdmin(async (_req: NextRequest, ctx: Ctx) => {
  const admin = await getUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  const existing = await db.financeLedgerEntry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Entri tidak ditemukan." }, { status: 404 });
  await db.financeLedgerEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true, id });
}, { method: "DELETE", route: "/api/admin/finance/ledger/[id]" });
