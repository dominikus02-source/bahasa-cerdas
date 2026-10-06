"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Clock3,
  Code2,
  ExternalLink,
  Gamepad2,
  GitBranch,
  Layers3,
  Sparkles,
  Wrench,
} from "lucide-react";

const stages = [
  { title: "Fondasi permainan Grok", status: "Selesai", progress: 100, note: "Mesin 3D, kamera, gerak, serangan, kombo, dash, musuh, bos, efek, audio, dan progresi dipertahankan sebagai fondasi." },
  { title: "Karakter Pendekar Suryakerta", status: "Berjalan", progress: 70, note: "Ksatria generik sudah diganti dengan model pendekar bergaya low-poly dan gerak dasar." },
  { title: "Arena kecil & rasa bermain", status: "Berjalan", progress: 45, note: "Fokus berikutnya: ruang arena, ritme pertempuran, benturan, kamera, dan keterbacaan serangan." },
  { title: "Pemolesan visual", status: "Berikutnya", progress: 0, note: "Animasi karakter, musuh, pencahayaan, lingkungan, efek, dan aset final." },
  { title: "Integrasi BahasaCerdas", status: "Belum dimulai", progress: 0, note: "Belum menyentuh sistem murid, soal, AI, akun, atau data produksi." },
  { title: "Uji produksi", status: "Belum dimulai", progress: 0, note: "Build, perangkat seluler, performa, dan gerbang rilis akan diuji setelah rasa bermain disetujui." },
];

const statusClass: Record<string, string> = {
  Selesai: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  Berjalan: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  Berikutnya: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  "Belum dimulai": "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </div>
  );
}

export default function AdminGameLabPage() {
  return (
    <main className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-violet-600 dark:text-violet-400">
            <Gamepad2 className="h-4 w-4" /> LAB PERMAINAN
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-3xl">Pendekar Suryakerta</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Ruang pemantauan pengembangan permainan. Eksperimen masih terisolasi dan belum memengaruhi permainan produksi BahasaCerdas.
          </p>
        </div>
        <a
          href="https://github.com/dominikus02-source/gimbc/tree/feat/pendekar-suryakerta-arcade-v03/game/pendekar-suryakerta"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Buka Sumber Permainan <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Progres keseluruhan" value="36%" note="Gabungan tahap eksperimen" />
        <Stat label="Versi" value="v05" note="Port fondasi Grok" />
        <Stat label="Cabang" value="Eksperimen" note="Tidak masuk main" />
        <Stat label="Tahap" value="Uji rasa" note="Belum integrasi BC" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5 shadow-sm dark:border-violet-900/60 dark:from-violet-950/40 dark:via-slate-900 dark:to-indigo-950/30">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white"><Sparkles className="h-5 w-5" /></div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Fokus sekarang: rasa bermain</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Kita memakai mesin permainan Grok sebagai fondasi. Target tahap ini bukan menambah banyak fitur, tetapi memastikan gerak, kamera, serangan, benturan, musuh, dan ritmenya terasa enak.
              </p>
            </div>
          </div>
          <div className="shrink-0 rounded-xl bg-white/80 px-4 py-3 text-center shadow-sm dark:bg-slate-900/70">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
            <p className="mt-0.5 text-sm font-extrabold text-violet-700 dark:text-violet-300">UJI MAIN</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-2"><Layers3 className="h-5 w-5 text-violet-500" /><div><h2 className="font-bold text-slate-900 dark:text-white">Tahapan pengembangan</h2><p className="text-xs text-slate-400">Status dicatat dari eksperimen branch permainan.</p></div></div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {stages.map((stage) => (
            <div key={stage.title} className="p-5">
              <div className="flex items-start gap-3">
                {stage.progress === 100 ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" /> : stage.progress > 0 ? <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white">{stage.title}</h3>
                    <span className={"inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-bold " + statusClass[stage.status]}>{stage.status}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all" style={{ width: stage.progress + "%" }} /></div>
                  <div className="mt-2 flex items-start justify-between gap-3"><p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{stage.note}</p><span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-300">{stage.progress}%</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/90 lg:col-span-2">
          <div className="flex items-center gap-2"><Wrench className="h-5 w-5 text-violet-500" /><h2 className="font-bold text-slate-900 dark:text-white">Fondasi yang sudah tersedia</h2></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {["Kamera 3D", "Gerak & dash", "Stamina", "Serangan & kombo", "Hit-stop & trauma kamera", "Telegraph musuh", "Musuh & bos", "Proyektil", "Gelombang", "Relic & peningkatan", "Partikel", "Audio"].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600 dark:bg-slate-900/60 dark:text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {item}</div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
          <div className="flex items-center gap-2"><GitBranch className="h-5 w-5 text-violet-500" /><h2 className="font-bold text-slate-900 dark:text-white">Sumber eksperimen</h2></div>
          <dl className="mt-4 space-y-3 text-xs">
            <div><dt className="text-slate-400">Repositori</dt><dd className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">gimbc</dd></div>
            <div><dt className="text-slate-400">Cabang</dt><dd className="mt-0.5 break-all font-mono text-[11px] text-slate-700 dark:text-slate-200">feat/pendekar-suryakerta-arcade-v03</dd></div>
            <div><dt className="text-slate-400">Versi</dt><dd className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">Port Grok v05</dd></div>
            <div><dt className="text-slate-400">Rilis produksi</dt><dd className="mt-0.5 font-semibold text-amber-600">Belum</dd></div>
          </dl>
          <a href="https://github.com/dominikus02-source/gimbc/tree/feat/pendekar-suryakerta-arcade-v03/game/pendekar-suryakerta" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400">
            Lihat branch eksperimen <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </section>
      </div>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex items-start gap-3"><Code2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" /><div><h2 className="font-bold text-slate-800 dark:text-slate-200">Catatan pengembang</h2><p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Halaman ini adalah panel pemantauan internal. Data progres belum berasal dari basis data produksi dan tidak digunakan sebagai data permainan murid. Setelah fondasi permainan disetujui, panel ini dapat dikembangkan menjadi pemantauan versi, uji perangkat, dan gerbang rilis.</p></div></div>
      </section>
    </main>
  );
}
