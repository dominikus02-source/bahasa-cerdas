"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  Globe2,
  Loader2,
  LockKeyhole,
  Search,
} from "lucide-react";
import type { SetupPackage } from "./setup-client";
import styles from "./setup.module.css";

type Props = {
  initialPackages: SetupPackage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onLoaded: (packages: SetupPackage[]) => void;
};

export default function QuestionPackageLibrary({
  initialPackages,
  selectedId,
  onSelect,
  onLoaded,
}: Props) {
  const activeRequest = useRef<AbortController | null>(null);
  const [scope, setScope] = useState<"mine" | "public">("mine");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState(initialPackages);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialPackages.length === 30 ? (initialPackages.at(-1)?.id ?? null) : null,
  );
  const [loading, setLoading] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setMessage("");
      try {
        const query = new URLSearchParams({ scope, search });
        const response = await fetch(
          `/api/main-bersama/teacher/question-packages?${query}`,
          { cache: "no-store", signal: controller.signal },
        );
        const data = (await response.json()) as {
          packages?: SetupPackage[];
          nextCursor?: string | null;
          error?: string;
        };
        if (!response.ok || !data.packages)
          throw new Error(data.error ?? "Daftar paket belum tersedia.");
        if (controller.signal.aborted) return;
        setRows(data.packages);
        setNextCursor(data.nextCursor ?? null);
        onLoaded(data.packages);
      } catch (error) {
        if (!controller.signal.aborted)
          setMessage(
            error instanceof Error
              ? error.message
              : "Daftar paket belum tersedia.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      activeRequest.current?.abort();
    };
  }, [scope, search, retry, onLoaded]);

  async function loadMore() {
    if (!nextCursor || loading) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setMessage("");
    try {
      const query = new URLSearchParams({ scope, search, cursor: nextCursor });
      const response = await fetch(
        `/api/main-bersama/teacher/question-packages?${query}`,
        { cache: "no-store", signal: controller.signal },
      );
      const data = (await response.json()) as {
        packages?: SetupPackage[];
        nextCursor?: string | null;
        error?: string;
      };
      if (!response.ok || !data.packages)
        throw new Error(data.error ?? "Paket berikutnya belum tersedia.");
      if (controller.signal.aborted) return;
      const more = data.packages;
      setRows((current) => [
        ...new Map(
          [...current, ...more].map((item) => [item.id, item]),
        ).values(),
      ]);
      setNextCursor(data.nextCursor ?? null);
      onLoaded(data.packages);
    } catch (error) {
      if (!controller.signal.aborted)
        setMessage(
          error instanceof Error
            ? error.message
            : "Paket berikutnya belum tersedia.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  async function setVisibility(item: SetupPackage, isPublic: boolean) {
    setChangingId(item.id);
    setMessage("");
    try {
      const response = await fetch(
        `/api/main-bersama/teacher/question-packages/${encodeURIComponent(item.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublic }),
        },
      );
      const data = (await response.json()) as {
        package?: SetupPackage;
        error?: string;
        message?: string;
      };
      if (!response.ok || !data.package)
        throw new Error(
          data.error ?? data.message ?? "Akses soal belum tersimpan.",
        );
      const updated = data.package;
      setRows((current) =>
        current.flatMap((row) =>
          row.id === updated.id
            ? scope === "public" && !updated.isPublic
              ? []
              : [updated]
            : [row],
        ),
      );
      onLoaded([updated]);
      setMessage(
        isPublic
          ? "Paket publik: guru lain sekarang dapat memainkannya."
          : "Paket privat: hanya kamu yang dapat menggunakannya untuk permainan baru.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Akses soal belum tersimpan.",
      );
    } finally {
      setChangingId(null);
    }
  }

  function resetList() {
    activeRequest.current?.abort();
    setRows([]);
    setNextCursor(null);
    setLoading(true);
    setMessage("");
  }
  function selectScope(value: "mine" | "public") {
    if (value === scope) return;
    resetList();
    setScope(value);
  }
  const displayed = rows.filter((item) =>
    scope === "mine" ? item.isOwner !== false : item.isPublic === true,
  );
  return (
    <div className={styles.library}>
      <div
        className={styles.libraryTabs}
        role="group"
        aria-label="Sumber paket soal"
      >
        <button
          type="button"
          aria-pressed={scope === "mine"}
          disabled={changingId !== null}
          onClick={() => selectScope("mine")}
        >
          <LockKeyhole size={14} /> Paket saya
        </button>
        <button
          type="button"
          aria-pressed={scope === "public"}
          disabled={changingId !== null}
          onClick={() => selectScope("public")}
        >
          <Globe2 size={14} /> Publik dari guru
        </button>
      </div>
      <label className={styles.librarySearch}>
        <Search size={15} aria-hidden />
        <input
          value={search}
          disabled={changingId !== null}
          onChange={(event) => {
            resetList();
            setSearch(event.target.value);
          }}
          maxLength={120}
          placeholder="Cari judul paket atau kelas…"
          aria-label="Cari paket soal"
        />
      </label>
      <p className={styles.libraryHint}>
        {scope === "mine"
          ? "Atur akses paketmu. Soal publik dapat dimainkan guru lain."
          : "Pilih paket publik untuk dimainkan. Isi soal tetap dikelola pembuatnya."}
      </p>
      <ul className={styles.packageList} aria-busy={loading}>
        {displayed.map((item) => (
          <li key={item.id} className={styles.libraryRow}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-pressed={item.id === selectedId}
              className={`${styles.packageItem} ${item.id === selectedId ? styles.packageSelected : ""}`}
            >
              <span className={styles.packageIcon}>
                <BookOpen size={18} aria-hidden />
              </span>
              <span className={styles.packageBody}>
                <span className={styles.packageTitle}>{item.title}</span>
                <span className={styles.packageMeta}>
                  {item.kelas === "Umum"
                    ? "Semua kelas"
                    : `Kelas ${item.kelas}`}{" "}
                  · {item.questionCount} soal
                  {item.creatorName ? ` · ${item.creatorName}` : ""}
                </span>
              </span>
              {item.id === selectedId ? (
                <span className={styles.check}>
                  <Check size={13} aria-hidden />
                </span>
              ) : null}
            </button>
            <div className={styles.libraryAccess}>
              {item.isOwner !== false ? (
                <label>
                  {item.isPublic ? (
                    <Globe2 size={13} />
                  ) : (
                    <LockKeyhole size={13} />
                  )}
                  <select
                    value={item.isPublic ? "public" : "private"}
                    disabled={loading || changingId !== null}
                    aria-label={`Akses paket ${item.title}`}
                    onChange={(event) =>
                      void setVisibility(item, event.target.value === "public")
                    }
                  >
                    <option value="private">Privat</option>
                    <option value="public">Publik</option>
                  </select>
                  {changingId === item.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : null}
                </label>
              ) : (
                <span>
                  <Globe2 size={13} /> Publik · siap dimainkan
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {loading ? (
        <p className={styles.libraryHint} role="status">
          Memuat paket soal…
        </p>
      ) : displayed.length === 0 ? (
        <p className={styles.libraryHint}>
          {search
            ? "Tidak ada paket yang cocok dengan pencarianmu."
            : scope === "public"
              ? "Belum ada paket publik. Guru dapat membagikan paket lewat pengaturan akses."
              : "Belum ada paket. Buat soal baru atau pilih paket publik."}
        </p>
      ) : null}
      {message ? (
        <p className={styles.libraryMessage} role="status">
          {message}{" "}
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            Muat ulang
          </button>
        </p>
      ) : null}
      {nextCursor ? (
        <button
          type="button"
          className={styles.previewButton}
          disabled={loading}
          onClick={() => void loadMore()}
        >
          Lihat paket lainnya
        </button>
      ) : null}
    </div>
  );
}
