import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Keadaan kosong: ikon lucide di kotak berbingkai gradien → judul → satu
 * kalimat → (opsional) satu tombol. Contoh: "Belum ada kelas" /
 * "Kelas yang kamu buat muncul di sini."
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  card = true,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  card?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(card && "ui-card", "ui-empty", className)}>
      <span className="ui-empty__icon" aria-hidden="true">{icon}</span>
      <p className="ui-empty__title">{title}</p>
      {description ? <p className="ui-empty__desc">{description}</p> : null}
      {action ? <div className="ui-empty__action">{action}</div> : null}
    </div>
  );
}
