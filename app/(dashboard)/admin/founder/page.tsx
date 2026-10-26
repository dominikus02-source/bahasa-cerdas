"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, ScrollText, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTypedConfirm, adminConfirmHeaders } from "@/components/admin/TypedConfirm";

type Founder = { id: string; email: string; fullName: string | null; role: string; isSuperFounder: boolean };
type Entry = {
  id: string;
  actorEmail: string;
  method: string;
  path: string;
  status: number;
  targetUserId: string | null;
  createdAt: string;
};

const fmtWaktu = (d: string) =>
  new Date(d).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }) + " WIB";

/** Founder & Audit: daftar founder (kelola hanya super founder) + log aksi admin. */
export default function FounderAdminPage() {
  const [founders, setFounders] = useState<Founder[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [email, setEmail] = useState("");
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const { confirm: konfirmasi, dialog: dialogKonfirmasi } = useTypedConfirm();

  const muatFounder = useCallback(async () => {
    const res = await fetch("/api/admin/founders", { cache: "no-store" });
    if (!res.ok) return;
    const d = await res.json();
    setFounders(d.founders || []);
    setCanManage(Boolean(d.canManage));
  }, []);

  const muatLog = useCallback(async () => {
    const res = await fetch(`/api/admin/audit-log?page=${page}&q=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (!res.ok) return;
    const d = await res.json();
    setEntries(d.entries || []);
    setPages(d.pages || 1);
  }, [page, q]);

  useEffect(() => {
    void muatFounder();
  }, [muatFounder]);
  useEffect(() => {
    void muatLog();
  }, [muatLog]);

  const ubah = async (aksi: "make-founder" | "revoke-founder", target: string) => {
    const t = target.trim().toLowerCase();
    if (!t) return;
    const ok = await konfirmasi({
      title: aksi === "make-founder" ? "Jadikan founder?" : "Cabut founder?",
      detail:
        aksi === "make-founder"
          ? `${t} akan punya akses admin penuh, Pro seumur hidup, dan lencana Premium Founder.`
          : `${t} kehilangan akses admin, Pro founder, dan lencana. Akun tetap ada.`,
      actionLabel: aksi === "make-founder" ? "Jadikan founder" : "Cabut",
    });
    if (!ok) return;
    setSibuk(true);
    setPesan(null);
    try {
      const res = await fetch(`/api/admin/${aksi}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminConfirmHeaders() },
        body: JSON.stringify({ email: t }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setPesan({ ok: false, teks: d.error || "Gagal." });
      else {
        setPesan({ ok: true, teks: aksi === "make-founder" ? `${t} sekarang founder.` : `Founder ${t} dicabut.` });
        setEmail("");
        await Promise.all([muatFounder(), muatLog()]);
      }
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className="space-y-6">
      {dialogKonfirmasi}
      <div>
        <h1 className="text-2xl font-bold text-bc-text">Founder &amp; Audit</h1>
        <p className="text-sm text-bc-text-2 mt-1">Semua aksi admin yang mengubah data tercatat di sini.</p>
      </div>

      <section className="rounded-bc-card border border-bc-line bg-bc-surface p-4 sm:p-5 space-y-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-bc-text">
          <Crown size={18} aria-hidden="true" className="text-bc-violet" /> Founder ({founders.length})
        </h2>
        <ul className="divide-y divide-bc-line">
          {founders.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-bc-text break-words">{f.fullName || f.email}</p>
                <p className="text-xs text-bc-text-2 break-all">
                  {f.email}
                  {f.isSuperFounder ? " · Super founder" : ""}
                </p>
              </div>
              {canManage && !f.isSuperFounder && (
                <Button variant="secondary" size="sm" disabled={sibuk} onClick={() => ubah("revoke-founder", f.email)}>
                  <UserMinus size={16} aria-hidden="true" /> Cabut
                </Button>
              )}
            </li>
          ))}
        </ul>
        {canManage ? (
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void ubah("make-founder", email);
            }}
          >
            <label htmlFor="email-founder" className="sr-only">
              Email founder baru
            </label>
            <Input
              id="email-founder"
              variant="bc"
              type="email"
              placeholder="email@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button variant="primary" type="submit" disabled={sibuk || !email.trim()}>
              <UserPlus size={16} aria-hidden="true" /> Tambah founder
            </Button>
          </form>
        ) : (
          <p className="text-xs text-bc-text-2">Hanya super founder yang bisa menambah atau mencabut founder.</p>
        )}
        {pesan && (
          <p role="status" className={pesan.ok ? "text-sm text-bc-text" : "text-sm text-bc-danger"}>
            {pesan.teks}
          </p>
        )}
      </section>

      <section className="rounded-bc-card border border-bc-line bg-bc-surface p-4 sm:p-5 space-y-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-bc-text">
          <ScrollText size={18} aria-hidden="true" className="text-bc-info" /> Log aksi admin
        </h2>
        <label htmlFor="cari-log" className="sr-only">
          Cari log
        </label>
        <Input
          id="cari-log"
          variant="bc"
          placeholder="Cari path atau email…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <ul className="divide-y divide-bc-line">
          {entries.length === 0 && <li className="py-3 text-sm text-bc-text-2">Belum ada log.</li>}
          {entries.map((e) => (
            <li key={e.id} className="py-2.5 text-sm">
              <p className="font-mono text-xs text-bc-text break-all">
                {e.method} {e.path} → {e.status}
              </p>
              <p className="text-xs text-bc-text-2 break-all">
                {e.actorEmail} · {fmtWaktu(e.createdAt)}
                {e.targetUserId ? ` · target ${e.targetUserId}` : ""}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </Button>
          <span className="text-xs text-bc-text-2">
            {page} / {pages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Berikutnya
          </Button>
        </div>
      </section>
    </div>
  );
}
