"use client";

import { getKuisTempurCharacter } from "@/lib/game/kuis-tempur-characters";

type Props = {
  characterId?: string | null;
  hero?: boolean;
  compact?: boolean;
  className?: string;
};

export default function KuisTempurCharacterPortrait({
  characterId,
  hero = false,
  compact = false,
  className = "",
}: Props) {
  const character = getKuisTempurCharacter(characterId);
  const size = hero
    ? "h-[285px] w-[250px] sm:h-[340px] sm:w-[290px]"
    : compact
      ? "h-16 w-14"
      : "h-20 w-16";

  return (
    <div
      className={`${size} relative flex shrink-0 items-end justify-center overflow-visible ${className}`}
      aria-label={character.name}
    >
      <img
        src={character.previewUrl || "/game/kuis-tempur/characters/heroes/arga.png"}
        alt={character.name}
        draggable={false}
        className={`h-full w-full select-none object-contain object-bottom ${
          hero
            ? "drop-shadow-[0_28px_30px_rgba(0,0,0,.48)]"
            : "drop-shadow-[0_8px_10px_rgba(0,0,0,.45)]"
        }`}
      />
    </div>
  );
}
