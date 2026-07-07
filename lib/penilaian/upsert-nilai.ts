import { db } from "@/lib/db";

export type SumberType =
  | "MANUAL"
  | "PENUGASAN"
  | "KARYA"
  | "QUIZ"
  | "GAME"
  | "JALUR_CERDAS"
  | "UKBI_TKA"
  | "MATERI_LATIHAN";

export const SUMBER_LABEL: Record<SumberType, string> = {
  MANUAL: "Manual",
  PENUGASAN: "Tugas",
  KARYA: "Karya",
  QUIZ: "Kuis",
  GAME: "Game",
  JALUR_CERDAS: "Jalur Cerdas",
  UKBI_TKA: "UKBI/TKA",
  MATERI_LATIHAN: "Latihan Materi",
};

export const DEFAULT_KATEGORIS = [
  { nama: "Tugas Harian", bobot: 100 },
  { nama: "Kuis", bobot: 100 },
  { nama: "Game Edukasi", bobot: 100 },
  { nama: "Latihan Jalur Cerdas", bobot: 100 },
  { nama: "Simulasi UKBI/TKA", bobot: 100 },
  { nama: "Latihan dari Materi", bobot: 100 },
];

interface UpsertNilaiParams {
  userId: string;
  groupId: string;
  kategoriNama: string;
  kategoriBobot?: number;
  skor: number;
  sumberType: SumberType;
  sumberId: string;
  keterangan: string;
  allowUpdateAuto?: boolean;
  neverOverwriteManual?: boolean;
}

interface UpsertResult {
  status: "created" | "updated" | "skipped_manual_protected" | "skipped_existing" | "skipped_no_category" | "error";
  nilai?: any;
  kategori?: any;
  error?: string;
}

export async function ensureKategori(groupId: string, nama: string, bobot = 100) {
  const existing = await db.nilaiKategori.findFirst({
    where: { groupId, nama },
  });
  if (existing) return existing;
  return db.nilaiKategori.create({
    data: { groupId, nama, bobot },
  });
}

export async function upsertNilaiOtomatis(
  params: UpsertNilaiParams
): Promise<UpsertResult> {
  const {
    userId, groupId, kategoriNama, kategoriBobot = 100,
    skor, sumberType, sumberId, keterangan,
    allowUpdateAuto = true, neverOverwriteManual = true,
  } = params;

  // Validate score range
  const finalSkor = Math.max(0, Math.min(100, Math.round(skor)));

  // Ensure category exists
  let kategori;
  try {
    kategori = await ensureKategori(groupId, kategoriNama, kategoriBobot);
  } catch (e: any) {
    return { status: "error", error: `Kategori error: ${e.message}` };
  }

  // Find existing nilai by userId + kategoriId + sumberType + sumberId
  const existing = await db.nilai.findFirst({
    where: { userId, kategoriId: kategori.id, sumberType, sumberId },
  });

  // If existing manual score and neverOverwriteManual is true, skip
  if (existing && neverOverwriteManual && existing.sumberType === "MANUAL") {
    return {
      status: "skipped_manual_protected",
      nilai: existing,
      kategori,
    };
  }

  // If existing and allowUpdateAuto is true, update
  if (existing && allowUpdateAuto) {
    const updated = await db.nilai.update({
      where: { id: existing.id },
      data: { skor: finalSkor, keterangan, groupId },
    });
    return { status: "updated", nilai: updated, kategori };
  }

  // If existing but not updating, skip
  if (existing && !allowUpdateAuto) {
    return { status: "skipped_existing", nilai: existing, kategori };
  }

  // Create new
  const created = await db.nilai.create({
    data: {
      userId, groupId, kategoriId: kategori.id,
      skor: finalSkor, sumberType, sumberId,
      keterangan,
    },
  });
  return { status: "created", nilai: created, kategori };
}
