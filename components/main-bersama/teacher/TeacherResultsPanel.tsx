"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  Users,
} from "lucide-react";
import type { TeacherSessionView } from "@/src/main-bersama/contracts/views/teacher";
import {
  fetchResultDestinations,
  saveTeacherResultsToKelasku,
  type ResultDestination,
} from "@/lib/main-bersama/api-client";
import {
  buildResultSummary,
  buildResultsCsv,
  resultShareLinks,
} from "@/lib/main-bersama/result-sharing";
import styles from "./results-panel.module.css";

export default function TeacherResultsPanel({
  view,
  className,
}: {
  view: TeacherSessionView;
  className?: string | null;
}) {
  const [classes, setClasses] = useState<ResultDestination[]>([]);
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [includeStudents, setIncludeStudents] = useState(false);
  const [copied, setCopied] = useState(false);
  const loadClasses = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchResultDestinations(view.sessionId);
      setClasses(data.classes);
      setClassId((current) =>
        data.classes.some((item) => item.id === current)
          ? current
          : data.classId &&
              data.classes.some((item) => item.id === data.classId)
            ? data.classId
            : data.classes.length === 1
              ? data.classes[0].id
              : "",
      );
    } catch (failure) {
      setLoadError(
        failure instanceof Error ? failure.message : "Kelas belum bisa dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [view.sessionId]);
  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);
  const selectedClass = classes.find((item) => item.id === classId);
  const summary = useMemo(
    () => buildResultSummary(view, className, includeStudents),
    [view, className, includeStudents],
  );
  const links = resultShareLinks(
    `Hasil Main Bersama — ${view.contentTitle}`,
    summary,
  );

  async function saveToClass() {
    if (!classId || saving) return;
    setSaving(true);
    setError("");
    setSavedMessage("");
    try {
      const result = await saveTeacherResultsToKelasku(view.sessionId, classId);
      setClasses((current) =>
        current.map((item) =>
          item.id === result.classId
            ? { ...item, savedCount: result.saved }
            : item,
        ),
      );
      const skipped =
        result.skipped.guests +
        result.skipped.outsideClass +
        result.skipped.noQuestions;
      setSavedMessage(
        `${result.saved} nilai tersimpan di ${result.className}.${skipped ? ` ${skipped} peserta tidak dimasukkan karena memakai akun tamu, bukan anggota kelas tujuan, atau belum mengikuti soal.` : ""}`,
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Hasil belum tersimpan. Coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  function downloadCsv() {
    const url = URL.createObjectURL(
      new Blob([buildResultsCsv(view)], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hasil-main-bersama-${view.sessionId.slice(0, 12).replace(/[^a-z0-9-]/gi, "")}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section
      className={styles.panel}
      aria-labelledby="mb-result-delivery-title"
    >
      <div className={styles.header}>
        <span className={styles.icon}>
          <Send size={21} />
        </span>
        <div>
          <h2 id="mb-result-delivery-title">Simpan & bagikan hasil</h2>
          <p>Bawa pencapaian hari ini ke kelas dan orang tua.</p>
        </div>
      </div>
      <div className={styles.columns}>
        <div className={styles.destination}>
          <h3>
            <Users size={16} /> Kirim nilai ke kelas
          </h3>
          <p>
            Nilai disimpan ke Buku Nilai untuk akun siswa yang menjadi anggota
            kelas tujuan.
          </p>
          {loading ? (
            <p role="status" className={styles.loading}>
              <Loader2 size={15} className="animate-spin" /> Memuat kelasmu…
            </p>
          ) : loadError ? (
            <div role="alert" className={styles.error}>
              {loadError}{" "}
              <button type="button" onClick={() => void loadClasses()}>
                Coba lagi
              </button>
            </div>
          ) : classes.length ? (
            <>
              <label htmlFor="mb-results-class">Kelas tujuan</label>
              <select
                id="mb-results-class"
                value={classId}
                onChange={(event) => {
                  setClassId(event.target.value);
                  setSavedMessage("");
                  setError("");
                }}
                disabled={saving}
              >
                <option value="">Pilih kelas…</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.memberCount} anggota
                  </option>
                ))}
              </select>
              {selectedClass?.savedCount ? (
                <p className={styles.savedCount}>
                  <Check size={13} /> {selectedClass.savedCount} nilai dari sesi
                  ini sudah tersimpan.
                </p>
              ) : null}
              <button
                type="button"
                className={styles.primary}
                disabled={!classId || saving || view.participants.length === 0}
                onClick={() => void saveToClass()}
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {saving
                  ? "Menyimpan hasil…"
                  : selectedClass?.savedCount
                    ? "Perbarui nilai di kelas"
                    : "Kirim hasil ke kelas"}
              </button>
              <a className={styles.gradebookLink} href="/guru/gradebook">
                Buka Buku Nilai →
              </a>
            </>
          ) : (
            <p>
              Belum ada kelas aktif. <a href="/guru/kelasku">Buka Kelasku</a>{" "}
              untuk menyiapkan kelas tujuan.
            </p>
          )}
          {savedMessage ? (
            <p role="status" className={styles.success}>
              {savedMessage}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}
        </div>
        <div className={styles.share}>
          <h3>
            <MessageCircle size={16} /> Bagikan hasil permainan
          </h3>
          <p>
            Email dan WhatsApp membuka draf pesan yang dapat kamu periksa
            sebelum dikirim.
          </p>
          <label className={styles.includeStudents}>
            <input
              type="checkbox"
              checked={includeStudents}
              onChange={(event) => {
                setIncludeStudents(event.target.checked);
                setCopied(false);
              }}
            />{" "}
            Sertakan nama dan nilai siswa
          </label>
          <details className={styles.preview}>
            <summary>Pratinjau isi pesan</summary>
            <pre>{summary}</pre>
          </details>
          <div className={styles.shareButtons}>
            <a href={links.email}>
              <Mail size={16} /> Draf email
            </a>
            <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} /> WhatsApp
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(summary);
                  setCopied(true);
                } catch {
                  setError(
                    "Pesan belum tersalin. Gunakan pratinjau isi pesan atau unduh CSV.",
                  );
                }
              }}
            >
              <Copy size={16} /> {copied ? "Pesan tersalin" : "Salin pesan"}
            </button>
            <button type="button" onClick={downloadCsv}>
              <Download size={16} /> Unduh semua hasil CSV
            </button>
          </div>
          <small>
            CSV memuat seluruh peserta, termasuk tamu. Nilai 0–100 dihitung dari
            soal yang diikuti tiap siswa.
          </small>
        </div>
      </div>
    </section>
  );
}
