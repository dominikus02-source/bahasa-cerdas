import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { XP_SOURCE_LABELS } from "@/lib/gamification/source-labels";

export interface PlayerNotification {
  id: string;
  type: "XP" | "COIN" | "BADGE" | "ACHIEVEMENT" | "QUEST" | "LEVEL_UP" | "SEASON" | "SYSTEM";
  title: string;
  body: string;
  icon: string;
  amount: number | null;
  reference: string | null;
  createdAt: string;
}

const LIMIT = 50;

const LEVEL_UP_LABEL = "Naik Level";

/**
 * GET /player/notifications — agregasi event pemain terbaru dari
 * XPTransaction, CoinTransaction, UserBadge, UserAchievement, dan DailyQuest.
 * Semua bertipe server-generated (tidak ada input klien).
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [xpTx, coinTx, badges, achievements, quests] = await Promise.all([
    db.xPTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    db.coinTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    db.userBadge.findMany({
      where: { userId: user.id },
      orderBy: { awardedAt: "desc" },
      take: 20,
      include: { badge: true },
    }),
    db.userAchievement.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { achievement: true },
    }),
    db.dailyQuest.findMany({
      where: { userId: user.id, completed: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  const notifications: PlayerNotification[] = [];

  for (const t of xpTx) {
    const label = XP_SOURCE_LABELS[t.source] ?? t.source;
    const title = t.source === "LEVEL_UP" || t.reference?.startsWith("level-up-") ? LEVEL_UP_LABEL : `+${t.amount} XP`;
    notifications.push({
      id: `xp-${t.id}`,
      type: t.source === "SYSTEM" ? "SYSTEM" : "XP",
      title,
      body: label === "Sistem" ? (t.reference ?? "XP diterima") : `XP diterima dari ${label}`,
      icon: t.source === "BADGE" ? "🏅" : t.source === "ACHIEVEMENT" ? "🏆" : "⚡",
      amount: t.amount,
      reference: t.reference,
      createdAt: t.createdAt.toISOString(),
    });
  }

  for (const c of coinTx) {
    const isIn = c.amount > 0;
    notifications.push({
      id: `coin-${c.id}`,
      type: "COIN",
      title: isIn ? `+${c.amount} Koin` : `${c.amount} Koin`,
      body: c.reason,
      icon: "🪙",
      amount: c.amount,
      reference: c.reference,
      createdAt: c.createdAt.toISOString(),
    });
  }

  for (const b of badges) {
    notifications.push({
      id: `badge-${b.id}`,
      type: "BADGE",
      title: `Badge ${b.badge.name}`,
      body: b.badge.description,
      icon: b.badge.icon || "🏅",
      amount: null,
      reference: b.badge.code,
      createdAt: b.awardedAt.toISOString(),
    });
  }

  for (const a of achievements) {
    if (!a.completed) continue;
    notifications.push({
      id: `ach-${a.id}`,
      type: "ACHIEVEMENT",
      title: `Pencapaian ${a.achievement.name}`,
      body: a.claimed ? "Hadiah sudah diklaim." : "Selesaikan & klaim hadiahmu!",
      icon: a.achievement.icon || "🏆",
      amount: a.achievement.rewardXP || null,
      reference: a.achievement.code,
      createdAt: a.updatedAt.toISOString(),
    });
  }

  for (const q of quests) {
    notifications.push({
      id: `quest-${q.id}`,
      type: "QUEST",
      title: "Misi harian selesai",
      body: `Misi ${q.questType} selesai — +${q.rewardCoins} koin`,
      icon: "✅",
      amount: q.rewardCoins,
      reference: q.id,
      createdAt: q.updatedAt.toISOString(),
    });
  }

  notifications.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  notifications.splice(0, LIMIT);

  return NextResponse.json({ notifications, total: notifications.length });
}
