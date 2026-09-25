import Link from "next/link";
import { Beaker, ChevronRight, CircleAlert, ExternalLink, FlaskConical, ShieldCheck } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FOUNDER_LAB_FEATURES, type FounderLabStatus } from "@/lib/founder-lab/registry";

export const dynamic = "force-dynamic";

const STATUS_META: Record<FounderLabStatus, { label: string; className: string }> = {
  BUILDING: { label: "Sedang Dibangun", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  FOUNDER_TEST: { label: "Founder Test", className: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" },
  QA: { label: "QA", className: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300" },
  READY: { label: "Siap Rilis", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" },
  PUBLISHED: { label: "Published", className: "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300" },
};

export default async function FounderLabPage() {
  const user = await getUser();
  if (!user || (!user.isFounder && user.role !== "ADMIN")) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm dark:border-amber-900/50 dark:from-amber-950/30 dark:via-slate-900 dark:to-orange-950/20 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <Beaker className="h-3.5 w-3.5" /> Founder Lab
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
              Tempat menguji fitur sebelum pengguna melihatnya
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Semua fitur di sini sengaja berada di luar navigasi pengguna. Akses preview tetap dijaga server-side dan setiap fitur memiliki status lifecycle yang jelas.
            </p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-xs font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-slate-900/70 dark:text-amber-200">
            <ShieldCheck className="h-4 w-4" />
            Founder / Admin only
          </div>
        </div>
      </div>

      <div className="grid gap-5">
        {FOUNDER_LAB_FEATURES.map((feature) => {
          const status = STATUS_META[feature.status];
          return (
            <article key={feature.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/90 md:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{feature.name}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${status.className}`}>
                      {status.label}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {feature.version}
                    </span>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{feature.description}</p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Yang diuji</p>
                      <ul className="mt-2 space-y-1.5">
                        {feature.focus.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Catatan saat ini</p>
                      <ul className="mt-2 space-y-1.5">
                        {feature.knownIssues.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 lg:w-48">
                  <Link
                    href={feature.previewPath}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    <FlaskConical className="h-4 w-4" /> Buka Preview
                  </Link>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                    <p><span className="font-semibold">Owner:</span> {feature.owner}</p>
                    <p className="mt-0.5"><span className="font-semibold">Update:</span> {feature.lastUpdated}</p>
                    <p className="mt-0.5"><span className="font-semibold">Sandbox:</span> {feature.requiresSandbox ? "Wajib sebelum rilis" : "Tidak wajib"}</p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="flex items-start gap-3">
          <ExternalLink className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Aturan Founder Lab</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Founder Lab bukan tombol publish. Status hanya berubah setelah fitur benar-benar diuji, lalu masuk QA dan gate rilis. Preview langsung tetap membutuhkan server-side authorization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
