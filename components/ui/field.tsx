import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Pembungkus field: label + kontrol + petunjuk/galat.
 *
 *   <Field label="Nama kelas" hint="Maks. 40 huruf" error={err}>
 *     {(p) => <Input variant="bc" {...p} />}
 *   </Field>
 *
 * `p` berisi id, aria-describedby, aria-invalid — sambungkan ke kontrol.
 * Galat tampil satu kalimat dengan role="alert".
 */
export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export function Field({
  label,
  hint,
  error,
  id,
  hideLabel,
  className,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  id?: string;
  hideLabel?: boolean;
  className?: string;
  children: (props: FieldControlProps) => React.ReactNode;
}) {
  const auto = React.useId();
  const fid = id ?? `f${auto.replace(/:/g, "")}`;
  const hintId = hint && !error ? `${fid}-hint` : undefined;
  const errId = error ? `${fid}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("ui-field", className)}>
      <label htmlFor={fid} className={hideLabel ? "sr-only" : "ui-label"}>
        {label}
      </label>
      {children({ id: fid, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && !error ? <p id={hintId} className="ui-hint">{hint}</p> : null}
      {error ? <p id={errId} className="ui-error" role="alert">{error}</p> : null}
    </div>
  );
}
