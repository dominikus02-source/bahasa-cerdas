import * as React from "react";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Badge global (docs/PANDUAN_DESAIN_BC.md §0.3). Pil 11px huruf besar.
 *
 * Desain: pakai `tone` — neutral · accent · info · violet · success ·
 * warning · danger · premium · live · brand. `live` memberi titik
 * berdenyut ("Berlangsung"). Untuk paket berbayar pakai <PremiumBadge />.
 * Tanpa `tone` = varian lama (`variant`) — tetap bekerja.
 */
export type BadgeTone = "neutral" | "accent" | "info" | "violet" | "success" | "warning" | "danger" | "premium" | "live" | "brand" | "aud";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "gold";
  tone?: BadgeTone;
  icon?: React.ReactNode;
}

export function badgeClass(tone: BadgeTone = "neutral", className?: string) {
  return cn("ui-badge", `ui-badge--${tone}`, className);
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", tone, icon, children, ...props }, ref) => {
    if (tone) {
      return (
        <span ref={ref as React.Ref<HTMLSpanElement>} className={badgeClass(tone, className)} {...props}>
          {tone === "live" ? <span className="ui-badge__dot" aria-hidden="true" /> : icon}
          {children}
        </span>
      );
    }
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
          {
            "border-transparent bg-primary text-primary-foreground": variant === "default",
            "border-transparent bg-secondary text-secondary-foreground": variant === "secondary",
            "border-transparent bg-destructive text-destructive-foreground": variant === "destructive",
            "text-foreground": variant === "outline",
            "border-transparent bc-badge-success": variant === "success",
            "border-transparent bc-badge-warning": variant === "warning",
            "border-transparent bg-gradient-to-r from-gold-400 to-gold-600 text-black": variant === "gold",
          },
          className
        )}
        ref={ref}
        {...props}
      >
        {icon}
        {children}
      </div>
    );
  }
);
Badge.displayName = "Badge";

/** Badge paket berbayar: mahkota + kuning. Label bawaan "Premium" (guru: "Pro"). */
export function PremiumBadge({ label = "Premium", className }: { label?: string; className?: string }) {
  return (
    <span className={badgeClass("premium", className)}>
      <Crown size={12} aria-hidden="true" /> {label}
    </span>
  );
}

/** Status hidup: titik berdenyut + "Berlangsung". */
export function LiveBadge({ label = "Berlangsung", className }: { label?: string; className?: string }) {
  return (
    <span className={badgeClass("live", className)}>
      <span className="ui-badge__dot" aria-hidden="true" /> {label}
    </span>
  );
}

export { Badge };
