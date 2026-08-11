"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Megaphone } from "lucide-react";

interface PengumumanRow {
  id: string;
  judul: string;
  guru: string;
  createdAt: string;
  link: string;
}

interface MateriRow {
  id: string;
  judul: string;
  guru: string;
  link: string;
}

interface SummaryRow {
  pengumuman: PengumumanRow[];
  materi: MateriRow[];
  totalTugas: number;
}

function waktuLalu(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const menit = Math.floor(diff / 60000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} mnt lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  return `${hari} hari lalu`;
}

export function SecondaryLearningInfo() {
  const [summary, setSummary] = useState<SummaryRow | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/murid/dashboard/summary")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .catch(() => null)
      .then((s) => alive && setSummary(s || { pengumuman: [], materi: [], totalTugas: 0 }));
    return () => {
      alive = false;
    };
  }, []);

  const pengumuman = summary?.pengumuman || [];
  const materi = summary?.materi || [];

  return (
    <section aria-label="Kabar kelas" className="px-card px-5 py-5">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone size={15} className="text-[var(--px-gold)]" />
        <h2 className="text-base font-extrabold text-[var(--px-text)]">Kabar Kelas</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[var(--px-text-dim)]">Pengumuman Guru</h3>
            <Link href="/murid/pengumuman" className="text-[11px] font-semibold text-[var(--px-royal-2)] hover:underline">
              Semua
            </Link>
          </div>
          {pengumuman.length === 0 ? (
            <p className="text-[11px] text-[var(--px-text-faint)]">Belum ada pengumuman.</p>
          ) : (
            <ul className="space-y-2">
              {pengumuman.slice(0, 2).map((p) => (
                <li key={p.id}>
                  <Link href={p.link} className="group block">
                    <p className="text-xs font-semibold text-[var(--px-text)] group-hover:text-white transition-colors line-clamp-1">
                      {p.judul}
                    </p>
                    <p className="text-[10px] text-[var(--px-text-faint)] mt-0.5">
                      {p.guru} · {waktuLalu(p.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[var(--px-text-dim)]">Materi dari Guru</h3>
            <Link href="/murid/tugasku" className="text-[11px] font-semibold text-[var(--px-royal-2)] hover:underline">
              Tugas
            </Link>
          </div>
          {materi.length === 0 ? (
            <p className="text-[11px] text-[var(--px-text-faint)]">Belum ada materi.</p>
          ) : (
            <ul className="space-y-2">
              {materi.slice(0, 2).map((m) => (
                <li key={m.id}>
                  <Link href={m.link} className="group block">
                    <p className="text-xs font-semibold text-[var(--px-text)] group-hover:text-white transition-colors line-clamp-1">
                      {m.judul}
                    </p>
                    <p className="text-[10px] text-[var(--px-text-faint)] mt-0.5 line-clamp-1">{m.guru}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/10 flex items-start gap-2 text-[11px] text-[var(--px-text-faint)]">
        <Bell size={13} className="shrink-0 mt-0.5" />
        <p>
          {summary && summary.totalTugas > 0
            ? `Kamu punya ${summary.totalTugas} tugas menunggu. Kerjakan lewat Ruang Tugas.`
            : "Tidak ada tugas yang tertunda. Lanjutkan belajar atau tulis karya barumu!"}
        </p>
      </div>
    </section>
  );
}