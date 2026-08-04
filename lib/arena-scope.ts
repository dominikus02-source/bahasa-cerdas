"use client";

import { usePathname } from "next/navigation";

// Several screens are shared between the student dashboard (/murid/*) and Arena
// (/arena/*) by mounting the same component on two routes. They must not link to
// a fixed tree: Arena also ships as an Android APK scoped to /arena, so a link to
// /murid/beranda from inside the app drops the student into a browser tab.
//
// Mounting is what decides, so the path decides. A component asks where it is
// rather than being told, which keeps the two route files thin re-exports.
export function useDiArena(): boolean {
  return usePathname()?.startsWith("/arena") ?? false;
}

// Where "back" and "done" should land, per tree.
export function useBerandaHref(): string {
  return useDiArena() ? "/arena" : "/murid/beranda";
}

// Base of the assignment list, per tree. Detail routes hang off this:
// `${useTugasHref()}/${id}/take` and `/result`.
export function useTugasHref(): string {
  return useDiArena() ? "/arena/tugas" : "/murid/tugasku";
}

// Base of the competition/exam flow, per tree. The whole run — device check, the
// test itself, the result screen — hangs off this, so a student who starts a UKBI
// simulation inside the APK stays in the app for all of it.
export function useKompetisiHref(): string {
  return useDiArena() ? "/arena/kompetisi" : "/kompetisi";
}
