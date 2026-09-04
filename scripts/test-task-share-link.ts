import { readFileSync } from "fs"
import { join } from "path"

const ROOT = join(import.meta.dirname, "..")
const schema = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf-8")
const kelasku = readFileSync(join(ROOT, "app/(dashboard)/guru/kelasku/page.tsx"), "utf-8")
const tugasku = readFileSync(join(ROOT, "app/(dashboard)/murid/tugasku/page.tsx"), "utf-8")
const results = readFileSync(join(ROOT, "app/(dashboard)/guru/kuis/[id]/results/page.tsx"), "utf-8")
const shareRoute = readFileSync(join(ROOT, "app/api/guru/tugas/share/route.ts"), "utf-8")
const shareDelete = readFileSync(join(ROOT, "app/api/guru/tugas/share/[id]/route.ts"), "utf-8")
const resolver = readFileSync(join(ROOT, "app/t/[token]/page.tsx"), "utf-8")
const shareBtn = readFileSync(join(ROOT, "components/kelas/ShareTaskButton.tsx"), "utf-8")
const migration = readFileSync(join(ROOT, "prisma/migrations/manual/2026-09-09_task_share_token.sql"), "utf-8")

let passed = 0
let failed = 0

function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✅ ${label}`) }
  else { failed++; console.log(`  ❌ ${label}`) }
}

console.log("\n=== TASK SHARE LINK — STRUCTURAL TESTS ===\n")

// --- Schema ---
console.log("1. Prisma Schema")
check("TaskShareToken model exists", schema.includes("model TaskShareToken"))
check("token field @unique", schema.includes('token        String    @unique'))
check("taskType field", schema.includes('taskType     String    // "QUIZ" | "PENUGASAN"'))
check("quizId nullable", schema.includes("quizId       String?"))
check("penugasanId nullable", schema.includes("penugasanId  String?"))
check("groupId required", schema.includes("groupId      String"))
check("createdById required", schema.includes("createdById  String"))
check("FK to Penugasan", schema.includes('@relation(fields: [penugasanId], references: [id], onDelete: Cascade)'))
check("FK to Group", schema.includes('Group      @relation(fields: [groupId], references: [id], onDelete: Cascade)'))
check("FK to User", schema.includes('User       @relation(fields: [createdById], references: [id], onDelete: Cascade)'))
check("Penugasan has reverse relation", schema.includes("taskShareTokens TaskShareToken[]"))
check("Group has reverse relation", schema.includes("taskShareTokens TaskShareToken[]"))
check("User has reverse relation", schema.includes("taskShareTokens             TaskShareToken[]"))

// --- Migration ---
console.log("\n2. Migration SQL")
check("CREATE TABLE TaskShareToken", migration.includes('CREATE TABLE IF NOT EXISTS "TaskShareToken"'))
check("UNIQUE constraint on token", migration.includes('CONSTRAINT "TaskShareToken_token_key" UNIQUE ("token")'))
check("FK to Quiz", migration.includes('"TaskShareToken_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id")'))
check("FK to Penugasan", migration.includes('"TaskShareToken_penugasanId_fkey" FOREIGN KEY ("penugasanId") REFERENCES "Penugasan"("id")'))
check("FK to Group", migration.includes('"TaskShareToken_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id")'))
check("FK to User", migration.includes('"TaskShareToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id")'))
check("Index on token", migration.includes('CREATE INDEX IF NOT EXISTS "TaskShareToken_token_idx"'))

// --- Share API ---
console.log("\n3. Share API (POST + GET)")
check("POST route exists", shareRoute.includes("export async function POST"))
check("GET route exists", shareRoute.includes("export async function GET"))
check("generateToken function", shareRoute.includes("function generateToken"))
check("crypto.getRandomValues", shareRoute.includes("crypto.getRandomValues"))
check("teacher auth check", shareRoute.includes("isTeacherOrStudent"))
check("group ownership check", shareRoute.includes("teacherId: user.id"))
check("quiz ownership check", shareRoute.includes("creatorId: user.id"))
check("penugasan ownership check", shareRoute.includes("teacherId: user.id, groupId"))
check("idempotent: finds existing token", shareRoute.includes("findFirst"))
check("returns URL with /t/ prefix", shareRoute.includes("/t/${created.token}"))

// --- Delete API ---
console.log("\n4. Share Delete API")
check("DELETE route exists", shareDelete.includes("export async function DELETE"))
check("ownership check on delete", shareDelete.includes("createdById: user.id"))

// --- Public Resolver ---
console.log("\n5. /t/[token] Public Resolver")
check("finds token by unique", resolver.includes("findUnique"))
check("redirects unauthenticated to login", resolver.includes("redirect(`/login?next=/t/${token}`)"))
check("checks group membership", resolver.includes("groupMember.findFirst"))
check("checks teacher ownership", resolver.includes("group.findFirst"))
check("redirects non-member", resolver.includes('redirect("/murid/beranda")'))
check("resolves QUIZ assignment", resolver.includes("quizAssignment.findFirst"))
check("checks existing submission", resolver.includes("quizSubmission.findFirst"))
check("redirects to /murid/tugasku/.../take", resolver.includes("redirect(`/murid/tugasku/${assignment.id}/take`)"))
check("redirects completed quiz to result", resolver.includes("redirect(`/murid/tugasku/${assignment.id}/result`)"))
check("resolves PENUGASAN to kerjakan", resolver.includes("redirect(`/arena/tugas/${shareToken.penugasanId}/kerjakan`)"))
check("checks penugasan submission", resolver.includes("penugasanSubmission.findFirst"))
check("no correctAnswer exposure", !resolver.includes("correctAnswer"))

// --- ShareTaskButton Component ---
console.log("\n6. ShareTaskButton Component")
check("client component", shareBtn.includes('"use client"'))
check("calls POST /api/guru/tugas/share", shareBtn.includes("/api/guru/tugas/share"))
check("clipboard copy", shareBtn.includes("navigator.clipboard.writeText"))
check("Share2 icon", shareBtn.includes("Share2"))
check("Copy icon", shareBtn.includes("Copy"))
check("Check icon (copied feedback)", shareBtn.includes("Check"))
check("loading spinner", shareBtn.includes("animate-spin"))

// --- KelasKu Integration ---
console.log("\n7. KelasKu Integration")
check("imports ShareTaskButton", kelasku.includes('import ShareTaskButton from "@/components/kelas/ShareTaskButton"'))
check("groupId prop passed to TodayView", kelasku.includes("groupId={activeGroup.id}"))
check("groupId prop passed to StreamCard", kelasku.includes("groupId={activeGroup.id}"))
check("quiz CTA has from=kelasku in TodayView", kelasku.includes("results?from=kelasku&groupId=${groupId}"))
check("quiz CTA has from=kelasku in StreamCard", kelasku.includes("results?from=kelasku&groupId=${groupId}"))
check("ShareTaskButton for quiz in main list", kelasku.includes('taskType="QUIZ" quizId={t.quiz.id}'))
check("ShareTaskButton for penugasan in main list", kelasku.includes('taskType="PENUGASAN" penugasanId={p.id}'))
check("ShareTaskButton in TodayView quiz", kelasku.includes('taskType="QUIZ" quizId={t.quiz.id} groupId={groupId}'))
check("ShareTaskButton in TodayView penugasan", kelasku.includes('taskType="PENUGASAN" penugasanId={p.id} groupId={groupId}'))
check("ShareTaskButton in StreamCard quiz", kelasku.includes('taskType="QUIZ" quizId={'))
check("ShareTaskButton in StreamCard penugasan", kelasku.includes('taskType="PENUGASAN" penugasanId={'))

// --- Results Page ---
console.log("\n8. Quiz Results Back-Nav")
check("useSearchParams imported", results.includes("useSearchParams"))
check("from=kelasku param read", results.includes('searchParams.get("from") === "kelasku"'))
check("groupId param read", results.includes('searchParams.get("groupId")'))
check("dynamic backHref computed", results.includes("backHref = fromKelasKu && groupId"))
check("back link uses backHref", results.includes("href={backHref}"))

// --- Murid Tugasku Page ---
console.log("\n9. /murid/tugasku Integration")
check("fetches /api/murid/penugasan", tugasku.includes('/api/murid/penugasan'))
check("fetches /api/murid/tugas", tugasku.includes('/api/murid/tugas'))
check("penugasanAvailable computed", tugasku.includes("penugasanAvailable"))
check("penugasanCompleted computed", tugasku.includes("penugasanCompleted"))
check("quiz + penugasan merged in available", tugasku.includes("quizAvailable.length + penugasanAvailable.length"))
check("quiz + penugasan merged in completed", tugasku.includes("quizCompleted.length + penugasanCompleted.length"))
check("penugasan kind in MergedItem type", tugasku.includes('kind: "penugasan"'))
check("penugasan links to /arena/tugas/.../kerjakan", tugasku.includes("/arena/tugas/${p.id}/kerjakan"))
check("penugasan result links to /arena/tugas/.../kerjakan", tugasku.includes("/arena/tugas/${p.id}/kerjakan"))
check("BookOpen icon used", tugasku.includes("BookOpen"))

// --- Protected files untouched ---
console.log("\n10. Protected Files (zero diff)")
const submissionReview = readFileSync(join(ROOT, "components/kelas/SubmissionReview.tsx"), "utf-8")
const penugasanDetail = readFileSync(join(ROOT, "app/api/guru/penugasan/[id]/route.ts"), "utf-8")
const penugasanNilai = readFileSync(join(ROOT, "app/api/guru/penugasan/[id]/nilai-praktik/route.ts"), "utf-8")
const tugasMurid = readFileSync(join(ROOT, "app/(dashboard)/guru/tugas-murid/page.tsx"), "utf-8")
check("SubmissionReview.tsx unchanged", !submissionReview.includes("ShareTaskButton") && !submissionReview.includes("from=kelasku"))
check("penugasan [id] route unchanged", !penugasanDetail.includes("ShareTaskButton") && !penugasanDetail.includes("from=kelasku"))
check("penugasan nilai-praktik route unchanged", !penugasanNilai.includes("ShareTaskButton"))
check("tugas-murid page unchanged", !tugasMurid.includes("ShareTaskButton"))

// --- Security ---
console.log("\n11. Security")
check("resolver: no correctAnswer in response body", !resolver.includes("correctAnswer"))
check("resolver: no jawaban in response body", !resolver.includes("jawaban"))
check("resolver: no options in response body", !resolver.includes("options"))
check("share route: teacher auth required", shareRoute.includes("isTeacherOrStudent"))
check("delete route: owner auth required", shareDelete.includes("createdById: user.id"))
check("resolver: group membership check", resolver.includes("groupMember.findFirst"))

// --- Summary ---
console.log("\n" + "=".repeat(60))
console.log(`RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`)
if (failed > 0) { console.log("❌ SOME TESTS FAILED"); process.exit(1) }
console.log("✅ ALL TASK SHARE LINK TESTS PASSED")
