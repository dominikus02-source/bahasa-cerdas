import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export interface CoinHistoryEntry {
  id: string;
  amount: number;
  reason: string;
  reference: string | null;
  createdAt: string;
}

export interface CoinHistoryResponse {
  entries: CoinHistoryEntry[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
  summary: { masuk: number; keluar: number; net: number };
}

/** GET /player/coin/history?cursor=&limit=&type=in|out&search= — riwayat koin. */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") || undefined;
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const type = (searchParams.get("type") || "all") as "all" | "in" | "out";
  const search = (searchParams.get("search") || "").trim().toLowerCase();

  const amountFilter = type === "in" ? { amount: { gt: 0 } } : type === "out" ? { amount: { lt: 0 } } : {};
  const searchFilter = search
    ? { OR: [{ reason: { contains: search, mode: "insensitive" as const } }, { reference: { contains: search, mode: "insensitive" as const } }] }
    : {};

  const where = { userId: user.id, ...amountFilter, ...searchFilter };

  const [total, summaryRows] = await Promise.all([
    db.coinTransaction.count({ where }),
    db.coinTransaction.findMany({
      where: { userId: user.id },
      select: { amount: true },
    }),
  ]);

  const summary = {
    masuk: summaryRows.reduce((s, r) => (r.amount > 0 ? s + r.amount : s), 0),
    keluar: summaryRows.reduce((s, r) => (r.amount < 0 ? s + r.amount : s), 0),
    net: summaryRows.reduce((s, r) => s + r.amount, 0),
  };

  const tx = await db.coinTransaction.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor } } : {}),
    skip: cursor ? 1 : 0,
  });

  const hasMore = tx.length > limit;
  const rows = tx.slice(0, limit);

  const entries: CoinHistoryEntry[] = rows.map((t) => ({
    id: t.id,
    amount: t.amount,
    reason: t.reason,
    reference: t.reference,
    createdAt: t.createdAt.toISOString(),
  }));

  const nextCursor = hasMore && rows.length > 0 ? rows[rows.length - 1].id : null;

  return NextResponse.json({ entries, nextCursor, hasMore, total, summary });
}
