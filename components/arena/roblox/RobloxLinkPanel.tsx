"use client";

import { useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import {
  GAME_CARD_BUTTON_CLASS,
  GAME_CARD_QUIET_CLASS,
  gameCardCtaStyle,
} from "@/components/arena/game-hub/GameCard";
import type { RobloxPageStatus } from "@/lib/roblox/types";

type Props = {
  title: string;
  description: string;
  accentColor: string;
  gradient: string;
  initialStatus: RobloxPageStatus;
};

function formatExpiry(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
  return `${time} WIB`;
}

export default function RobloxLinkPanel({ title, description, accentColor, gradient, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAge, setConfirmAge] = useState(false);
  const [copied, setCopied] = useState(false);
  const ctaStyle = gameCardCtaStyle(accentColor);
  const needsAge = status.ageGate.enabled && !status.ageGate.satisfied;
  const linkedName = status.link?.robloxDisplayName || status.link?.robloxUsername || status.link?.robloxUserId;

  async function post(url: string, body: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => null)) as { status?: RobloxPageStatus; message?: string } | null;
    if (!response.ok || !data?.status) {
      throw new Error(data?.message || "Tidak bisa memperbarui tautan.");
    }
    setStatus(data.status);
    setError(null);
  }

  async function run(action: string, task: () => Promise<void>) {
    setPending(action);
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak bisa memperbarui tautan.");
    } finally {
      setPending(null);
    }
  }

  async function copyCode() {
    if (!status.code) return;
    try {
      await navigator.clipboard.writeText(status.code.display);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Salin kode secara manual.");
    }
  }

  return (
    <div className="space-y-4">
      <Link href="/arena/game" className="inline-flex min-h-11 items-center text-sm font-bold text-bc-violet">
        Kembali ke permainan
      </Link>
      <article className="overflow-hidden rounded-[24px] border border-bc-line bg-bc-surface shadow-bc-depth">
        <div className={`bg-gradient-to-br ${gradient} px-5 py-6 text-white`}>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/80">Roblox</p>
          <h1 className="mt-1 text-xl font-extrabold leading-tight">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/90">{description}</p>
        </div>
        <div className="space-y-4 p-5">
          {status.link ? (
            <p className="text-sm font-semibold text-bc-text">
              Tertaut ke <span className="font-extrabold">{linkedName}</span>
            </p>
          ) : (
            <p className="text-sm text-bc-text-2">Akun Roblox belum tertaut. Buat kode, lalu ketik di dalam permainan.</p>
          )}

          {needsAge && (
            <label className="flex items-start gap-3 text-sm text-bc-text">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0"
                checked={confirmAge}
                onChange={(event) => setConfirmAge(event.target.checked)}
              />
              <span>
                Saya berusia {status.ageGate.minAge} tahun atau lebih. Permainan ini untuk pemain berusia {status.ageGate.minAge} tahun ke atas.
              </span>
            </label>
          )}

          {status.code && !status.link && (
            <div className="rounded-2xl border border-bc-line bg-bc-surface-2 px-4 py-4 text-center">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-bc-text-3">Kode tautan</p>
              <p className="mt-2 font-mono text-3xl font-extrabold tracking-[0.18em] text-bc-text">{status.code.display}</p>
              <p className="mt-2 text-xs text-bc-text-2">Berlaku sampai {formatExpiry(status.code.expiresAt)}. Jangan bagikan kode ini.</p>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm font-semibold text-bc-danger">
              {error}
            </p>
          )}

          <div className="space-y-2">
            {needsAge && (
              <button
                type="button"
                className={GAME_CARD_BUTTON_CLASS}
                style={ctaStyle}
                disabled={!confirmAge || pending !== null}
                onClick={() => run("age", () => post(status.link ? "/api/roblox/link/age" : "/api/roblox/link/issue", { confirmAge: true }))}
              >
                {pending === "age" ? "Menyimpan…" : status.link ? "Konfirmasi usia" : "Buat kode tautan"}
              </button>
            )}

            {!needsAge && !status.link && (
              <button
                type="button"
                className={GAME_CARD_BUTTON_CLASS}
                style={ctaStyle}
                disabled={pending !== null}
                onClick={() => run("issue", () => post("/api/roblox/link/issue", { confirmAge: false, regenerate: Boolean(status.code) }))}
              >
                <Play size={13} fill="currentColor" />
                {pending === "issue" ? "Menyiapkan…" : status.code ? "Buat kode baru" : "Buat kode tautan"}
              </button>
            )}

            {!needsAge && status.code && !status.link && (
              <button type="button" className={GAME_CARD_QUIET_CLASS} disabled={pending !== null} onClick={() => void copyCode()}>
                {copied ? "Kode tersalin" : "Salin kode"}
              </button>
            )}

            <a
              href={status.experienceUrl}
              className={needsAge ? GAME_CARD_QUIET_CLASS : GAME_CARD_BUTTON_CLASS}
              style={needsAge ? undefined : ctaStyle}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Play size={13} fill="currentColor" /> Buka di Roblox
            </a>

            {status.link && (
              <button
                type="button"
                className={GAME_CARD_QUIET_CLASS}
                disabled={pending !== null}
                onClick={() => {
                  if (!window.confirm("Putuskan tautan akun Roblox ini?")) return;
                  void run("revoke", () => post("/api/roblox/link/revoke", {}));
                }}
              >
                {pending === "revoke" ? "Memutus…" : "Putuskan tautan"}
              </button>
            )}
          </div>
          <p className="text-xs leading-relaxed text-bc-text-3">
            Ketik kode di dalam permainan. Permainan tidak membuka situs ini.
          </p>
        </div>
      </article>
    </div>
  );
}
