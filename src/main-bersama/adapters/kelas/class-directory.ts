// ─── KelasKu Adapter (Group Existing) ───────────────────────
// Main Bersama TIDAK membuat model kelas baru. Sesi opsional
// terikat ke KelasKu (model `Group`). Adapter hanya MEMBACA —
// tidak ada mutasi data kelas dari Main Bersama.
//
// className disimpan sebagai display snapshot saat sesi dibuat;
// perubahan nama kelas di masa depan tidak mengubah history sesi
// (snapshot, bukan identity).

import { db } from '@/lib/db';
import type {
  MainBersamaClassDirectory,
  MainBersamaClassSummary,
} from '../../application/use-cases/ports';

export class PrismaMainBersamaClassDirectory implements MainBersamaClassDirectory {
  /**
   * Baca ringkasan kelas KelasKu untuk otorisasi + snapshot nama.
   * Return null bila kelas tidak ada / sudah dihapus (cascade).
   * Kelas non-aktif (isActive=false) tetap dikembalikan — keputusan
   * kebijakan ada di use-case, bukan disembunyikan adapter.
   */
  async getClassSummary(classId: string): Promise<MainBersamaClassSummary | null> {
    const group = await db.group.findUnique({
      where: { id: classId },
      select: { id: true, name: true, teacherId: true, isActive: true },
    });
    if (!group) return null;
    return {
      id: group.id,
      name: group.name,
      teacherId: group.teacherId,
      isActive: group.isActive,
    };
  }
}
