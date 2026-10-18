import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tombol global BahasaCerdas (docs/PANDUAN_DESAIN_BC.md §0.3).
 *
 * Varian desain (pakai ini untuk UI baru / migrasi):
 *   primary  — gradien merek teal→biru→violet, SATU per layar
 *   murid    — gradien merek versi murid (violet di depan)
 *   secondary— permukaan + garis tipis
 *   ghost    — transparan + garis
 *   quiet    — transparan tanpa garis (aksi tersier, ikon)
 *   soft     — chip teal
 *   danger   — merah (hapus, Keluar)
 *   premium  — bingkai gradien kuning→teal→violet, teks kuning
 * Ukuran: sm (36px) · md (44px, bawaan) · lg (52px) · icon (persegi 44px)
 *
 * Varian LAMA (tetap bekerja, tampilan tidak berubah; migrasikan bertahap):
 *   default · destructive · outline · link · gold · success ·
 *   legacy-secondary · legacy-ghost
 *
 * Catatan: atribut `type` tidak diberi bawaan (perilaku <button> asli tetap:
 * di dalam <form> = submit). Tulis type="button" bila bukan submit.
 */
export type ButtonDesignVariant = "primary" | "murid" | "accent" | "secondary" | "ghost" | "quiet" | "soft" | "danger" | "premium";
type LegacyVariant = "default" | "destructive" | "outline" | "link" | "gold" | "success" | "legacy-secondary" | "legacy-ghost";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "default";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonDesignVariant | LegacyVariant;
  size?: ButtonSize;
  /** Lebar penuh. */
  block?: boolean;
  /** Tampilkan putaran & nonaktifkan tombol. */
  loading?: boolean;
}

const DESIGN = new Set<string>(["primary", "murid", "accent", "secondary", "ghost", "quiet", "soft", "danger", "premium"]);

/** Kelas tombol desain, untuk dipasang di <Link>/<a> yang tampil seperti tombol. */
export function buttonClass({
  variant = "primary",
  size = "md",
  block,
  className,
}: { variant?: ButtonDesignVariant; size?: ButtonSize; block?: boolean; className?: string } = {}) {
  const s = size === "default" ? "md" : size;
  return cn("ui-btn", `ui-btn--${variant}`, s !== "md" && `ui-btn--${s}`, block && "ui-btn--block", className);
}

function legacyClass(variant: LegacyVariant, size: ButtonSize, className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    {
      "bg-primary text-primary-foreground shadow hover:bg-primary/90": variant === "default",
      "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90": variant === "destructive",
      "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground": variant === "outline",
      "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80": variant === "legacy-secondary",
      "hover:bg-accent hover:text-accent-foreground": variant === "legacy-ghost",
      "text-primary underline-offset-4 hover:underline": variant === "link",
      "bg-gradient-to-r from-gold-400 to-gold-600 text-black shadow-lg hover:from-gold-500 hover:to-gold-600 animate-pulse-glow": variant === "gold",
      "bg-emerald-700 text-white shadow-lg hover:bg-emerald-600": variant === "success",
    },
    {
      "h-9 px-4 py-2": size === "default" || size === "md",
      "h-8 rounded-md px-3 text-xs": size === "sm",
      "h-10 rounded-lg px-8": size === "lg",
      "h-9 w-9": size === "icon",
    },
    className
  );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", block, loading, disabled, children, ...props }, ref) => {
    const design = DESIGN.has(variant);
    return (
      <button
        ref={ref}
        className={
          design
            ? buttonClass({ variant: variant as ButtonDesignVariant, size, block, className })
            : legacyClass(variant as LegacyVariant, size, cn(block && "w-full", className))
        }
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 size={16} className="ui-spin" aria-hidden="true" /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
