import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { getTeacherStudentIds, isTeacherOrStudent } from "@/lib/teacher/students"
import { TeacherFeedbackEditor } from "@/components/guru/simulasi/TeacherFeedbackEditor"
import type { AttemptAnswerDetails } from "@/lib/types/snapshot"

export const dynamic = "force-dynamic"

export default async function DetailHasilSimulasi({ params }: { params: Promise<{ progresId: string }> }) {
  const { progresId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const teacher = await db.user.findUnique({ where: { supabaseId: user.id } })
  if (!isTeacherOrStudent(teacher)) notFound()

  // Access is based on active teacher-owned class membership, not a supplied student ID.
  const studentIds = await getTeacherStudentIds(teacher!.id)
  const result = await db.progresKompetensi.findFirst({
    where: { id: progresId, userId: { in: studentIds }, status: "COMPLETED" },
    include: { user: { select: { fullName: true } }, paket: { select: { title: true, type: true } } },
  })
  if (!result) notFound()

  const feedback = await db.simulationTeacherFeedback.findMany({
    where: { progresId, teacherId: teacher!.id },
    select: { questionId: true, note: true },
  })
  const notes = new Map(feedback.map((f) => [f.questionId, f.note]))
  const details = result.answerDetails as unknown as AttemptAnswerDetails | null
  const snapshot = details?.snapshot
  const answers = new Map((details?.userAnswers || []).map((a) => [a.questionId, a]))
  const questions = snapshot?.questions || []
  const order = snapshot?.questionOrder?.length ? snapshot.questionOrder : questions.map((q) => q.id)
  const questionMap = new Map(questions.map((q) => [q.id, q]))
  const rows = order.map((id, i) => {
    const q = questionMap.get(id)
    const a = answers.get(id)
    const selected = a?.selectedOptionId || a?.selectedAnswer || ""
    const correct = a?.isCorrect === true
    const unanswered = !selected
    return { number: i + 1, q, selected, correct, unanswered, answer: a }
  })
  const correctCount = rows.filter((r) => r.correct).length
  const wrongCount = rows.filter((r) => !r.correct && !r.unanswered).length
  const blankCount = rows.filter((r) => r.unanswered).length

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <Link href="/guru/evaluasi-simulasi?tab=hasil" className="text-sm font-semibold text-blue-700">← Kembali ke Laporan Simulasi</Link>
      <header className="rounded-2xl border bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Laporan diagnostik simulasi</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{result.user.fullName}</h1>
        <p className="mt-1 text-sm text-slate-600">{result.paket.title} · Percobaan {result.attemptNumber}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Nilai", String(result.percentage ?? 0) + "%"],
            ["Benar", String(correctCount)],
            ["Salah", String(wrongCount)],
            ["Tidak dijawab", String(blankCount)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </header>
      <TeacherFeedbackEditor progresId={progresId} questionId="" initialNote={notes.get("") || ""} />
      {!snapshot ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Rincian per nomor belum tersedia untuk percobaan ini. Nilai tetap tersimpan; jawaban atau snapshot soal tidak direkonstruksi dari kunci terbaru.
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Analisis per nomor</h2>
          {rows.map(({ number, q, selected, correct, unanswered }) => (
            <article key={number} className="rounded-xl border bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Nomor {number} · {q?.kompetensi || q?.section || "Umum"}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${unanswered ? "bg-slate-100 text-slate-600" : correct ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {unanswered ? "Tidak dijawab" : correct ? "Benar" : "Salah"}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{q?.text || "Teks soal tidak tersedia"}</p>
              {q?.options?.length ? <ul className="mt-3 space-y-1 text-sm">{q.options.map((o) => <li key={o.id} className="rounded bg-slate-50 px-3 py-2">{o.id}. {o.text}</li>)}</ul> : null}
              <div className="mt-3 space-y-1 text-sm">
                <p>Jawaban murid: <strong>{selected || "Tidak dijawab"}</strong></p>
                <p>Kunci jawaban: <strong>{q?.correctAnswer || "Tidak tersedia"}</strong></p>
              </div>
              {q && <TeacherFeedbackEditor progresId={progresId} questionId={q.id} initialNote={notes.get(q.id) || ""} />}
            </article>
          ))}
          {rows.length === 0 && <p className="text-sm text-slate-600">Tidak ada rincian soal pada snapshot ini.</p>}
        </section>
      )}
    </main>
  )
}
