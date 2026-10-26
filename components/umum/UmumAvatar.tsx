/**
 * Avatar akun UMUM: foto profil bila ada, selain itu inisial. Dekoratif
 * (label ada di tombol/tautan pembungkus). Aman untuk server & client.
 */
export interface UmumAvatarUser {
  fullName: string;
  nickname?: string | null;
  avatar?: string | null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "BC";
}

export function UmumAvatar({ user, size = 36 }: { user: UmumAvatarUser; size?: number }) {
  const name = user.nickname || user.fullName;
  if (user.avatar && /^https?:\/\//.test(user.avatar)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar eksternal (Google/Supabase), ukuran kecil
      <img src={user.avatar} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} referrerPolicy="no-referrer" />
    );
  }
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-bc-aud-soft text-xs font-bold text-bc-aud" style={{ width: size, height: size }}>
      {initials(name)}
    </span>
  );
}
