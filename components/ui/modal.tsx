"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

/**
 * Modal & Sheet global (docs/PANDUAN_DESAIN_BC.md §0.3).
 *
 * `variant="bc"` = desain baru: lembar dari bawah di HP, kotak tengah
 * (modal) atau panel samping (sheet) di laptop; tanpa blur; Escape menutup;
 * role="dialog" + aria-modal; tombol tutup "Tutup". Tanpa variant = lama.
 * <Sheet> = Modal variant bc kind "sheet".
 */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  variant?: "legacy" | "bc";
  kind?: "modal" | "sheet";
  description?: React.ReactNode;
  /** Tombol aksi; ditumpuk vertikal di HP. */
  actions?: React.ReactNode;
  wide?: boolean;
  closeLabel?: string;
}

function useBodyLock(isOpen: boolean) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);
}

export function Modal(props: ModalProps) {
  const { isOpen, onClose, children, className, title, variant = "legacy" } = props;
  useBodyLock(isOpen);
  if (variant === "bc") return <BcDialog {...props} />;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-xl bg-card text-card-foreground p-6 shadow-2xl animate-fade-in",
          className
        )}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">{title}</h2>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-muted" aria-label="Tutup">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function BcDialog({ isOpen, onClose, children, className, title, kind = "modal", description, actions, wide, closeLabel = "Tutup" }: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="ui-overlay" data-kind={kind} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn("ui-modal", wide && "ui-modal--wide", className)}
      >
        <div className="ui-modal__head">
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            {title ? <h2 id={titleId} className="ui-modal__title">{title}</h2> : null}
            {description ? <p className="ui-modal__desc">{description}</p> : null}
          </div>
          <button type="button" className="ui-modal__close" onClick={onClose} aria-label={closeLabel}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
        {actions ? <div className="ui-modal__actions">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Sheet(props: Omit<ModalProps, "variant" | "kind">) {
  return <Modal {...props} variant="bc" kind="sheet" />;
}
