import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BookOpenText, Gamepad2, Gift, Route, ShoppingBag, Target } from "lucide-react";
import { waktuRelatif, type Aktivitas, type AktivitasTone } from "@/lib/umum/aktivitas";

/** Ubin ikon + chip produk per jenis aktivitas (token tema saja). */
const TONE: Record<AktivitasTone, { icon: LucideIcon; tile: string; chip: string }> = {
  gim: { icon: Gamepad2, tile: "bg-[image:var(--bc-tile-main)]", chip: "bg-bc-accent-soft text-bc-accent-strong" },
  jalur: { icon: Route, tile: "bg-[image:var(--bc-tile-jalur)]", chip: "bg-bc-violet-soft text-bc-violet" },
  karya: { icon: BookOpenText, tile: "bg-[image:var(--bc-tile-aksara)]", chip: "bg-bc-warning-soft text-bc-warning-strong" },
  kompetensi: { icon: Target, tile: "bg-[image:var(--bc-tile-bigt)]", chip: "bg-bc-info-soft text-bc-info" },
  harian: { icon: Gift, tile: "bg-[image:var(--bc-tile-aku)]", chip: "bg-bc-warning-soft text-bc-warning-strong" },
  toko: { icon: ShoppingBag, tile: "bg-[image:var(--bc-tile-toko)]", chip: "bg-bc-danger-soft text-bc-danger" },
};

export function AktivitasList({ items, now = new Date() }: { items: Aktivitas[]; now?: Date }) {
  return (
    <ol data-testid="aktivitas-list" className="divide-y divide-bc-line">
      {items.map((a) => {
        const t = TONE[a.tone];
        const Icon = t.icon;
        const inner = (
          <>
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-bc-sm text-white ${t.tile}`}>
              <Icon size={17} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-bc-text">
                {a.title} <span className="text-bc-text-3">· {a.detail}</span>
              </span>
            </span>
            <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide min-[420px]:inline-block ${t.chip}`}>{a.chip}</span>
            <time dateTime={a.at.toISOString()} className="w-20 shrink-0 text-right text-xs tabular-nums text-bc-text-3">{waktuRelatif(a.at, now)}</time>
          </>
        );
        return (
          <li key={a.id}>
            {a.href ? (
              <Link href={a.href} className="-mx-2 flex items-center gap-3 rounded-bc-sm px-2 py-3 hover:bg-bc-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bc-focus">{inner}</Link>
            ) : (
              <div className="flex items-center gap-3 py-3">{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
