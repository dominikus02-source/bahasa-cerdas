import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/server"
import { ambilKurikulum, jenjangMurid, GRADES } from "@/lib/arena-junior/kurikulum"

/**
 * Kurikulum Arena Junior untuk murid yang sedang login.
 *
 * Logikanya ada di lib/arena-junior/kurikulum.ts supaya halaman server
 * (/junior) memakai sumber yang sama tanpa lewat HTTP. Route ini
 * dipertahankan untuk aplikasi tablet/HP yang menyusul.
 */
export async function GET(_req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const grade = await jenjangMurid(user.id)
  if (!grade) {
    // Murid belum tergabung di kelas TK/SD mana pun. UI menampilkan ajakan
    // memasukkan kode kelas dari guru, bukan menebak jenjang sendiri.
    return NextResponse.json({
      butuhKelas: true,
      pesan: "Belum tergabung di kelas TK/SD. Minta kode kelas ke gurumu untuk mulai belajar.",
      jenjangDidukung: GRADES,
    })
  }

  return NextResponse.json(await ambilKurikulum(user.id, grade))
}
