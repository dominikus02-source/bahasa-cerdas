/**
 * Membuat (atau menghapus) satu kelas uji coba TK untuk mencoba Arena Junior.
 *
 * SENGAJA DIBUAT MUDAH DIHAPUS: kode akses tetap "TKUJI1" dan namanya diawali
 * "[UJI]" supaya jelas ini bukan kelas sungguhan.
 *
 *   npx tsx scripts/kelas-uji-arena-junior.ts            # tampilkan rencana
 *   npx tsx scripts/kelas-uji-arena-junior.ts --execute  # buat
 *   npx tsx scripts/kelas-uji-arena-junior.ts --hapus    # hapus lagi
 */

import { createScriptPrisma } from "./script-prisma"

const prisma = createScriptPrisma()

const KODE = "TKUJI1"
const NAMA = "[UJI] TK Arena Junior"
const EMAIL_MURID = "murid@demo.com"

const HAPUS = process.argv.includes("--hapus")
const EXECUTE = process.argv.includes("--execute") || HAPUS

async function main() {
  if (HAPUS) {
    const group = await prisma.group.findUnique({ where: { accessCode: KODE } })
    if (!group) {
      console.log("Tidak ada kelas uji dengan kode", KODE)
      return
    }
    await prisma.group.delete({ where: { id: group.id } }) // anggota ikut terhapus (cascade)
    console.log(`🗑️  Kelas uji "${group.name}" dihapus.`)
    return
  }

  const murid = await prisma.user.findUnique({
    where: { email: EMAIL_MURID },
    select: { id: true, fullName: true, role: true },
  })
  if (!murid) {
    console.error(`❌ Akun murid ${EMAIL_MURID} tidak ditemukan.`)
    process.exit(1)
  }

  const guru = await prisma.user.findFirst({
    where: { OR: [{ email: "guru@demo.com" }, { isFounder: true }, { role: "GURU" }] },
    select: { id: true, fullName: true, email: true },
    orderBy: { createdAt: "asc" },
  })
  if (!guru) {
    console.error("❌ Tidak ada akun guru untuk dijadikan pemilik kelas.")
    process.exit(1)
  }

  console.log("Rencana:")
  console.log(`  Kelas   : "${NAMA}" (jenjang TK, kode ${KODE})`)
  console.log(`  Pemilik : ${guru.fullName} <${guru.email}>`)
  console.log(`  Anggota : ${murid.fullName} <${EMAIL_MURID}> (peran ${murid.role})`)

  if (!EXECUTE) {
    console.log("\n🧪 Belum ada yang ditulis. Jalankan dengan --execute untuk membuat.")
    return
  }

  const group = await prisma.group.upsert({
    where: { accessCode: KODE },
    update: { name: NAMA, grade: "TK", isActive: true },
    create: {
      name: NAMA,
      description: "Kelas sementara untuk mencoba dasbor Arena Junior. Aman dihapus.",
      grade: "TK",
      accessCode: KODE,
      teacherId: guru.id,
      tahunAjaran: "2025/2026",
    },
  })

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: murid.id } },
    update: {},
    create: { groupId: group.id, userId: murid.id },
  })

  console.log(`\n✅ Kelas uji siap. Login sebagai ${EMAIL_MURID} lalu buka /arena-junior`)
  console.log(`   Hapus lagi dengan: npx tsx scripts/kelas-uji-arena-junior.ts --hapus`)
}

main()
  .catch((e) => {
    console.error("❌ Gagal:", e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
