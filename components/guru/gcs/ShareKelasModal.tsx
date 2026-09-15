"use client";

/**
 * P8B §8/§10 — Share sheet "Bagikan BahasaCerdas kepada Murid".
 * Kode akses kelas = mekanisme attribution resmi (bukan referral baru).
 * QR dari link akses kelas — TIDAK meng-encode data sensitif.
 * Pesan template TIDAK menyebut komisi (spec §9).
 */

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Modal } from "@/components/ui/modal";
import { Check, Copy, MessageSquareText, QrCode, Share2 } from "lucide-react";
import { trackProductEvent } from "@/lib/analytics/product-track";
import { buildClassJoinUrl, buildShareMessage } from "@/lib/guru/gcs-copy";

export interface ShareKelasData {
  id: string;
  name: string;
  grade?: string | null;
  accessCode: string;
  tahunAjaran?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  kelas: ShareKelasData | null;
}

export function ShareKelasModal({ isOpen, onClose, kelas }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | "message" | null>(null);

  const link = useMemo(
    () =>
      kelas
        ? buildClassJoinUrl(
            typeof window !== "undefined" ? window.location.origin : "https://www.bahasacerdas.com",
            kelas.accessCode
          )
        : "",
    [kelas]
  );

  useEffect(() => {
    if (isOpen) {
      trackProductEvent("gcs_share_opened");
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && link) {
      let cancelled = false;
      QRCode.toDataURL(link, {
        width: 240,
        margin: 1,
        color: { dark: "#161B3A", light: "#ffffff" },
      })
        .then((url) => {
          if (!cancelled) setQrDataUrl(url);
        })
        .catch(() => setQrDataUrl(null));
      return () => {
        cancelled = true;
      };
    }
    setQrDataUrl(null);
  }, [isOpen, link]);

  const copy = async (text: string, kind: "code" | "link" | "message", event: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      trackProductEvent(event);
      trackProductEvent("class_invite_shared", { method: kind, flow: "kelasku" });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard tidak tersedia — abaikan
    }
  };

  const nativeShare = async () => {
    trackProductEvent("gcs_native_share");
    trackProductEvent("class_invite_shared", { method: "native", flow: "kelasku" });
    if (navigator.share && kelas) {
      try {
        await navigator.share({
          title: `Bergabung ke kelas ${kelas.name} di BahasaCerdas`,
          text: buildShareMessage(kelas),
          url: link,
        });
      } catch {
        // dibatalkan pengguna
      }
    } else {
      await copy(link, "link", "gcs_link_copied");
    }
  };

  if (!kelas) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bagikan BahasaCerdas kepada Murid" className="max-w-md">
      <div className="space-y-4">
        {/* Identitas kelas */}
        <div className="rounded-xl bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">
            Kelas {kelas.grade ? kelas.grade : ""} {kelas.tahunAjaran ? `· ${kelas.tahunAjaran}` : ""}
          </p>
          <p className="text-base font-bold text-foreground">{kelas.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Kode akses:{" "}
            <span className="font-mono text-base font-bold tracking-widest text-foreground">
              {kelas.accessCode}
            </span>
          </p>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center">
          {qrDataUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`Kode QR bergabung ke kelas ${kelas.name}`}
                className="h-44 w-44 rounded-xl border border-border bg-white p-2"
              />
              <p className="mt-2 text-xs text-muted-foreground">Scan untuk bergabung</p>
            </>
          ) : (
            <div className="flex h-44 w-44 items-center justify-center rounded-xl bg-muted/40">
              <QrCode className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Aksi */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => copy(kelas.accessCode, "code", "gcs_code_copied")}
            className="inline-flex flex-col items-center gap-1 rounded-xl border border-input px-2 py-3 text-xs font-medium hover:bg-muted"
            aria-label={`Salin kode akses ${kelas.accessCode}`}
          >
            {copied === "code" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied === "code" ? "Tersalin" : "Salin Kode"}
          </button>
          <button
            onClick={() => copy(link, "link", "gcs_link_copied")}
            className="inline-flex flex-col items-center gap-1 rounded-xl border border-input px-2 py-3 text-xs font-medium hover:bg-muted"
            aria-label="Salin tautan akses kelas"
          >
            {copied === "link" ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
            {copied === "link" ? "Tersalin" : "Salin Link"}
          </button>
          <button
            onClick={nativeShare}
            className="inline-flex flex-col items-center gap-1 rounded-xl bg-primary px-2 py-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
            aria-label="Bagikan kelas"
          >
            <Share2 className="h-4 w-4" />
            Bagikan
          </button>
        </div>

        {/* Pesan siap kirim — tanpa komisi */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MessageSquareText className="h-3.5 w-3.5" />
            Pesan siap kirim (tanpa menyebut komisi)
          </div>
          <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-muted/50 p-3 font-sans text-xs leading-relaxed text-foreground">
            {buildShareMessage(kelas)}
          </pre>
          <button
            onClick={() => copy(buildShareMessage(kelas), "message", "gcs_link_copied")}
            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
            aria-label="Salin pesan"
          >
            {copied === "message" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === "message" ? "Pesan tersalin" : "Salin pesan"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
