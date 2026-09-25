"use client";

import { useEffect, useState } from "react";
import TeacherHomeV3 from "@/components/guru/TeacherHomeV3";
import type { MisiGuruStatus } from "@/lib/guru/misi-guru-status";
import { useUserStore } from "@/store";

function jakartaHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
}

function greetingForHour(hour: number): string {
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export default function GuruBerandaPage() {
  const user = useUserStore();
  const [misiStatus, setMisiStatus] = useState<MisiGuruStatus | null>(null);
  const [greeting, setGreeting] = useState(() => greetingForHour(jakartaHour()));

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/guru/misi", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => {
        if (active && payload?.data) setMisiStatus(payload.data);
      })
      .catch(() => {
        // Beranda tetap berguna walau status misi sementara tidak tersedia.
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <TeacherHomeV3
      greeting={greeting}
      fullName={user.fullName ?? "Guru"}
      misiStatus={misiStatus}
    />
  );
}
