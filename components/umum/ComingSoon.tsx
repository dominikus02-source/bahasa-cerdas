import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Hourglass } from "lucide-react";

/**
 * Status "Sedang dalam pengembangan" yang bisa dipakai ulang untuk produk
 * yang kartunya sudah tampil tetapi halamannya belum siap (mis. Aku Sastrawan).
 * Murni presentasional: tanpa getUser()/redirect, jadi aman dipasang di rute
 * publik mana pun dan tidak bisa membentuk loop redirect.
 */
export function ComingSoon({
  title,
  description,
  icon: Icon = Hourglass,
  backHref = "/",
  backLabel = "Kembali ke beranda",
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-12">
      <section
        aria-labelledby="coming-soon-title"
        className="w-full max-w-md rounded-bc-card border border-bc-line bg-bc-surface p-6 shadow-bc-1 text-center"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-bc-icon bg-bc-tint text-bc-violet">
          <Icon size={24} aria-hidden />
        </div>
        <p className="text-bc-small font-semibold text-bc-text-3">Sedang dalam pengembangan</p>
        <h1 id="coming-soon-title" className="mt-1 text-bc-h2 text-bc-text">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-bc-small text-muted-foreground">{description}</p>
        ) : null}
        <div className="mt-6 flex justify-center">
          <Link
            href={backHref}
            className="inline-flex items-center justify-center rounded-bc-ctl border border-bc-line px-4 py-2 text-sm font-semibold text-bc-text"
          >
            {backLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
