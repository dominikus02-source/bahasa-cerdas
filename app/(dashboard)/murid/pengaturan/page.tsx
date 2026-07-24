import { redirect } from "next/navigation";

// Pengaturan is now merged into the Profil page (gear icon opens the settings
// modal) — this route stays only so old links/bookmarks don't 404.
export default function MuridPengaturanRedirect() {
  redirect("/murid/profile");
}
