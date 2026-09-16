"use client";

import { useRef, useState, useTransition } from "react";

/**
 * BC Agent P8D.1 — form wrapper that surfaces the server action result inline.
 *
 * Before this component, the binding/revoke forms on /admin/agent/telegram
 * invoked server actions whose returned messages were silently discarded and
 * whose mutations never refreshed the server-rendered list, so a successful
 * save looked identical to a failure.
 *
 * This mirrors the established ActionButton pattern in
 * app/(dashboard)/admin/agent/_components/ui.tsx: the parent (Server
 * Component) passes the server action as a prop, the client calls it inside
 * startTransition, and the returned { ok, message } is rendered inline next
 * to the submit button. The server action itself calls refresh() from
 * next/cache so the server-rendered binding list updates without a manual
 * reload.
 *
 * Error messages shown here are the fixed, founder-facing strings produced by
 * the server action — never internal errors, stack traces, or DB details.
 */

export interface BindingActionResult {
  ok: boolean;
  message: string;
}

export function BindingForm({
  action,
  className,
  submitLabel,
  pendingLabel,
  submitClassName,
  children,
}: {
  action: (formData: FormData) => Promise<BindingActionResult>;
  /** Classes for the <form> element (card layout for the create form, inline for revoke). */
  className: string;
  submitLabel: string;
  /** Shown on the button while the action is in flight. */
  pendingLabel: string;
  submitClassName: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BindingActionResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await action(formData);
          setResult({ ok: res.ok, message: res.message });
          if (res.ok) formRef.current?.reset();
        });
      }}
    >
      {children}
      <button
        type="submit"
        disabled={pending}
        className={`${submitClassName} disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {pending ? pendingLabel : submitLabel}
      </button>
      {result && (
        <p
          role="status"
          className={`text-xs font-medium ${
            result.ok
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {result.message}
        </p>
      )}
    </form>
  );
}
