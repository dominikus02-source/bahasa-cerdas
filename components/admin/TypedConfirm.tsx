"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADMIN_CONFIRM_HEADER, ADMIN_CONFIRM_PHRASE } from "@/lib/admin/confirm";

/**
 * Konfirmasi ketik untuk aksi admin berisiko (uang & massal).
 *
 *   const { confirm, dialog } = useTypedConfirm();
 *   if (!(await confirm({ title: "Setujui penarikan?", detail: "Rp50.000 ke …" }))) return;
 *   await fetch(url, { headers: { ...adminConfirmHeaders(), ... } });
 *   …
 *   return <>{dialog}…</>;
 *
 * Server (lib/admin/guard.ts) menolak tanpa header ini (428 CONFIRM_REQUIRED).
 */
export function adminConfirmHeaders(): Record<string, string> {
  return { [ADMIN_CONFIRM_HEADER]: ADMIN_CONFIRM_PHRASE };
}

interface ConfirmRequest {
  title: string;
  detail?: React.ReactNode;
  actionLabel?: string;
}

export function useTypedConfirm() {
  const [req, setReq] = React.useState<ConfirmRequest | null>(null);
  const [typed, setTyped] = React.useState("");
  const resolver = React.useRef<((ok: boolean) => void) | null>(null);
  const inputId = React.useId();

  const close = React.useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setReq(null);
    setTyped("");
  }, []);

  const confirm = React.useCallback((r: ConfirmRequest) => {
    resolver.current?.(false);
    setTyped("");
    setReq(r);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const ok = typed.trim().toUpperCase() === ADMIN_CONFIRM_PHRASE;

  const dialog = (
    <Modal
      variant="bc"
      isOpen={req !== null}
      onClose={() => close(false)}
      title={req?.title}
      description={req?.detail}
      actions={
        <>
          <Button variant="secondary" onClick={() => close(false)}>
            Batal
          </Button>
          <Button variant="primary" disabled={!ok} onClick={() => close(true)}>
            {req?.actionLabel || "Lanjutkan"}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) close(true);
        }}
      >
        <label htmlFor={inputId} className="block text-sm font-medium text-bc-text-2 mb-2">
          Ketik <strong className="font-bold text-bc-text">{ADMIN_CONFIRM_PHRASE}</strong> untuk melanjutkan
        </label>
        <Input
          id={inputId}
          variant="bc"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <p className="mt-2 text-xs text-bc-text-3">Aksi ini tercatat di log audit admin.</p>
      </form>
    </Modal>
  );

  return { confirm, dialog };
}
