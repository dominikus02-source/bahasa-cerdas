"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const endpoint = "/api/admin/guardian-consent";
const guardianPage = "/auth/guardian-consent";
const statusLabels = { PENDING: "Menunggu persetujuan", GRANTED: "Disetujui", DECLINED: "Ditolak", REVOKED: "Dicabut" };

type ClassOption = { id: string; name: string; teacher: { fullName: string } };
type Student = { id: string; name: string; status: keyof typeof statusLabels | null };
type Roster = { id: string; name: string; teacher: string; guardianReady: boolean; students: Student[] };

async function read<T>(params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${endpoint}?${new URLSearchParams(params)}`, { cache: "no-store", signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Data belum dapat dimuat.");
  return result as T;
}

export default function ClassGuardianConsentPage() {
  const [query, setQuery] = useState("");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [groupId, setGroupId] = useState("");
  const [roster, setRoster] = useState<Roster | null>(null);
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      read<{ classes: ClassOption[] }>({ classSearch: query }, controller.signal)
        .then((result) => setClasses(result.classes))
        .catch((failure: Error) => { if (!controller.signal.aborted) setError(failure.message); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => {
    if (!groupId) return;
    const controller = new AbortController();
    read<Roster>({ groupId }, controller.signal)
      .then((result) => setRoster(result))
      .catch((failure: Error) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [groupId]);

  async function linkStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const date = new Date(String(fields.get("verifiedUntil")));
    if (!Number.isFinite(date.getTime()) || date <= new Date()) {
      setError("Masa berlaku verifikasi harus berada di masa mendatang.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          students: [{
            studentUserId: studentId,
            reviewReference: fields.get("reviewReference"),
            verifiedUntil: date.toISOString(),
            ageChecked: fields.has("ageChecked"),
            guardianRelationshipChecked: fields.has("guardianRelationshipChecked"),
            guardianAuthorityChecked: fields.has("guardianAuthorityChecked"),
          }],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Penautan gagal.");
      setRoster((current) => current && {
        ...current,
        students: current.students.map((student) => student.id === studentId ? { ...student, status: "PENDING" } : student),
      });
      setStudentId("");
      setMessage("Akun ditautkan. Guru masih perlu memberi persetujuan di halaman wali.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Penautan belum berhasil.");
    } finally {
      setBusy(false);
    }
  }

  const selectedStudent = roster?.students.find((student) => student.id === studentId);
  return (
    <main className="mx-auto max-w-3xl space-y-5 text-bc-text">
      <h1 className="text-bc-h1 font-semibold">Persetujuan wali per kelas</h1>
      <Card variant="surface" className="space-y-4 p-5">
        <Field label="Cari kelas aktif">
          {(props) => <Input {...props} variant="bc" value={query} maxLength={100} disabled={busy} onChange={(event) => setQuery(event.target.value)} />}
        </Field>
        <label className="block space-y-1">
          <span>Pilih kelas</span>
          <select className="block w-full rounded-bc-ctl border border-bc-line bg-bc-field p-3" value={groupId} disabled={busy} onChange={(event) => {
            setGroupId(event.target.value);
            setRoster(null);
            setStudentId("");
            setError("");
            setMessage("");
          }}>
            <option value="">Pilih kelas aktif</option>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.teacher.fullName}</option>)}
          </select>
        </label>
      </Card>
      {error && <p className="text-bc-danger" role="alert">{error}</p>}
      {message && <p role="status">{message} <a className="underline" href={guardianPage}>Buka halaman wali</a></p>}
      {groupId && !roster && !error && <p role="status">Memuat daftar murid…</p>}
      {roster && (
        <Card variant="surface" className="space-y-4 p-5">
          <h2 className="text-bc-h2 font-semibold">{roster.name}</h2>
          <p>Guru pengelola: {roster.teacher}</p>
          {!roster.guardianReady && <p>Akun guru pengelola belum dapat ditautkan.</p>}
          {roster.students.length === 0 && <p>Belum ada akun murid yang dapat ditinjau di kelas ini.</p>}
          <ul className="divide-y divide-bc-line">
            {roster.students.map((student) => (
              <li className="flex flex-wrap items-center justify-between gap-2 py-2" key={student.id}>
                <span>{student.name}</span>
                {student.status
                  ? <span className="text-bc-text-2">{statusLabels[student.status]}</span>
                  : <Button type="button" variant="secondary" size="sm" disabled={busy || !roster.guardianReady} onClick={() => {
                    setStudentId(student.id);
                    setError("");
                    setMessage("");
                  }}>Tinjau</Button>}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {selectedStudent && !selectedStudent.status && (
        <Card variant="surface" className="p-5" key={selectedStudent.id}>
          <form className="space-y-4" onSubmit={linkStudent}>
            <h2 className="text-bc-h2 font-semibold">Tinjau {selectedStudent.name}</h2>
            <Field label="Nomor referensi peninjauan" hint="Gunakan kode catatan internal.">
              {(props) => <Input {...props} variant="bc" name="reviewReference" required minLength={6} maxLength={64} />}
            </Field>
            <Field label="Verifikasi berlaku hingga">
              {(props) => <Input {...props} variant="bc" name="verifiedUntil" type="datetime-local" required />}
            </Field>
            <label className="flex items-start gap-2"><input name="ageChecked" type="checkbox" required />Usia murid sudah diperiksa.</label>
            <label className="flex items-start gap-2"><input name="guardianRelationshipChecked" type="checkbox" required />Hubungan guru dengan murid sudah diperiksa.</label>
            <label className="flex items-start gap-2"><input name="guardianAuthorityChecked" type="checkbox" required />Kewenangan guru sebagai wali sudah diperiksa.</label>
            <Button type="submit" variant="primary" disabled={busy}>Tautkan sebagai wali</Button>
          </form>
        </Card>
      )}
    </main>
  );
}
