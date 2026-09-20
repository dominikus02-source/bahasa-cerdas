"use client";

/** Banner koneksi (§18 secondary) — muncul hanya bila koneksi bermasalah. */
export function ConnectionBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div role="status" className="mb-conn-banner mb-fade-in">
      <span className="mb-conn-dot" aria-hidden />
      Koneksi terputus. Menyambungkan kembali…
      <style jsx>{`
        .mb-conn-banner {
          position: sticky;
          top: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          gap: var(--mb-space-2);
          padding: var(--mb-space-2) var(--mb-space-4);
          background: var(--mb-warning);
          color: #402d05;
          font-size: 0.9rem;
          font-weight: 700;
        }
        .mb-conn-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #402d05;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
