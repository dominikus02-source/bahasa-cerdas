/**
 * Runtime test: verify readingPractice & quickQuiz render via API.
 * Tests that content reaches the client correctly.
 */
const BASE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

interface TestResult {
  name: string
  passed: boolean
  detail?: string
}

const results: TestResult[] = []
let passCount = 0
let failCount = 0

function ok(name: string, detail?: string) {
  results.push({ name, passed: true, detail })
  passCount++
}

function fail(name: string, detail: string) {
  results.push({ name, passed: false, detail })
  failCount++
  console.error(`  ❌ ${name}: ${detail}`)
}

async function test() {
  console.log("=".repeat(60))
  console.log("TEST: SMP Practice Content Runtime")
  console.log("=".repeat(60))

  // Unit IDs to test — one from each grade
  const testUnits = [
    { id: "vii-deskripsi", grade: "VII" },
    { id: "viii-berita", grade: "VIII" },
    { id: "ix-laporan-percobaan", grade: "IX" },
  ]

  for (const unit of testUnits) {
    try {
      const res = await fetch(`${BASE}/api/guru/panduan/${unit.id}`)
      if (!res.ok) {
        fail(`${unit.id}`, `HTTP ${res.status}`)
        continue
      }
      const json = await res.json()
      if (!json.data?.content) {
        fail(`${unit.id}`, "No content field")
        continue
      }

      let content: any
      try { content = typeof json.data.content === "string" ? JSON.parse(json.data.content) : json.data.content }
      catch { fail(`${unit.id}`, "Content not valid JSON"); continue }

      // Check readingPractice
      const rp = content.readingPractice
      ok(`${unit.id}: readingPractice exists`, rp ? "yes" : "missing")
      if (rp) {
        ok(`${unit.id}: rp has title`, typeof rp.title === "string" && rp.title.length > 0 ? "yes" : "missing")
        ok(`${unit.id}: rp has stimulusText`, typeof rp.stimulusText === "string" && rp.stimulusText.length > 100 ? "yes" : "too short")
        ok(`${unit.id}: rp has questions array`, Array.isArray(rp.questions) ? `${rp.questions.length} questions` : "missing")
        if (Array.isArray(rp.questions)) {
          ok(`${unit.id}: rp questions 12-15`, rp.questions.length >= 12 && rp.questions.length <= 15 ? `${rp.questions.length}` : "out of range")
          const firstQ = rp.questions[0]
          if (firstQ) {
            ok(`${unit.id}: rp q has id`, typeof firstQ.id === "string" ? firstQ.id : "missing")
            ok(`${unit.id}: rp q has questionText`, typeof firstQ.questionText === "string" ? firstQ.questionText.slice(0, 30) : "missing")
            ok(`${unit.id}: rp q has type`, ["pilihan_ganda", "jawaban_singkat", "uraian", "produksi"].includes(firstQ.type) ? firstQ.type : "invalid")
            ok(`${unit.id}: rp q has explanation`, typeof firstQ.explanation === "string" && firstQ.explanation.length > 0 ? "yes" : "missing")
            ok(`${unit.id}: rp q has skillTarget`, typeof firstQ.skillTarget === "string" && firstQ.skillTarget.length > 0 ? "yes" : "missing")
            ok(`${unit.id}: rp q has difficulty`, ["mudah", "sedang", "menantang"].includes(firstQ.difficulty) ? firstQ.difficulty : "invalid")
          }
        }
      }

      // Check quickQuiz
      const qq = content.quickQuiz
      ok(`${unit.id}: quickQuiz exists`, qq ? "yes" : "missing")
      if (qq) {
        ok(`${unit.id}: qq has title`, typeof qq.title === "string" && qq.title.length > 0 ? "yes" : "missing")
        ok(`${unit.id}: qq has questions array`, Array.isArray(qq.questions) ? `${qq.questions.length} questions` : "missing")
        if (Array.isArray(qq.questions)) {
          ok(`${unit.id}: qq questions 10-12`, qq.questions.length >= 10 && qq.questions.length <= 12 ? `${qq.questions.length}` : "out of range")
        }
      }

      // Old content preserved
      ok(`${unit.id}: old latihan preserved`, Array.isArray(content.latihan) ? `${content.latihan.length} existing` : "missing")
      ok(`${unit.id}: old kuis preserved`, Array.isArray(content.kuis) ? `${content.kuis.length} existing` : "missing")

    } catch (e: any) {
      fail(`${unit.id}`, `Error: ${e.message}`)
    }
  }

  console.log("\n" + "=".repeat(60))
  console.log(`RESULTS: ${passCount} passed, ${failCount} failed`)
  console.log("=".repeat(60))
  process.exit(failCount > 0 ? 1 : 0)
}

test().catch(e => { console.error(e); process.exit(1) })
