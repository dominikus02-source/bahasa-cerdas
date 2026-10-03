"use client";
import { useId } from "react";
import type { IdentityBadge } from "@/lib/account/identity";
/** Small vector adaptation of the approved crown/cap/star medallions. */
export default function IdentityIcon({ kind, size }: { kind: IdentityBadge; size: number }) {
  const id = useId().replace(/:/g, "");
  const colors = kind === "founder" ? ["#a855f7", "#4c1d95"] : kind === "teacher" ? ["#38bdf8", "#1e3a8a"] : kind === "trial" ? ["#fbbf24", "#ea580c"] : ["#67e8f9", "#0891b2"];
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id={`${id}-color`} x1="9" y1="7" x2="36" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor={colors[0]} /><stop offset="1" stopColor={colors[1]} /></linearGradient><linearGradient id={`${id}-gold`} x1="7" y1="4" x2="36" y2="41" gradientUnits="userSpaceOnUse"><stop stopColor="#fff7ae" /><stop offset=".45" stopColor="#fbbf24" /><stop offset="1" stopColor="#b45309" /></linearGradient></defs>
    {kind === "founder" ? <><path d="M7 14l9 6 8-14 8 14 9-6-5 18H12L7 14Z" fill={`url(#${id}-gold)`} stroke="#fcd34d" strokeWidth="1.6" /><path d="m16 20 8-14 8 14-8 12-8-12Z" fill={`url(#${id}-color)`} /><circle cx="7" cy="13" r="3" fill={`url(#${id}-gold)`} /><circle cx="24" cy="5" r="3" fill={`url(#${id}-gold)`} /><circle cx="41" cy="13" r="3" fill={`url(#${id}-gold)`} /></> : kind === "student" ? <path d="m24 3 6.3 13 14.2 2.1-10.3 10 2.5 14.2L24 35.6 11.3 42.3l2.5-14.2-10.3-10L17.7 16 24 3Z" fill={`url(#${id}-gold)`} stroke="#fde68a" strokeWidth="1.4" /> : <><path d="M13 15v12c6 5 16 5 22 0V15H13Z" fill={`url(#${id}-color)`} stroke={kind === "teacher" ? "#7dd3fc" : "#fed7aa"} strokeWidth="1.5" /><path d="m3 13 21-10 21 10-21 11L3 13Z" fill={`url(#${id}-color)`} stroke={kind === "teacher" ? "#7dd3fc" : "#fcd34d"} strokeWidth="1.6" /><path d="M41 15v12" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" /><path d="m41 25-3 8h6l-3-8Z" fill={`url(#${id}-gold)`} /></>}
    <circle cx="24" cy={kind === "student" ? 26 : 31} r={kind === "student" ? 11 : 13.5} fill={`url(#${id}-color)`} stroke={kind === "teacher" ? "#bae6fd" : "#fcd34d"} strokeWidth="2.8" />
    <path d={kind === "student" ? "m19 26 3.5 3.5L29 23" : "m18 31 4.5 4.5L31 27"} stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d={kind === "student" ? "M17 23a8 8 0 0 1 8-5" : "M14 28a11 11 0 0 1 12-8"} stroke="white" strokeOpacity=".45" strokeWidth="1.5" strokeLinecap="round" />
  </svg>;
}
