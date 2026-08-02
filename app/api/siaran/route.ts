import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

/**
 * Siaran platform — pengumuman ke seluruh murid.
 *
 * GET  : siaran yang sedang tayang (semua yang login).
 * POST : buat siaran (hanya founder/admin).
 *
 * "Sedang tayang" = aktif, `mulai` sudah lewat, dan `sampai` belum lewat
 * (atau kosong). Rentang waktu dipakai supaya siaran acara bisa dijadwalkan
 * dan berhenti sendiri — tanpa itu, pengumuman lama menumpuk di beranda murid.
 */

function bolehKelola(user: { role: string; isFounder: boolean }) {
  return user.isFounder || user.role === "ADMIN";
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sekarang = new Date();
    const siaran = await db.siaran.findMany({
      where: {
        aktif: true,
        mulai: { lte: sekarang },
        OR: [{ sampai: null }, { sampai: { gte: sekarang } }],
      },
      orderBy: [{ pinned: "desc" }, { mulai: "desc" }],
      take: 10,
      select: {
        id: true, judul: true, isi: true, kategori: true,
        gambar: true, tautan: true, tautanLabel: true,
        pinned: true, mulai: true,
      },
    });

    return NextResponse.json({ siaran });
  } catch (error) {
    console.error("Siaran GET error:", error);
    return NextResponse.json({ error: "Gagal memuat siaran" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!bolehKelola(user)) return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const judul = String(body?.judul ?? "").trim();
    const isi = String(body?.isi ?? "").trim();
    if (!judul || !isi) {
      return NextResponse.json({ error: "Judul dan isi harus diisi" }, { status: 400 });
    }

    const KATEGORI = ["INFO", "PEMBARUAN", "ACARA", "PENTING"] as const;
    const kategori = KATEGORI.includes(body?.kategori) ? body.kategori : "INFO";

    const siaran = await db.siaran.create({
      data: {
        judul: judul.slice(0, 160),
        isi: isi.slice(0, 2000),
        kategori,
        gambar: body?.gambar ? String(body.gambar).slice(0, 500) : null,
        tautan: body?.tautan ? String(body.tautan).slice(0, 300) : null,
        tautanLabel: body?.tautanLabel ? String(body.tautanLabel).slice(0, 40) : null,
        pinned: Boolean(body?.pinned),
        mulai: body?.mulai ? new Date(body.mulai) : new Date(),
        sampai: body?.sampai ? new Date(body.sampai) : null,
        authorId: user.id,
      },
    });

    return NextResponse.json({ siaran }, { status: 201 });
  } catch (error) {
    console.error("Siaran POST error:", error);
    return NextResponse.json({ error: "Gagal membuat siaran" }, { status: 500 });
  }
}
