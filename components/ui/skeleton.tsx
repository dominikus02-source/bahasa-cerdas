import { cn } from "@/lib/utils";

/** Kerangka muat. Beri ukuran lewat className (mis. "h-4 w-32"). */
export function Skeleton({ className, rounded }: { className?: string; rounded?: "xs" | "ctl" | "card" | "pill" }) {
  return (
    <span
      aria-hidden="true"
      className={cn("ui-skeleton", rounded === "ctl" && "rounded-bc-ctl", rounded === "card" && "rounded-bc-card", rounded === "pill" && "rounded-full", className)}
    />
  );
}

/** Kerangka kartu daftar (ikon + dua baris). */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("ui-card ui-card--pad", className)} role="status" aria-label="Memuat">
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Skeleton className="h-11 w-11 shrink-0" rounded="ctl" />
        <div style={{ display: "grid", gap: 8, flex: 1, minWidth: 0 }}>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}
