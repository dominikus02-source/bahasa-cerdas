"use client";

import { useEffect, useState } from "react";

/**
 * Apakah opsi peran "Umum" boleh ditampilkan. Sumber: GET /api/auth/role-options
 * (flag server ENABLE_ROLE_UMUM). Default false (gagal tertutup) — server tetap
 * menolak UMUM bila flag mati, jadi ini murni urusan tampilan.
 */
export function useRoleUmumAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/role-options", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && Array.isArray(d.roles)) setAvailable(d.roles.includes("UMUM"));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return available;
}
