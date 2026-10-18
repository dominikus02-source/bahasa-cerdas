import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pesan sebaris (info/sukses/peringatan/galat). Satu kalimat, pendek.
 * Galat & peringatan memakai role="alert"; lainnya role="status".
 */
export type AlertTone = "info" | "success" | "warning" | "danger";

const ICON: Record<AlertTone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export function Alert({
  tone = "info",
  title,
  children,
  icon,
  action,
  className,
}: {
  tone?: AlertTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const Icon = ICON[tone];
  return (
    <div role={tone === "danger" || tone === "warning" ? "alert" : "status"} className={cn("ui-alert", `ui-alert--${tone}`, className)}>
      {icon ?? <Icon size={18} aria-hidden />}
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        {title ? <p className="ui-alert__title">{title}</p> : null}
        {children ? <div className={title ? "ui-alert__body" : undefined}>{children}</div> : null}
      </div>
      {action}
    </div>
  );
}
