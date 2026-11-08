"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** Only shown on the student's actual home, not on nested student pages. */
export function TeacherHomeShortcut() {
  const pathname = usePathname();
  if (pathname !== "/murid/beranda") return null;
  return (
    <Link href="/guru/beranda" prefetch={false}
      className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-bc-line bg-bc-surface-2 px-4 py-2 text-sm font-bold text-bc-text shadow-sm transition hover:bg-bc-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      aria-label="Kembali ke dasbor guru">
      <ArrowLeft size={18} aria-hidden="true" /> Kembali ke Dasbor Guru
    </Link>
  );
}
