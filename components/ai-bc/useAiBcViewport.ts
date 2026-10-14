"use client";

import { useEffect, type RefObject } from "react";

/** Ukuran UI saja: ikuti viewport keyboard dan navigasi shell yang terlihat. */
export default function useAiBcViewport(
  workspaceRef: RefObject<HTMLDivElement>,
) {
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const viewport = window.visualViewport;
    const bottomNav = document.querySelector<HTMLElement>(
      ".bc-mobile-nav, .arena-bottom-nav",
    );
    let frame = 0;

    const measure = () => {
      // Pertahankan kemampuan pinch-to-zoom; jangan mengecilkan layout saat zoom.
      if (viewport && viewport.scale !== 1) return;
      const viewportBottom = viewport
        ? viewport.offsetTop + viewport.height
        : window.innerHeight;
      const workspaceTop = workspace.getBoundingClientRect().top;
      const navRect = bottomNav?.getBoundingClientRect();
      const navVisible =
        navRect && navRect.height > 0 && navRect.top < viewportBottom;
      const bottom = navVisible
        ? Math.min(viewportBottom, navRect.top)
        : viewportBottom;
      workspace.style.setProperty(
        "--ai-bc-available-height",
        `${Math.max(0, bottom - workspaceTop)}px`,
      );
    };
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("resize", scheduleMeasure);
    viewport?.addEventListener("resize", scheduleMeasure);
    viewport?.addEventListener("scroll", scheduleMeasure);
    const observer = new ResizeObserver(scheduleMeasure);
    if (bottomNav) observer.observe(bottomNav);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      viewport?.removeEventListener("resize", scheduleMeasure);
      viewport?.removeEventListener("scroll", scheduleMeasure);
    };
  }, [workspaceRef]);
}
