"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/** Fixture QA lokal: tema & mode aplikasi Android deterministik dari query. */
export function QaControls({ theme, app }: { theme: "light" | "dark"; app: boolean }) {
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme(theme);
    const h = document.documentElement;
    h.classList.toggle("bc-android-app", app);
    if (app) h.setAttribute("data-bc-native-styles", "1");
    else h.removeAttribute("data-bc-native-styles");
    h.setAttribute("data-qa-ready", "1");
  }, [theme, app, setTheme]);
  return null;
}
