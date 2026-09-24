"use client";

import { Minimize2 } from "lucide-react";

export function FullscreenExitControl({
  active,
  onExit,
}: {
  active: boolean;
  onExit: () => void | Promise<unknown>;
}) {
  if (!active) return null;

  return (
    <button
      type="button"
      className="mb-fullscreen-exit"
      onClick={() => void onExit()}
      aria-label="Keluar dari layar penuh"
      title="Keluar layar penuh (Esc)"
    >
      <Minimize2 size={17} aria-hidden />
      <span>Keluar Layar Penuh</span>
      <kbd>Esc</kbd>

      <style jsx>{`
        .mb-fullscreen-exit {
          position: fixed;
          top: max(14px, env(safe-area-inset-top));
          right: max(14px, env(safe-area-inset-right));
          z-index: 100;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 8px 10px 8px 13px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, .18);
          background: rgba(5, 19, 32, .82);
          color: #f5f8fb;
          font-weight: 800;
          font-size: .82rem;
          box-shadow: 0 12px 34px rgba(0, 0, 0, .3);
          backdrop-filter: blur(14px);
          cursor: pointer;
          transition:
            transform 140ms ease-out,
            background 140ms ease-out,
            border-color 140ms ease-out;
        }
        .mb-fullscreen-exit:hover {
          background: rgba(8, 29, 47, .94);
          border-color: rgba(255, 213, 112, .45);
          transform: translateY(-1px);
        }
        .mb-fullscreen-exit:active { transform: scale(.98); }
        .mb-fullscreen-exit:focus-visible {
          outline: 2px solid #ffd570;
          outline-offset: 3px;
        }
        kbd {
          min-width: 28px;
          padding: 3px 6px;
          border-radius: 7px;
          border: 1px solid rgba(255,255,255,.18);
          background: rgba(255,255,255,.08);
          color: #c7d4df;
          font: 700 .67rem/1.1 ui-monospace, SFMono-Regular, Menlo, monospace;
          text-align: center;
        }
        @media (max-width: 640px) {
          .mb-fullscreen-exit span { display: none; }
          .mb-fullscreen-exit { padding-inline: 12px 9px; }
        }
      `}</style>
    </button>
  );
}
