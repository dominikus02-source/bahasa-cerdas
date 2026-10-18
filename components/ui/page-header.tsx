import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Kepala halaman: (ikon) + label seksi + judul + satu kalimat + aksi.
 * Judul boleh dua baris di 360px (tidak dipotong). Aksi turun ke bawah
 * bila sempit.
 */
export function PageHeader({
  title,
  eyebrow,
  description,
  icon,
  tone = "brand",
  actions,
  className,
  as: Heading = "h1",
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "brand" | "murid" | "soft";
  actions?: React.ReactNode;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <header className={cn("ui-page-header", className)}>
      <div className="ui-page-header__main">
        {icon ? (
          <span className={cn("ui-icon-box", tone === "murid" && "ui-icon-box--murid", tone === "soft" && "ui-icon-box--soft")} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <div className="ui-page-header__text">
          {eyebrow ? <p className="ui-eyebrow">{eyebrow}</p> : null}
          <Heading className="ui-page-header__title">{title}</Heading>
          {description ? <p className="ui-page-header__desc">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
    </header>
  );
}
