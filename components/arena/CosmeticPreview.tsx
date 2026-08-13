import UserAvatar from "@/components/arena/UserAvatar";
import { CosmeticBadge } from "@/components/arena/UserName";
import { AVATAR_FRAMES, COSMETIC_BADGES, NAME_COLORS } from "@/lib/cosmetics";

/**
 * Pratinjau kosmetik di kartu Toko Koin — supaya murid tahu apa yang dibeli.
 * Kalau item bukan kosmetik yang punya tampilan, `children` (ikon bawaan
 * kartu) yang dipakai.
 */
export default function CosmeticPreview({
  type,
  icon,
  children,
}: {
  type: string;
  icon?: string | null;
  children: React.ReactNode;
}) {
  if (type === "AVATAR_FRAME" && icon && AVATAR_FRAMES[icon]) {
    return (
      <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 flex items-center justify-center shrink-0">
        <UserAvatar size={32} frame={icon} initials="BC" textClassName="text-[10px]" />
      </div>
    );
  }

  if (type === "NAME_COLOR" && icon && NAME_COLORS[icon]) {
    return (
      <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 flex items-center justify-center shrink-0">
        <span className="text-lg font-extrabold" style={NAME_COLORS[icon].light}>
          Nama
        </span>
      </div>
    );
  }

  if (type === "BADGE" && icon && COSMETIC_BADGES[icon]) {
    return (
      <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 flex items-center justify-center shrink-0">
        <CosmeticBadge badge={icon} size={30} />
      </div>
    );
  }

  return <>{children}</>;
}
