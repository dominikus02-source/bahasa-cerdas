import type { Prisma } from "@prisma/client";

export const questionPackageSummarySelect = {
  id: true,
  title: true,
  kelas: true,
  isPublic: true,
  creatorId: true,
  creator: { select: { fullName: true } },
  _count: { select: { questions: true } },
} satisfies Prisma.SoalSetSelect;

type PackageSummaryRow = Prisma.SoalSetGetPayload<{
  select: typeof questionPackageSummarySelect;
}>;

export function questionPackageSummary(
  row: PackageSummaryRow,
  teacherId: string,
) {
  return {
    id: row.id,
    title: row.title,
    kelas: row.kelas,
    isPublic: row.isPublic,
    isOwner: row.creatorId === teacherId,
    creatorName: row.creator.fullName || "Guru BahasaCerdas",
    questionCount: row._count.questions,
  };
}

export function questionPackageWhere(
  teacherId: string,
  scope: "mine" | "public",
  search = "",
): Prisma.SoalSetWhereInput {
  const access =
    scope === "mine" ? { creatorId: teacherId } : { isPublic: true };
  if (!search.trim()) return access;
  return {
    AND: [
      access,
      {
        OR: [
          { title: { contains: search.trim(), mode: "insensitive" } },
          { kelas: { contains: search.trim(), mode: "insensitive" } },
        ],
      },
    ],
  };
}
