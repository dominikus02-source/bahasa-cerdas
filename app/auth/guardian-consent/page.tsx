"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const endpoint = "/api/auth/guardian-consent";
const labels = { PENDING: "Menunggu keputusan", GRANTED: "Disetujui", DECLINED: "Ditolak", REVOKED: "Dicabut" };
type Decision = "grant" | "decline" | "revoke";
type Consent = {
  studentAuthId: string;
  studentLabel: string;
  verifiedUntil: string;
  status: keyof typeof labels;
};
type ConsentList = { noticeVersion: string; notice: string; privacyUrl: string; students: Consent[] };

async function loadConsent() {
  const response = await fetch(endpoint, { cache: "no-store" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Persetujuan belum dapat dimuat.");
  return (await response.json()) as ConsentList;
}

export default function GuardianConsentPage() {
  const [list, setList] = useState<ConsentList | null>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    loadConsent().then((result) => {
      if (active) setList(result);
    }).catch(() => {
      if (active) setError("Persetujuan belum dapat dimuat. Muat ulang halaman untuk mencoba lagi.");
    });
    return () => { active = false; };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fields.get("email"), password: fields.get("password") }),
      });
      if (!response.ok) throw new Error((await response.json()).error || "Gagal masuk.");
      form.reset();
      setList(await loadConsent());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Gagal masuk. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(student: Consent, decision: Decision) {
    if (!list || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentAuthId: student.studentAuthId, decision, noticeVersion: list.noticeVersion }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Keputusan belum tersimpan.");
      setList(await loadConsent());
      setMessage("Keputusan tersimpan.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Keputusan belum tersimpan. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-bc-bg px-4 py-10 text-bc-text">
      <div className="mx-auto max-w-xl space-y-5">
        <h1 className="text-bc-h1 font-semibold">Persetujuan orang tua atau wali</h1>
        {error && <p role="alert" className="text-bc-danger">{error}</p>}
        <p role="status">{message || (list === undefined && !error ? "Memuat persetujuan…" : "")}</p>
        {list === null && (
          <Card variant="surface" className="p-5">
            <form onSubmit={signIn} className="space-y-4">
              <Field label="Alamat email">
                {(props) => <Input {...props} variant="bc" name="email" type="email" autoComplete="username" required />}
              </Field>
              <Field label="Kata sandi">
                {(props) => <Input {...props} variant="bc" name="password" type="password" autoComplete="current-password" required />}
              </Field>
              <Button type="submit" variant="primary" disabled={busy}>Masuk sebagai wali</Button>
            </form>
          </Card>
        )}
        {list && (
          <>
            <p className="text-bc-text-2">{list.notice}</p>
            <Link className="inline-block underline" href={list.privacyUrl}>Pemberitahuan Privasi</Link>
            {list.students.length === 0 && <p>Belum ada akun murid yang terhubung dengan akun wali ini.</p>}
            {list.students.map((student) => {
              const expired = Date.parse(student.verifiedUntil) <= Date.now();
              return (
                <Card key={student.studentAuthId} variant="surface" className="space-y-3 p-5">
                  <h2 className="text-bc-h2 font-semibold">{student.studentLabel}</h2>
                  <p>{labels[student.status]}{expired && " · Verifikasi kedaluwarsa"}</p>
                  <div className="flex flex-wrap gap-2">
                    {student.status === "PENDING" && (
                      <>
                        <Button type="button" variant="primary" disabled={busy || expired} onClick={() => decide(student, "grant")}>Berikan persetujuan</Button>
                        <Button type="button" variant="secondary" disabled={busy} onClick={() => decide(student, "decline")}>Tolak</Button>
                      </>
                    )}
                    {student.status === "GRANTED" && (
                      <Button type="button" variant="danger" disabled={busy} onClick={() => decide(student, "revoke")}>Cabut persetujuan</Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </main>
  );
}
