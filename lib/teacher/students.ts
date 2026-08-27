/**
 * SSOT (Single Source of Truth) data murid untuk guru.
 *
 * Semua endpoint guru yang butuh daftar murid — data-siswa, kelasku,
 * game-hub, penilaian, gradebook, penugasan, analytics — harus membaca
 * dari layanan ini agar hitungan murid konsisten di semua halaman.
 *
 * Aturan yang diseragamkan:
 * 1. Guard akses: isTeacherOrHigher (GURU | ADMIN | founder).  — sebelum ini
 *    /api/guru/siswa hanya menerima role "GURU" sehingga founder/ADMIN kena
 *    403 dan halaman "/guru/data-siswa" tampil kosong walau kelasnya penuh.
 * 2. Cakupan kelas: hanya kelas MILIK guru + isActive = true.
 * 3. Dedupe murid lintas kelas: murid yang ikut >1 kelas hanya dihitung sekali.
 * 4. Semua anggota kelas dihitung apa adanya (tanpa filter role), sama seperti
 *    hitungan `_count.members` — konsisten ai kelebihan/sekarang.
 */
import { db } from "@/lib/db";

/** Apakah user boleh mengakses halaman/API guru (GURU, ADMIN, atau founder). */
export function isTeacherOrStudent(user: { role: string; isFounder: boolean } | null | undefined): boolean {
  if (!user) return false;
  return user.role === "GURU" || user.role === "ADMIN" || user.isFounder === true;
}

const STUDENT_SELECT = {
  id: true,
  fullName: true,
  avatar: true,
  email: true,
  xp: true,
  level: true,
  streak: true,
  league: true,
  lastActiveAt: true,
  profile: { select: { noAbsen: true, nisn: true } },
} as const;

/**
 * Semua kelas aktif milik guru + data ringkas muridnya (untuk halaman kelasku
 * dan dropdown pemilihan kelas). Murid diambil sekali per kelas.
 *
 * `take` opsional (default 50): konsumen analytics/population memanggil dengan
 * `take: undefined` (atau angka besar) agar tidak terpotong; konsumen UI tetap
 * memakai default untuk membatasi payload.
 */
export async function getTeacherGroups(teacherId: string, take?: number | null) {
  const groups = await db.group.findMany({
    where: { teacherId, isActive: true },
    include: {
      members: {
        include: { user: { select: STUDENT_SELECT } },
      },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
    ...(take === undefined ? { take: 50 } : take === null ? {} : { take }),
  });

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    grade: g.grade,
    tahunAjaran: g.tahunAjaran,
    accessCode: g.accessCode,
    isActive: g.isActive,
    createdAt: g.createdAt,
    memberCount: g._count.members,
    members: g.members,
  }));
}

/**
 * ID semua murid unik milik guru (dedupe antar kelas). Dipakai game-hub,
 * analytics, dst. Murid dengan beberapa kelas dihitung sekali.
 */
export async function getTeacherStudentIds(teacherId: string): Promise<string[]> {
  const groups = await getTeacherGroups(teacherId);
  const ids = groups.flatMap((g) => g.members.map((m) => m.user.id));
  return [...new Set(ids)];
}

/**
 * Daftar lengkap murid unik milik guru + profil (no. absen/NISN). Setiap murid
 * hanya muncul satu kali; groupId/groupName mengikuti kelas pertama yang ia
 * ikuti (urutan kelas terbaru dahulu).
 */
export async function getTeacherStudents(teacherId: string) {
  const groups = await getTeacherGroups(teacherId);
  const seen = new Set<string>();
  const siswa: Array<Record<string, unknown> & { id: string; groupId: string; groupName: string }> = [];

  for (const g of groups) {
    for (const m of g.members) {
      if (seen.has(m.user.id)) continue;
      seen.add(m.user.id);
      siswa.push({
        ...m.user,
        attendanceNumber: m.attendanceNumber,
        groupId: g.id,
        groupName: g.name,
      });
    }
  }

  return siswa;
}

/**
 * Daftar murid yang merupakan anggota kelas TERTENTU milik guru.
 * Guard: group harus milik teacherId + isActive.
 * Return murid dengan info kelasnya.
 */
export async function getTeacherStudentsForClass(teacherId: string, groupId: string) {
  const group = await db.group.findFirst({
    where: { id: groupId, teacherId, isActive: true },
    include: {
      members: { select: { attendanceNumber: true, user: { select: STUDENT_SELECT } } },
    },
  });
  if (!group) return [];
  return group.members.map((m) => ({
    ...m.user,
    attendanceNumber: m.attendanceNumber,
    groupId: group.id,
    groupName: group.name,
  }));
}

/** Baris lengkap (atau ringkas) dari satu grup untuk dashboard class detail. */
export async function getTeacherGroupDetail(teacherId: string, groupId: string) {
  return db.group.findFirst({
    where: { id: groupId, teacherId, isActive: true },
    include: {
      members: { select: { attendanceNumber: true, user: { select: STUDENT_SELECT } } },
    },
  });
}