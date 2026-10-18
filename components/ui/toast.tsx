"use client";

import * as React from "react";
import { Alert, type AlertTone } from "@/components/ui/alert";

/**
 * Toast global. Pasang <ToastProvider> sekali (sudah di app/providers.tsx),
 * lalu: const { toast } = useToast(); toast({ tone: "success", title: "Tersimpan." })
 * Muncul di bawah tengah, di atas navigasi bawah (atur --ui-toast-offset).
 */
interface ToastItem {
  id: number;
  tone: AlertTone;
  title: React.ReactNode;
  body?: React.ReactNode;
}

type ToastInput = { tone?: AlertTone; title: React.ReactNode; body?: React.ReactNode; durationMs?: number };

const ToastContext = React.createContext<{ toast: (t: ToastInput) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const seq = React.useRef(0);
  const toast = React.useCallback((t: ToastInput) => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-2), { id, tone: t.tone ?? "info", title: t.title, body: t.body }]);
    window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), t.durationMs ?? 3600);
  }, []);
  const value = React.useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {items.length > 0 ? (
        <div className="ui-toast-region" aria-live="polite">
          {items.map((t) => (
            <Alert key={t.id} tone={t.tone} title={t.title} className="ui-toast">
              {t.body}
            </Alert>
          ))}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

/** Aman dipanggil di luar provider (tidak melakukan apa-apa). */
export function useToast() {
  return React.useContext(ToastContext) ?? { toast: () => {} };
}
