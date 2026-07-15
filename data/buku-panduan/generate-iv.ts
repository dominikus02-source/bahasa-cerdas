import { writeFileSync } from "fs"
import path from "path"
import type { GradeData, GuideChapter, Phase, SourceBasis, ReviewStatus } from "./types"

const phase: Phase = "B"
const sourceBasis: SourceBasis = "cp-atp-research"
const reviewStatus: ReviewStatus = "needs-review"

function ch(
  id: string,
  slug: string,
  title: string,
  shortTitle: string,
  kd: string,
  emoji: string,
  description: string,
  overview: string,
  duration: string,
  semester: 1 | 2,
  chapterNumber: number,
  goals: string[],
  keywords: string[],
  remedial: string[],
  enrichment: string[],
  tc: any,
  exampleText: any,
  activities: any,
  worksheet: any,
  assessment: any,
  rubric: any,
  differentiation: any,
  tn: any,
  reflection: any,
  rp: any,
  qq: any,
  aiPrompt: string,
  tags: string[]
): GuideChapter {
  return {
    id,
    slug,
    grade: "IV",
    phase,
    title,
    shortTitle,
    kd,
    emoji,
    description,
    overview,
    suggestedDuration: duration,
    semester,
    chapterNumber,
    learningGoals: goals,
    keywords,
    remedial,
    enrichment,
    teachingContent: tc as any,
    exampleText,
    learningActivities: activities,
    worksheet,
    assessment,
    rubric,
    differentiation,
    teacherNotes: tn,
    reflection,
    readingPractice: rp,
    quickQuiz: qq,
    aiContextPrompt: aiPrompt,
    sourceBasis,
    reviewStatus,
    tags,
    isReady: false,
  }
}

const data: GradeData = {
  grade: "IV",
  label: "Kelas IV",
  phase: "B",
  semesters: [
    {
      semester: 1,
      chapters: [
        ch(
          "iv-teks-deskripsi-lingkungan", "teks-deskripsi-lingkungan",
          "Bab 1: Teks Deskripsi Lingkungan", "Deskripsi Lingkungan", "3.1/4.1", "\ud83c\udf3f",
          "Mengenal teks deskripsi tentang lingkungan sekitar, mengidentifikasi objek yang dideskripsikan, dan menulis teks deskripsi dengan panca indera.",
          "Bab ini mengajak siswa kelas IV mengamati lingkungan sekitar dan menuangkannya dalam teks deskripsi. Berbeda dengan kelas III yang baru mulai mengenal deskripsi sederhana, di kelas IV siswa belajar mendeskripsikan objek secara lebih terperinci dengan melibatkan panca indera. Siswa belajar mengidentifikasi objek yang dideskripsikan, memahami struktur teks deskripsi (identifikasi, deskripsi bagian, penutup), dan menggunakan kata sifat serta kata depan lokasi. Pendekatan berbasis pengamatan langsung membuat siswa lebih mudah menuangkan ide. Guru membimbing siswa dari pengamatan sederhana di lingkungan sekolah hingga menulis deskripsi paragraf utuh.",
          "18 JP x 35 menit", 1, 1,
          [
            "Mengenal teks deskripsi sebagai teks yang menggambarkan suatu objek secara terperinci",
            "Mengidentifikasi objek yang dideskripsikan dalam teks",
            "Menjelaskan struktur teks deskripsi: identifikasi, deskripsi bagian, penutup",
            "Menggunakan kata sifat dan kata depan lokasi dalam menulis deskripsi",
            "Menggunakan panca indera untuk menggambarkan objek secara hidup",
            "Menulis teks deskripsi 3-4 paragraf tentang lingkungan sekitar"
          ],
          ["deskripsi","pengamatan","panca indera","kata sifat","objek","identifikasi","deskripsi bagian","lingkungan","kata depan","kalimat perinci"],
          [
            "Bimbingan khusus mengamati satu objek secara langsung dan mendeskripsikannya secara lisan.",
            "Latihan tambahan melengkapi kalimat rumpang dengan kata sifat yang tepat.",
            "Pendampingan saat menulis \u2014 guru menyediakan kerangka deskripsi yang tinggal diisi.",
            "Menggunakan media gambar objek untuk membantu siswa menemukan kata sifat."
          ],
          [
            "Mendeskripsikan objek yang lebih kompleks seperti suasana pasar atau taman kota.",
            "Menulis deskripsi dari sudut pandang berbeda (seperti serangga kecil atau burung).",
            "Membandingkan dua objek sejenis dan menulis deskripsi perbandingan."
          ],
          require("./chapters/iv-s1-c1-tc.json"),
          require("./chapters/iv-s1-c1-example.json"),
          require("./chapters/iv-s1-c1-activities.json"),
          require("./chapters/iv-s1-c1-worksheet.json"),
          require("./chapters/iv-s1-c1-assessment.json"),
          require("./chapters/iv-s1-c1-rubric.json"),
          require("./chapters/iv-s1-c1-diff.json"),
          require("./chapters/iv-s1-c1-tn.json"),
          require("./chapters/iv-s1-c1-reflection.json"),
          require("./chapters/iv-s1-c1-rp.json"),
          require("./chapters/iv-s1-c1-qq.json"),
          "Panduan Bab 1 (S1) Teks Deskripsi Lingkungan untuk kelas IV SD Fase B.",
          ["fase-b","kelas-4","deskripsi","lingkungan","panca-indera","kata-sifat","observasi","semester-1"]
        ),
        // ... more chapters
      ]
    }
  ]
}

const output = `import type { GradeData } from "./types"\n\nexport const kelasIV: GradeData = ${JSON.stringify(data, null, 2)}\n`

writeFileSync(path.join(__dirname, "guides-iv.ts"), output, "utf-8")
console.log("Written successfully")
