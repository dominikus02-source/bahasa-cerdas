import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Select bawaan peramban dengan gaya global (ringan, aksesibel, cocok di HP).
 * Opsi harus pendek ("Tanpa komunitas", bukan kalimat panjang).
 */
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn("ui-select", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

export { Select };
