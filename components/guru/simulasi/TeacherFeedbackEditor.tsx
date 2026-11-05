"use client"

import { useState } from "react"

export function TeacherFeedbackEditor({ progresId, questionId, initialNote }: { progresId: string; questionId: string; initialNote: string }) {
  const [note, setNote] = useState(initialNote)
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  async function save() {
    setState("saving")
    try {
      const response = await fetch("/api/guru/simulasi/feedback", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progresId, questionId, note }),
      })
      if (!response.ok) throw new Error("Gagal")
      setState("saved")
    } catch { setState("error") }
  }
  return <div className="mt-4 space-y-2">
    <label className="block text-sm font-semibold text-slate-700" htmlFor={`note-${questionId || "general"}`}>Catatan guru {questionId ? "untuk soal ini" : "untuk hasil keseluruhan"}</label>
    <textarea id={`note-${questionId || "general"}`} value={note} onChange={(e) => { setNote(e.target.value); setState("idle") }} maxLength={3000} rows={2} className="w-full rounded-lg border border-slate-300 p-3 text-sm" placeholder="Tuliskan arahan perbaikan untuk murid..." />
    <div className="flex items-center gap-3">
      <button type="button" disabled={state === "saving"} onClick={save} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{state === "saving" ? "Menyimpan..." : "Simpan catatan"}</button>
      <span role="status" className="text-xs text-slate-600">{state === "saved" ? "Tersimpan" : state === "error" ? "Gagal menyimpan. Coba lagi." : ""}</span>
    </div>
  </div>
}
