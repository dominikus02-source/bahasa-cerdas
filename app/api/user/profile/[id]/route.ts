import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        avatar: true,
        role: true,
        isFounder: true,
        isPremium: true,
        premiumPlan: true,
        xp: true,
        level: true,
        streak: true,
        league: true,
        createdAt: true,
        profile: {
          select: {
            bio: true,
            nip: true,
            nuptk: true,
            school: true,
            subject: true,
          },
        },
        _count: {
          select: {
            karya: true,
            artikel: true,
            soals: true,
            ukbiQuestions: true,
            tkaQuestions: true,
            uploadedBankSoals: true,
            uploadedMateris: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Hitung total penjualan karya
    const totalSold = await db.pembelian.count({
      where: {
        karya: { sellerId: id },
        status: "PAID",
      },
    });

    // Hitung total downloads karya
    const totalDownloads = await db.karya.aggregate({
      where: { sellerId: id, isPublished: true },
      _sum: { downloads: true },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        avatar: user.avatar,
        role: user.role,
        isFounder: user.isFounder,
        isPremium: user.isPremium,
        premiumPlan: user.premiumPlan,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        league: user.league,
        joinedAt: user.createdAt,
        profile: user.profile,
        stats: {
          totalKarya: user._count.karya,
          totalArtikel: user._count.artikel,
          totalSoal: user._count.soals + user._count.ukbiQuestions + user._count.tkaQuestions + user._count.uploadedBankSoals,
          totalMateri: user._count.uploadedMateris,
          totalSold,
          totalDownloads: totalDownloads._sum.downloads || 0,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/user/profile/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
