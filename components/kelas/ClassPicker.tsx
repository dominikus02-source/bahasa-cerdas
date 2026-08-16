"use client";

import { useMemo, useState } from "react";
import { Check, Search, Users } from "lucide-react";

export interface PickerClass {
  id: string;
  name: string;
  memberCount?: number;
}

interface ClassPickerProps {
  classes: PickerClass[];
  selected: string[];
  onChange: (ids: string[]) => void;
  searchable?: boolean;
  disabled?: boolean;
  error?: string | null;
  /** Label tombol aksi (mis. "Kirim Materi") — opsional; footer dirender parent. */
}

/**
 * ClassPicker — satu komponen pilih kelas untuk SEMUA flow delivery
 * (Materi/Tugas/Latihan/Pengumuman). Multi-class, select all, search,
 * student count, validation. Dipakai ClassRoomComposer + modal kirim lain.
 */
export function ClassPicker({ classes, selected, onChange, searchable = true, disabled = false, error = null }: ClassPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => c.name.toLowerCase().includes(q));
  }, [classes, query]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((c) => selected.includes(c.id));
  const someSelected = filtered.some((c) => selected.includes(c.id));

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const toggleAll = () => {
    if (disabled) return;
    if (allVisibleSelected) {
      onChange(selected.filter((s) => !filtered.some((c) => c.id === s)));
    } else {
      const ids = new Set([...selected, ...filtered.map((c) => c.id)]);
      onChange([...ids]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-[var(--clr-text)]">Kirim ke kelas</p>
        {classes.length > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            disabled={disabled}
            className="bc-chip text-xs"
            aria-pressed={allVisibleSelected}
          >
            <span className={`inline-block w-4 h-4 rounded mr-1.5 align-middle border ${allVisibleSelected ? "bg-[var(--clr-accent)] border-[var(--clr-accent)]" : "border-[var(--clr-border-strong)]"}`}>
              {allVisibleSelected && <Check size={12} className="text-white" />}
            </span>
            {allVisibleSelected ? "Hapus semua" : "Pilih semua"}
          </button>
        )}
      </div>

      {searchable && classes.length > 6 && (
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--clr-text-3)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kelas..."
            className="bc-input pl-10"
            aria-label="Cari kelas"
          />
        </div>
      )}

      <div className="space-y-1.5" role="group" aria-label="Pilih kelas">
        {filtered.map((c) => {
          const on = selected.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              disabled={disabled}
              aria-pressed={on}
              className={`bc-row w-full text-left ${on ? "bc-row-selected" : ""}`}
            >
              <span className={`bc-check ${on ? "bc-check-on" : ""}`} aria-hidden>
                {on && <Check size={15} strokeWidth={3} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-[var(--clr-text)] truncate">{c.name}</span>
                {typeof c.memberCount === "number" && (
                  <span className="flex items-center gap-1 text-xs text-[var(--clr-text-3)]">
                    <Users size={12} />
                    {c.memberCount} siswa
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-[var(--clr-text-3)] text-center py-4">Tidak ada kelas yang cocok.</p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--clr-text-2)] font-medium">
          {selected.length === 0 ? "Belum ada kelas dipilih" : `${selected.length} kelas dipilih`}
        </span>
        {error && <span className="text-[var(--clr-danger)] font-semibold">{error}</span>}
      </div>
    </div>
  );
}
