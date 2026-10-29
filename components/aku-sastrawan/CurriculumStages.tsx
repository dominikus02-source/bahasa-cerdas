"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Lock, Circle } from "lucide-react";

type Stage = { title: string; detail: string; lessons: string[] };
type ProgressItem = { stageIndex: number; completed: boolean };

export function CurriculumStages({
  track,
  stages,
  hasAccess,
}: {
  track: string;
  stages: Stage[];
  hasAccess: boolean;
}) {
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/aku-sastrawan/progress?track=${track}`)
      .then((r) => r.json())
      .then((data) => {
        setProgress(data.progress || []);
      })
      .finally(() => setLoading(false));
  }, [track]);

  const isCompleted = (index: number) => progress.some((p) => p.stageIndex === index && p.completed);
  const canUnlock = (index: number) => index === 0 || isCompleted(index - 1);

  async function toggle(index: number) {
    if (!hasAccess || !canUnlock(index) || saving !== null) return;
    setSaving(index);
    const completed = !isCompleted(index);
    try {
      const res = await fetch("/api/aku-sastrawan/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, stageIndex: index, completed }),
      });
      const data = await res.json();
      if (res.ok) {
        setProgress((prev) => {
          const filtered = prev.filter((p) => p.stageIndex !== index);
          return completed ? [...filtered, data.progress] : filtered;
        });
      }
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Memuat progres…</p>;

  const completedCount = progress.filter((p) => p.completed).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="font-semibold">Progres: {completedCount}/{stages.length} tahap</span>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${(completedCount / stages.length) * 100}%` }} />
        </div>
      </div>
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const completed = isCompleted(index);
          const unlocked = canUnlock(index);
          return (
            <article key={stage.title} className={`rounded-2xl border p-4 sm:p-5 ${completed ? "border-primary/40 bg-primary/5" : "border-border"}`}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggle(index)}
                  disabled={!hasAccess || !unlocked || saving === index}
                  className="mt-0.5 shrink-0 disabled:opacity-50"
                  aria-label={completed ? "Tandai belum selesai" : "Tandai selesai"}
                >
                  {completed ? <CheckCircle2 className="text-primary" size={22} /> : unlocked ? <Circle size={22} className="text-muted-foreground" /> : <Lock size={20} className="text-muted-foreground" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{stage.title}</h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {completed ? "Selesai" : unlocked ? "Siap" : "Terkunci"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{stage.detail}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {stage.lessons.map((lesson) => (
                      <span key={lesson} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs">{lesson}</span>
                    ))}
                  </div>
                  {!hasAccess && unlocked && (
                    <p className="mt-2 text-xs text-amber-600">Aktifkan premium untuk menandai progres.</p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
