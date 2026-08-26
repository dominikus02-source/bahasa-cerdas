"use client";

/**
 * P8B — Bagian "Bagikan Akses" di halaman program (client island).
 * Reuse ClassShareCard + ShareKelasModal — satu share sheet di seluruh produk.
 */

import { useEffect } from "react";
import { trackProductEvent } from "@/lib/analytics/product-track";
import { ClassShareCard } from "./ClassShareCard";

export function ProgramClient() {
  useEffect(() => {
    trackProductEvent("gcs_program_viewed");
  }, []);

  return <ClassShareCard variant="komisi" />;
}
