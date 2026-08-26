"use client";

/**
 * P8B §3 — Contextual share card (max 3 titik: Kelasku, Data Siswa, Komisi).
 * Self-contained: fetch kelas milik guru, buka ShareKelasModal.
 * Nada kontekstual — bukan banner komisi.
 */

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Share2, Users } from "lucide-react";
import { trackProductEvent } from "@/lib/analytics/product-track";
import { ShareKelasModal, type ShareKelasData } from "./ShareKelasModal";

interface KelasGroup {
  id: string;
  name: string;
  grade: string;
  accessCode: string;
  tahunAjaran?: string | null;
}

type Variant = "kelasku" | "data-siswa" | "komisi";

const COPY: Record<Variant, { title: string; desc: string }> = {
  kelasku: {
    title: "Bagikan BahasaCerdas kepada kelasmu",
    desc: "Murid yang bergabung lewat kode akses kelasmu ikut terhubung dalam ekosistem belajar BahasaCerdas.",
  },
  "data-siswa": {
    title: "Bantu siswa melanjutkan latihan Bahasa Indonesia di BahasaCerdas",
    desc: "Bagikan akses kelas agar siswa dapat berlatih lebih terarah di luar jam sekolah.",
  },
  komisi: {
    title: "Bagikan Akses Belajar",
    desc: "Murid yang bergabung ke kelasmu dapat berlatih lebih terstruktur di BahasaCerdas.",
  },
};

export function ClassShareCard({ variant = "kelasku" }: { variant?: Variant }) {
  const [classes, setClasses] = useState<KelasGroup[]>([]);
  const [open, setOpen] = useState<KelasGroup | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/group");
      if (!res.ok) return;
      const data = await res.json();
      setClasses((data.groups ?? []).slice(0, 5));
    } catch {
      // diam — card bersifat opsional
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || classes.length === 0) return null;

  const copy = COPY[variant];

  return (
    <>
      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{copy.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{copy.desc}</p>
          </div>
          <button
            onClick={() => {
              trackProductEvent("gcs_share_opened");
              setOpen(classes[0]);
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Share2 className="h-3.5 w-3.5" />
            Bagikan Akses
          </button>
        </div>

        {classes.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setOpen(c)}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"
                aria-label={`Bagikan kelas ${c.name}`}
              >
                <Users className="h-3 w-3" />
                {c.name}
                <ChevronRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      <ShareKelasModal
        isOpen={open !== null}
        onClose={() => setOpen(null)}
        kelas={open ? (open as ShareKelasData) : null}
      />
    </>
  );
}
