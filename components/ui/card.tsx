import { cn } from "@/lib/utils";

/**
 * Kartu global (docs/PANDUAN_DESAIN_BC.md §0.3).
 *
 * Desain: variant "surface" (gradien halus + garis tipis + kedalaman),
 * "flat" (permukaan polos), "tint" (tint merek). Opsi: `accent` (garis
 * gradien 3px di atas), `interactive` (angkat saat hover mouse), `pad`
 * (isi 16–22px).
 * Tanpa `variant` = tampilan lama (shadcn) — tetap bekerja.
 */
type CardVariant = "legacy" | "surface" | "flat" | "tint";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: CardVariant;
  accent?: boolean;
  interactive?: boolean;
  pad?: boolean;
  as?: "div" | "section" | "article";
}

export function cardClass({
  variant = "surface",
  accent,
  interactive,
  pad = true,
  className,
}: { variant?: Exclude<CardVariant, "legacy">; accent?: boolean; interactive?: boolean; pad?: boolean; className?: string } = {}) {
  return cn(
    "ui-card",
    variant === "flat" && "ui-card--flat",
    variant === "tint" && "ui-card--tint",
    accent && "ui-card--accent",
    interactive && "ui-card--interactive",
    pad && "ui-card--pad",
    className
  );
}

export function Card({ className, children, variant = "legacy", accent, interactive, pad, as = "div", ...props }: CardProps) {
  const Tag = as as "div";
  if (variant !== "legacy") {
    return (
      <Tag className={cardClass({ variant, accent, interactive, pad: pad ?? true, className })} {...props}>
        {children}
      </Tag>
    );
  }
  return (
    <Tag className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-semibold leading-none tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}
