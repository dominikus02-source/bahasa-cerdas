"use client";

import Image from "next/image";
import { Maximize2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import SafeMediaImage from "@/components/shared/safe-media-image";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";

interface ArticleCoverLightboxProps {
  src: string | null | undefined;
  title: string;
}

export default function ArticleCoverLightbox({ src, title }: ArticleCoverLightboxProps) {
  const resolvedSrc = useMemo(() => resolveMediaUrl(src), [src]);
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!resolvedSrc) {
    return (
      <div className="mb-2 aspect-video overflow-hidden rounded-2xl shadow-lg">
        <SafeMediaImage
          src={null}
          alt={title}
          fallbackType="article"
          containerClassName="h-full w-full"
        />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative mb-2 block aspect-video w-full overflow-hidden rounded-2xl bg-slate-100 text-left shadow-lg outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-red-500"
        aria-label={`Perbesar foto untuk ${title}`}
      >
        <SafeMediaImage
          src={resolvedSrc}
          alt={title}
          fallbackType="article"
          containerClassName="h-full w-full"
        />
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-xs font-semibold text-white opacity-100 backdrop-blur-sm transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
          <Maximize2 size={15} aria-hidden="true" />
          Perbesar foto
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto: ${title}`}
          onClick={() => setOpen(false)}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:top-6"
            aria-label="Tutup foto"
          >
            <X size={22} />
          </button>

          <div
            className="relative h-[86dvh] w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={resolvedSrc}
              alt={title}
              fill
              unoptimized
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}
