import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

const INVENTORY_PATH = path.resolve("data/alat-ajar-import/inventory.json");

interface InventoryEntry {
  sourceDriveFileId: string;
  sourceDriveFolderId: string;
  sourceFileName: string;
  mimeType: string;
  fileSize: string;
  modifiedTime: string;
  sourcePath: string;
  sourceUrl: string;
  detectedExtension: string;
  educationLevel: string;
  grade: string;
  parentSubjectFolder: string;
}

export async function GET() {
  // SECURITY (L1): inventori perangkat ajar hanya untuk GURU/ADMIN/founder
  // (isTeacherOrStudent = GURU || ADMIN || isFounder), sama seperti route guru lain.
  let dbUser: { role: string; isFounder: boolean; email: string } | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      dbUser = await db.user.findUnique({
        where: { supabaseId: user.id },
        select: { role: true, isFounder: true, email: true },
      });
    }
  } catch {}
  if (!dbUser || dbUser.email.endsWith("@account.invalid")) {
    return NextResponse.json({ error: "Sesi Anda berakhir. Silakan login ulang." }, { status: 401 });
  }
  if (!isTeacherOrStudent(dbUser)) {
    return NextResponse.json({ error: "Khusus guru." }, { status: 403 });
  }

  try {
    const raw = await readFile(INVENTORY_PATH, "utf-8");
    const all: InventoryEntry[] = JSON.parse(raw);

    const filtered = all.filter((e) =>
      /bahasa indonesia/i.test(e.parentSubjectFolder),
    );

    const byGrade: Record<
      string,
      {
        educationLevel: string;
        grade: string;
        files: InventoryEntry[];
        totalSize: number;
      }
    > = {};

    for (const entry of filtered) {
      const key = `${entry.educationLevel}-${entry.grade}`;
      if (!byGrade[key]) {
        byGrade[key] = {
          educationLevel: entry.educationLevel,
          grade: entry.grade,
          files: [],
          totalSize: 0,
        };
      }
      byGrade[key].files.push(entry);
      byGrade[key].totalSize += Number(entry.fileSize) || 0;
    }

    const grades = Object.values(byGrade).sort((a, b) => {
      const levelOrder = { SD: 0, SMP: 1, SMA: 2 };
      const la = levelOrder[a.educationLevel as keyof typeof levelOrder] ?? 3;
      const lb = levelOrder[b.educationLevel as keyof typeof levelOrder] ?? 3;
      if (la !== lb) return la - lb;
      return Number(a.grade) - Number(b.grade);
    });

    return NextResponse.json({
      total: filtered.length,
      grades: grades.map((g) => ({
        educationLevel: g.educationLevel,
        grade: g.grade,
        label: `${g.educationLevel} Kelas ${g.grade}`,
        fileCount: g.files.length,
        totalSize: g.totalSize,
        files: g.files,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Inventory belum tersedia" },
      { status: 503 },
    );
  }
}
