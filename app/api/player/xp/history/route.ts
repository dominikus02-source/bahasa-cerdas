import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { XP_SOURCE_LABELS } from "@/lib/gamification/source-labels";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export interface XpHistoryEntry {
  id: string;
  source: string;
  sourceLabel: string;
  amount: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface XpHistoryResponse {
  entries: XpHistoryEntry[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

/** GET /player/xp/history?cursor=&limit= — riwayat XP dengan infinite scroll. */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") || undefined;
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));

  const baseWhere = { userId: user.id };

  const total = await db.xPTransaction.count({ where: baseWhere });

  const tx = await db.xPTransaction.findMany({
    where: baseWhere,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor } } : {}),
    skip: cursor ? 1 : 0,
  });

  const hasMore = tx.length > limit;
  const rows = tx.slice(0, limit);

  const entries: XpHistoryEntry[] = rows.map((t) => ({
    id: t.id,
    source: t.source,
    sourceLabel: XP_SOURCE_LABELS[t.source] ?? t.source,
    amount: t.amount,
    metadata: (t.metadata ?? null) as Record<string, unknown> | null,
    createdAt: t.createdAt.toISOString(),
  }));

  const nextCursor = hasMore && rows.length > 0 ? rows[rows.length - 1].id : null;

  return NextResponse.json({ entries, nextCursor, hasMore, total });
}
