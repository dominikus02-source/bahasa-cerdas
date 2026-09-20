import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { SetupClient } from "@/components/main-bersama/teacher/setup-client";
import { normalizePackageRef } from "@/src/main-bersama/adapters/bank-soal/package-ref";
import "@/components/main-bersama/main-bersama.css";

/**
 * Setup Main Bersama (Tahap 7 §3) — route guru final:
 * `/guru/game/main-bersama` (integrasi area guru existing; entry
 * section di `/guru/game` menuju sini).
 *
 * Auth (§5) mengikuti konvensi guard `app/(dashboard)/guru/layout.tsx`:
 * `getUser()` SUDAH mengembalikan record Prisma User (bukan auth user
 * Supabase) — peran dibaca langsung dari `user.role` TANPA query
 * `supabaseId` kedua (query kedua itu penyebab redirect `/murid/beranda`
 * yang salah pada route root lama). GURU + ADMIN (founder convention)
 * diizinkan; MURID diarahkan ke dashboard murid.
 */
export const metadata = {
  title: "Main Bersama — Setup Guru",
  robots: { index: false, follow: false },
};

export default async function MainBersamaSetupPage({
  searchParams,
}: {
  // Next versi repo: searchParams adalah Promise (harus di-await).
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login?redirect=/guru/game/main-bersama");
  if (user.role !== "GURU" && !user.isFounder) {
    redirect("/murid/beranda");
  }

  // Handoff "Gunakan untuk Main Bersama" dari Bank Soal. Query string
  // hanya membawa IDENTITAS sumber + parameter pemilihan (tema, jumlah,
  // tingkat, seed) — bukan isi soal/kunci jawaban. Divalidasi lewat
  // normalizer yang SAMA dengan create-session, jadi parameter yang
  // dimodifikasi sembarangan ditolak (gagal validasi → tanpa preselection,
  // bukan error halaman).
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined);
  const preselectedRef =
    first(sp.untuk) === "main-bersama" && first(sp.tema)
      ? normalizePackageRef({
          kind: "BANK_THEME",
          topic: first(sp.tema),
          count: first(sp.jumlah),
          difficulty: first(sp.tingkat) ?? null,
          seed: first(sp.seed),
        })
      : null;
  const preselectedTheme =
    preselectedRef && preselectedRef.kind === "BANK_THEME"
      ? {
          topic: preselectedRef.topic,
          count: preselectedRef.count ?? 10,
          difficulty: preselectedRef.difficulty ?? null,
          ...(preselectedRef.seed ? { seed: preselectedRef.seed } : {}),
        }
      : null;

  // Paket = SoalSet milik guru (urutan terbaru, ambil ringan).
  const [packages, classes] = await Promise.all([
    db.soalSet.findMany({
      where: { creatorId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, title: true, kelas: true, _count: { select: { questions: true } } },
    }),
    db.group.findMany({
      where: { teacherId: user.id, isActive: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="mb-scope-guru">
      <SetupClient
        teacherName={user.fullName ?? "Guru"}
        preselectedTheme={preselectedTheme}
        packages={packages.map((p) => ({
          id: p.id,
          title: p.title,
          kelas: p.kelas,
          questionCount: p._count.questions,
        }))}
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
