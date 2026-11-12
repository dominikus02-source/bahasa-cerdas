import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/guard";
import { LEDGER_EXPORT_CAP, loadLedgerEntries, parseLedgerRange } from "@/lib/finance/api";
import { buildLedgerWorkbook } from "@/lib/finance/xlsx";

export const GET = withAdmin(async (req: NextRequest) => {
  const range = parseLedgerRange(new URL(req.url));
  if ("error" in range) return NextResponse.json({ error: range.error }, { status: 400 });
  const data = await loadLedgerEntries(range.from, range.to, LEDGER_EXPORT_CAP);
  const buf = buildLedgerWorkbook({
    from: data.from,
    to: data.to,
    totals: data.totals,
    entries: data.entries.map((e) => ({
      entryDate: e.entryDate,
      type: e.type,
      amount: e.amount,
      description: e.description,
      category: e.category,
      createdByEmail: e.createdByEmail,
      updatedByEmail: e.updatedByEmail,
      createdAt: e.createdAt,
    })),
  });
  const filename = `buku-kas-${data.from}_${data.to}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}, { method: "GET", route: "/api/admin/finance/ledger/export" });
