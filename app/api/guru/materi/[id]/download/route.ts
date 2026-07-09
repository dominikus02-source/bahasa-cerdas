import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// Batas unduh modul untuk user gratis. Premium/founder/admin tak terbatas.
export const FREE_DOWNLOAD_LIMIT = 10;

async function resolveUser(req: NextRequest, body: any) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return db.user.findUnique({ where: { supabaseId: user.id } });
  } catch {}
  if (body?.supabaseId) return db.user.findUnique({ where: { supabaseId: body.supabaseId } });
  return null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const dbUser = await resolveUser(req, body);
    if (!dbUser) return NextResponse.json({ error: "Sesi Anda berakhir. Silakan login ulang." }, { status: 401 });

    const materi = await db.materi.findFirst({
      where: { id, OR: [{ isPublished: true }, { uploaderId: dbUser.id }] },
      select: { id: true, fileUrl: true, fileType: true, title: true },
    });
    if (!materi || !materi.fileUrl) return NextResponse.json({ error: "Modul tidak ditemukan." }, { status: 404 });

    const unlimited = dbUser.isPremium || dbUser.isFounder || dbUser.role === "ADMIN";
    const already = await db.materiDownload.findUnique({
      where: { userId_materiId: { userId: dbUser.id, materiId: id } },
    });

    if (!already && !unlimited) {
      const used = await db.materiDownload.count({ where: { userId: dbUser.id } });
      if (used >= FREE_DOWNLOAD_LIMIT) {
        return NextResponse.json({
          error: `Batas unduh gratis (${FREE_DOWNLOAD_LIMIT} modul) sudah tercapai. Upgrade ke Premium untuk unduh lebih banyak.`,
          limitReached: true, used, limit: FREE_DOWNLOAD_LIMIT,
        }, { status: 403 });
      }
    }

    if (!already) {
      // Catat unduhan (unik per user+modul) + naikkan penghitung global.
      await db.materiDownload.create({ data: { userId: dbUser.id, materiId: id } }).catch(() => {});
      await db.materi.update({ where: { id }, data: { downloads: { increment: 1 } } }).catch(() => {});
    }

    const used = await db.materiDownload.count({ where: { userId: dbUser.id } });
    return NextResponse.json({
      fileUrl: materi.fileUrl,
      fileType: materi.fileType,
      title: materi.title,
      unlimited,
      used,
      limit: unlimited ? null : FREE_DOWNLOAD_LIMIT,
      remaining: unlimited ? null : Math.max(0, FREE_DOWNLOAD_LIMIT - used),
    });
  } catch {
    return NextResponse.json({ error: "Gagal memproses unduhan." }, { status: 500 });
  }
}
