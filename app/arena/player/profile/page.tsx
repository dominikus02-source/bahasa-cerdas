import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isApk } from "@/lib/apk";

export const dynamic = "force-dynamic";

// Route ini adalah ringkasan profil pemain yang duplikat dengan canonical
// /murid/profile (identity center) dan hub /arena/player. Tidak ada satu pun
// tautan internal yang mengarah ke sini (hanya deep-link).
//   - Web  : arahkan ke canonical /murid/profile
//   - APK  : tetap in-scope /arena (ke hub /arena/player) agar tidak
//            melempar murid ke tab browser (konstrain lib/arena-scope.ts)
export default async function PlayerProfilePage() {
  const user = await getUser();
  if (!user) redirect("/arena/login");

  if (await isApk()) {
    redirect("/arena/player");
  }
  redirect("/murid/profile");
}
