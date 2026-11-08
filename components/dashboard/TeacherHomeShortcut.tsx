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
      className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800 shadow-sm transition hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100"
      aria-label="Kembali ke dasbor guru">
      <ArrowLeft size={18} aria-hidden="true" /> Kembali ke Dasbor Guru
    </Link>
  );
}
