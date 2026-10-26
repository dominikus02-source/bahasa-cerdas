"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { ChevronDown, Library, Moon, Search, Settings, Sun } from "lucide-react";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { UmumAvatar, type UmumAvatarUser } from "@/components/umum/UmumAvatar";

/**
 * Pencarian dasbor UMUM: formulir GET ke /umum?q=… — halaman /umum memfilter
 * kartu produk & gim di server (berfungsi tanpa JS). Ctrl/⌘ K memfokuskan.
 */
export function UmumSearch({ defaultValue = "" }: { defaultValue?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form role="search" action="/umum#produk" method="get" className="relative w-full">
      <label htmlFor="cari-umum" className="sr-only">Cari produk, topik, atau kata kunci</label>
      <Search size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-bc-text-3" />
      <input
        ref={ref}
        id="cari-umum"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Cari produk, topik, atau kata kunci…"
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 w-full rounded-bc-ctl border border-bc-line bg-bc-surface-2 pl-10 pr-20 text-sm text-bc-text placeholder:text-bc-text-3 focus:border-bc-aud focus:bg-bc-surface focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bc-focus"
      />
      <kbd aria-hidden className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-bc-xs border border-bc-line bg-bc-surface px-1.5 py-0.5 font-sans text-[11px] font-semibold text-bc-text-3 sm:inline-block">
        Ctrl K
      </kbd>
    </form>
  );
}

const ITEM = "flex w-full items-center gap-2 rounded-bc-sm px-3 py-2.5 text-sm font-medium text-bc-text-2 transition-colors hover:bg-bc-surface-2 hover:text-bc-text focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bc-focus";

/**
 * Menu akun (avatar + nama + "Umum" + chevron). Isi: Akun, Koleksi Saya,
 * tema terang/gelap, Keluar. Tutup dengan Escape atau klik di luar.
 */
export function UmumAccountMenu({ user }: { user: UmumAvatarUser }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const { resolvedTheme, setTheme } = useTheme();
  const name = user.nickname || user.fullName;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        ref={btn}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Menu akun: ${name}`}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-bc-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bc-focus sm:pr-2"
      >
        <UmumAvatar user={user} size={38} />
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[11rem] truncate text-sm font-bold text-bc-text">{name}</span>
          <span className="block text-xs text-bc-text-3">Umum</span>
        </span>
        <ChevronDown size={16} aria-hidden className={`hidden text-bc-text-3 transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={menuId} className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 rounded-bc-card border border-bc-line bg-bc-surface p-2 shadow-bc-3">
          <div className="px-3 pb-2 pt-1.5">
            <p className="truncate text-sm font-bold text-bc-text">{name}</p>
            <p className="text-xs text-bc-text-3">Akun Umum</p>
          </div>
          <div className="my-1 h-px bg-bc-line" />
          <Link href="/umum/pengaturan" className={ITEM} onClick={() => setOpen(false)}>
            <Settings size={18} aria-hidden /> Akun &amp; pengaturan
          </Link>
          <Link href="/umum/koleksi" className={ITEM} onClick={() => setOpen(false)}>
            <Library size={18} aria-hidden /> Koleksi Saya
          </Link>
          <button type="button" className={ITEM} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            <span className="hidden dark:inline-flex" aria-hidden><Sun size={18} /></span>
            <span className="inline-flex dark:hidden" aria-hidden><Moon size={18} /></span>
            <span className="dark:hidden">Mode gelap</span>
            <span className="hidden dark:inline">Mode terang</span>
          </button>
          <div className="my-1 h-px bg-bc-line" />
          <LogoutButton />
        </div>
      )}
    </div>
  );
}
