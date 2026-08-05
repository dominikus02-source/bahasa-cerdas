"use client";

/** Indikator ● ○ ○ ○ ○ — klik untuk berpindah banner. */
export default function AnnouncementIndicator({
  count,
  current,
  onChange,
}: {
  count: number;
  current: number;
  onChange: (index: number) => void;
}) {
  if (count <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4" role="group" aria-label="Pilih banner pengumuman">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          aria-label={`Tampilkan banner ${i + 1}`}
          aria-current={i === current ? "true" : undefined}
          className={`h-2.5 rounded-full transition-all duration-300 focus-ring ${
            i === current ? "w-7 bg-primary" : "w-2.5 bg-zinc-300 hover:bg-zinc-400"
          }`}
        />
      ))}
    </div>
  );
}
