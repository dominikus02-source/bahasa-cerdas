import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "gold";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
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
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };