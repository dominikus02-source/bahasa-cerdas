"use client";

import { useState, useEffect, useRef } from "react";
import { Zap } from "lucide-react";

export function ActiveBoostBanner() {
  const [active, setActive] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [itemName, setItemName] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/siswa/store/boost-status")
      .then((r) => r.json())
      .then((d) => {
        if (d.active) {
          setActive(true);
          setRemainingMs(d.remainingMs);
          setItemName(d.itemName || "XP Boost");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!active) return;
    intervalRef.current = setInterval(() => {
      setRemainingMs((prev) => {
        if (prev <= 1000) {
          setActive(false);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  if (!active) return null;

  const totalDetik = Math.floor(remainingMs / 1000);
  const jam = Math.floor(totalDetik / 3600);
  const menit = Math.floor((totalDetik % 3600) / 60);
  const detik = totalDetik % 60;
  const waktu = jam > 0
    ? `${jam}j ${menit}m ${detik}d`
    : menit > 0
      ? `${menit}m ${detik}d`
      : `${detik}d`;

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-amber-200" />
        <span className="font-semibold">{itemName} Aktif!</span>
        <span className="text-amber-100">2x XP</span>
      </div>
      <span className="font-mono text-xs bg-black/20 px-2 py-0.5 rounded-md">{waktu}</span>
    </div>
  );
}
