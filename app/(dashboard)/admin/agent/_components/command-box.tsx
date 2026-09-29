"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import type { CreateAgentTaskActionResult } from "../actions";

const PRESETS = [
  {
    label: "Audit produksi",
    instruction:
      "Audit production BahasaCerdas sekarang. Cek deployment Vercel terbaru, error/runtime event terbaru, kesehatan operasional database BC, kondisi BC Agent, dan commit GitHub terbaru. Temukan anomali, jelaskan bukti, dan beri rekomendasi tanpa melakukan perubahan.",
  },
  {
    label: "Cek error 1 jam",
    instruction:
      "Cek error production BahasaCerdas dalam 1 jam terakhir. Fokus pada Vercel runtime events, deployment production aktif, dan sinyal database operasional yang relevan. Jelaskan kemungkinan root cause berdasarkan evidence dan sebutkan apa yang masih belum diketahui.",
  },
  {
    label: "Kesehatan BC",
    instruction:
      "Cek kesehatan operasional BahasaCerdas 24 jam terakhir: user aktif/baru, Main Bersama, sesi tes/TKA, AI usage/error, product events, serta kesehatan BC Agent. Laporkan anomali dan rekomendasi read-only.",
  },
  {
    label: "Audit Agent",
    instruction:
      "Audit BC Agent 24 jam terakhir. Cek task lifecycle, tool execution, worker online/stale, Telegram command health, dan kegagalan terbaru. Jangan melakukan perubahan; beri diagnosis dan rekomendasi.",
  },
] as const;

export function AgentCommandBox({
  action,
}: {
  action: (formData: FormData) => Promise<CreateAgentTaskActionResult>;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [instruction, setInstruction] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateAgentTaskActionResult | null>(null);

  const submit = (formData: FormData) => {
    setResult(null);
    startTransition(async () => {
      const res = await action(formData);
      setResult(res);
      if (res.ok) {
        setInstruction("");
        formRef.current?.reset();
        router.refresh();
      }
    });
  };

  return (
    <section
      aria-label="Perintah BC Agent"
      className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 dark:border-violet-900 dark:from-violet-950/30 dark:via-slate-900 dark:to-sky-950/20"
    >
      <div className="border-b border-violet-100 px-5 py-4 dark:border-violet-900/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Perintah untuk BC Agent</h2>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold tracking-wider text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                READ-ONLY
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Perintah dibuat sebagai task kanonik dan diproses worker. Diagnosis boleh berjalan otomatis; perubahan production tetap tidak tersedia dari command box ini.
            </p>
          </div>
          <span className="text-[10px] font-medium text-slate-400">maks. 4.000 karakter</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setInstruction(preset.instruction);
                setResult(null);
              }}
              disabled={pending}
              className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-violet-950/60"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <form
        ref={formRef}
        action={(formData) => submit(formData)}
        className="p-5"
      >
        <textarea
          name="instruction"
          value={instruction}
          onChange={(event) => setInstruction(event.target.value.slice(0, 4_000))}
          placeholder="Contoh: Cek kenapa user tidak bisa simulasi TKA hari ini. Cari bukti dari production, database, deployment, dan repo. Jangan ubah apa pun."
          rows={4}
          disabled={pending}
          className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-600 dark:focus:ring-violet-950"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[10px] text-slate-400">{instruction.length.toLocaleString("id-ID")} / 4.000</span>
          <button
            type="submit"
            disabled={pending || instruction.trim().length < 3}
            className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Mengirim ke Agent…" : "Jalankan diagnosis"}
          </button>
        </div>

        {result && (
          <div
            role="status"
            className={`mt-3 rounded-xl border px-3 py-2.5 text-xs ${
              result.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            }`}
          >
            <span className="font-semibold">{result.message}</span>
            {result.ok && result.taskId && (
              <>
                <span className="mx-1.5 text-slate-400">·</span>
                <Link href={`/admin/agent/tasks/${result.taskId}`} className="font-bold underline underline-offset-2">
                  Buka task
                </Link>
                {result.taskStatus && <span className="ml-1.5 text-[10px] opacity-80">({result.taskStatus})</span>}
              </>
            )}
          </div>
        )}
      </form>
    </section>
  );
}
