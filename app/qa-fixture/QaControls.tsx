"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/** Fixture QA lokal: tema & mode aplikasi Android deterministik dari query. */
export function QaControls({ theme, app, font = 100 }: { theme: "light" | "dark"; app: boolean; font?: number }) {
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme(theme);
    const h = document.documentElement;
    h.classList.toggle("bc-android-app", app);
    if (app) h.setAttribute("data-bc-native-styles", "1");
    else h.removeAttribute("data-bc-native-styles");
    // Skala font seperti font sistem Android: WebView textZoom memperbesar
    // ukuran FONT saja (bukan kotak/rem). text-size-adjust meniru itu pada
    // emulasi seluler Chromium (isMobile).
    h.style.setProperty("-webkit-text-size-adjust", `${font}%`);
    h.style.setProperty("text-size-adjust", `${font}%`);
    h.setAttribute("data-qa-ready", "1");
  }, [theme, app, font, setTheme]);
  return null;
}
