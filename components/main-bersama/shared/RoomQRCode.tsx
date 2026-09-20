"use client";
// ─── QR Code generator for Main Bersama room ────────────────
// Generates a scannable QR code that deep-links to the student
// join page with the PIN pre-filled. Uses the `qrcode` library
// already in package.json (v1.5.4). Rendered as an <img> via
// toDataURL() — no canvas, no SSR issues.

import { useEffect, useState } from "react";
import QRCode from "qrcode";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://bahasacerdas.com";

export function RoomQRCode({ pin }: { pin: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const url = `${SITE_URL}/main-bersama/join?pin=${pin}`;
    QRCode.toDataURL(url, {
      width: 180,
      margin: 2,
      color: { dark: "#1e293b", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [pin]);

  if (!src) {
    return (
      <div className="mb-lobby-qr-box" aria-hidden>
        QR
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`QR code untuk bergabung ke ruang PIN ${pin}`}
      width={180}
      height={180}
      className="mb-lobby-qr-img"
      draggable={false}
    />
  );
}
