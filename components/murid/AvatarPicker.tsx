"use client";

import { useEffect, useState } from "react";
import { Lock, Check } from "lucide-react";
import { AVATARS, isAvatarUnlocked, nextLockedAvatar } from "@/lib/avatar/katalog";

/**
 * Avatar chooser.
 *
 * Locked avatars stay visible — greyed, with the requirement written on them —
 * because a collection you can see but have not earned is what makes the next
 * unit worth starting. Hiding them would remove the pull entirely.
 */
export function AvatarPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (src: string) => void;
}) {
  const [completedUnits, setCompletedUnits] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/murid/avatar-progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCompletedUnits(d?.completedUnits ?? 0))
      .catch(() => setCompletedUnits(0));
  }, []);

  const done = completedUnits ?? 0;
  const next = nextLockedAvatar(done);

  // Foto unggahan sendiri tidak ada di katalog, jadi tanpa ubin khusus ini
  // murid tidak melihat bukti apa pun bahwa fotonya berhasil masuk — tidak ada
  // preset yang tampak terpilih, dan foto barunya tidak muncul di mana-mana.
  const fotoSendiri = value && !AVATARS.some((a) => a.src === value) ? value : null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Pilih Avatar</p>
        {completedUnits !== null && (
          <p className="text-xs text-gray-500 dark:text-slate-400">{done} materi selesai</p>
        )}
      </div>

      {fotoSendiri && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40/60 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotoSendiri}
            alt="Foto profil kamu"
            className="h-16 w-16 shrink-0 rounded-2xl border-2 border-violet-600 object-cover ring-2 ring-violet-200"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-violet-900">
              <Check className="h-4 w-4 text-violet-600 dark:text-violet-400" /> Foto kamu sedang dipakai
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
              Pilih salah satu avatar di bawah kalau mau menggantinya.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
        {AVATARS.map((a) => {
          const unlocked = completedUnits === null ? a.unlockUnits === 0 : isAvatarUnlocked(a, done);
          const selected = value === a.src;
          return (
            <button
              key={a.id}
              type="button"
              disabled={!unlocked}
              onClick={() => unlocked && onChange(a.src)}
              title={unlocked ? a.name : `Selesaikan ${a.unlockUnits} materi untuk membuka`}
              aria-label={unlocked ? a.name : `${a.name}, terkunci`}
              className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                selected
                  ? "border-violet-600 ring-2 ring-violet-200"
                  : unlocked
                    ? "border-transparent hover:border-violet-300 dark:border-violet-700 active:scale-95"
                    : "border-transparent cursor-not-allowed"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.src}
                alt=""
                loading="lazy"
                className={`w-full h-full object-cover bg-slate-100 dark:bg-slate-800/70 ${unlocked ? "" : "grayscale opacity-40"}`}
              />

              {selected && (
                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </span>
              )}

              {!unlocked && (
                <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white">
                  <Lock className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] font-bold leading-none">{a.unlockUnits} materi</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {next && (
        <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
          Selesaikan {next.unlockUnits - done} materi lagi di Jalur Cerdas untuk membuka{" "}
          <span className="font-semibold text-violet-600 dark:text-violet-400">{next.name}</span>.
        </p>
      )}
    </div>
  );
}
