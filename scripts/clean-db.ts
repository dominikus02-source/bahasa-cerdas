// @ts-nocheck
import { db } from "../lib/db"

async function clean() {
  console.log("Membersihkan semua data pengguna...")
  console.log("")

  const tables = [
    "UserUnitProgress",
    "StudentKaryaComment",
    "StudentKaryaLike",
    "StudentKarya",
    "UserItem",
    "CoinTransaction",
    "DailyQuest",
    "GameResult",
    "GameSession",
    "GameQuestion",
    "GameRoom",
    "KompetensiCertificate",
    "ProgresKompetensi",
    "TestAnswer",
    "TestSession",
    "ChatMessage",
    "GroupQuizResult",
    "GroupQuiz",
    "GroupMember",
    "Group",
    "QuizAnswer",
    "QuizSubmission",
    "QuizAssignment",
    "QuizQuestion",
    "Quiz",
    "QuizSession",
    "Certificate",
    "Pembelian",
    "PurchaseHistory",
    "SellerEarning",
    "Withdrawal",
    "Karya",
    "CommunityPost",
    "CommunityMember",
    "Community",
    "GeneratedRPP",
    "RPP",
    "Video",
    "CoursePlaylist",
    "Materi",
    "BankSoal",
    "Soal",
    "SoalSet",
    "Loker",
    "LombaPeserta",
    "Lomba",
    "KoleksiKata",
    "Transaksi",
    "Notifikasi",
    "AIUsage",
    "Artikel",
    "KamusEntry",
    "UKBIQuestion",
    "TKAQuestion",
    "PaketKompetensi",
    "Profile",
    "User",
  ]

  for (const table of tables) {
    try {
      const count = await db[table[0].toLowerCase() + table.slice(1)].deleteMany()
      console.log(`  ${table.padEnd(25)} ${count.count} baris dihapus`)
    } catch (e) {
      console.log(`  ${table.padEnd(25)} GAGAL: ${e.message}`)
    }
  }

  console.log("")
  console.log("Semua data pengguna telah dibersihkan!")
  console.log("LearningLevel dan LearningUnit tetap utuh.")
}

clean().catch((e) => {
  console.error(e)
  process.exit(1)
})
