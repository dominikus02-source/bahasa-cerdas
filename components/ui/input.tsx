import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input global. `variant="bc"` = desain baru (radius 16px, 48px, font 16px
 * agar iOS tidak zoom, fokus teal). Tanpa variant = tampilan lama.
 * Bungkus dengan <Field> untuk label, petunjuk, dan pesan galat.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "legacy" | "bc";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className = "", type, variant = "legacy", ...props }, ref) => {
  if (variant === "bc") {
    return <input type={type} className={cn("ui-input", className)} ref={ref} {...props} />;
  }
  return (
    <input
      type={type}
      className={`flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
